from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from ..models.paper import Paper, UserProfile, SearchLog
from .llm_service import llm_service
from ..database import redis_client
import json

class RecommendationService:
    """Service for personalized paper recommendations"""

    def __init__(self):
        self.llm = llm_service

    def generate_personalized_recommendations(
        self,
        user_id: str,
        db: Session,
        limit: int = 10
    ) -> List[Dict]:
        """Generate personalized recommendations for a user"""
        # Get user profile
        user_profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        if not user_profile:
            # Return trending papers if no profile exists
            return self.get_trending_papers(db, limit)

        # Build user interest profile
        user_interests = self._build_user_interests(user_profile, db)

        # Get candidate papers (recent papers not seen by user)
        candidate_papers = self._get_candidate_papers(user_id, db, limit * 5)

        # Score and rank papers
        recommendations = self._score_and_rank_papers(
            user_interests,
            candidate_papers,
            limit
        )

        return recommendations

    def _build_user_interests(self, user_profile: UserProfile, db: Session) -> Dict:
        """Build user interest profile from history"""
        interests = {
            "keywords": user_profile.research_keywords or [],
            "authors": user_profile.favorite_authors or [],
            "journals": user_profile.favorite_journals or [],
            "recent_queries": []
        }

        # Get recent search queries
        recent_searches = db.query(SearchLog).filter(
            SearchLog.user_id == user_profile.user_id
        ).order_by(
            desc(SearchLog.created_at)
        ).limit(10).all()

        for search in recent_searches:
            if search.query:
                interests["recent_queries"].append(search.query)

        # Extract keywords from reading history
        if user_profile.reading_history:
            paper_ids = [h.get("paper_id") for h in user_profile.reading_history if h.get("paper_id")]
            if paper_ids:
                papers = db.query(Paper).filter(Paper.id.in_(paper_ids[:20])).all()
                for paper in papers:
                    if paper.keywords:
                        interests["keywords"].extend(paper.keywords)

        # Deduplicate and get top keywords
        interests["keywords"] = list(set(interests["keywords"]))[:20]

        return interests

    def _get_candidate_papers(
        self,
        user_id: str,
        db: Session,
        limit: int = 50
    ) -> List[Paper]:
        """Get candidate papers for recommendation"""
        # Get papers from last 30 days
        cutoff_date = datetime.now() - timedelta(days=30)

        # Get papers user has already seen
        seen_paper_ids = set()
        user_profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        if user_profile and user_profile.reading_history:
            seen_paper_ids = {h.get("paper_id") for h in user_profile.reading_history}

        # Query recent papers not seen by user
        candidates = db.query(Paper).filter(
            and_(
                Paper.publish_date >= cutoff_date,
                ~Paper.id.in_(seen_paper_ids) if seen_paper_ids else True
            )
        ).order_by(
            desc(Paper.citation_count)
        ).limit(limit).all()

        return candidates

    def _score_and_rank_papers(
        self,
        user_interests: Dict,
        candidate_papers: List[Paper],
        limit: int
    ) -> List[Dict]:
        """Score and rank papers based on user interests"""
        scored_papers = []

        for paper in candidate_papers:
            score = self._calculate_relevance_score(paper, user_interests)
            if score > 0:
                scored_papers.append({
                    "paper": paper,
                    "score": score
                })

        # Sort by score
        scored_papers.sort(key=lambda x: x["score"], reverse=True)

        # Convert to response format
        recommendations = []
        for item in scored_papers[:limit]:
            paper = item["paper"]
            recommendations.append({
                "id": paper.id,
                "title": paper.title,
                "abstract": paper.abstract,
                "authors": paper.authors,
                "keywords": paper.keywords,
                "journal": paper.journal,
                "publish_date": paper.publish_date.isoformat() if paper.publish_date else None,
                "citation_count": paper.citation_count,
                "source": paper.source,
                "source_url": paper.source_url,
                "relevance_score": round(item["score"], 2),
                "recommendation_reason": self._generate_recommendation_reason(
                    paper,
                    user_interests,
                    item["score"]
                )
            })

        return recommendations

    def _calculate_relevance_score(self, paper: Paper, user_interests: Dict) -> float:
        """Calculate relevance score for a paper"""
        score = 0.0

        # Keyword matching (40% weight)
        if paper.keywords and user_interests["keywords"]:
            paper_keywords = set(k.lower() for k in paper.keywords)
            user_keywords = set(k.lower() for k in user_interests["keywords"])
            keyword_overlap = len(paper_keywords & user_keywords)
            keyword_score = min(keyword_overlap / len(user_keywords), 1.0) * 4.0
            score += keyword_score

        # Author matching (20% weight)
        if paper.authors and user_interests["authors"]:
            paper_authors = set(a.get("name", "").lower() for a in paper.authors)
            user_authors = set(a.lower() for a in user_interests["authors"])
            if paper_authors & user_authors:
                score += 2.0

        # Journal matching (15% weight)
        if paper.journal and user_interests["journals"]:
            if paper.journal.lower() in [j.lower() for j in user_interests["journals"]]:
                score += 1.5

        # Citation count (15% weight)
        citation_score = min(paper.citation_count / 100, 1.0) * 1.5
        score += citation_score

        # Recency (10% weight)
        if paper.publish_date:
            days_old = (datetime.now().date() - paper.publish_date).days
            recency_score = max(1.0 - (days_old / 365), 0) * 1.0
            score += recency_score

        return min(score, 10.0)

    def _generate_recommendation_reason(
        self,
        paper: Paper,
        user_interests: Dict,
        score: float
    ) -> str:
        """Generate explanation for why paper is recommended"""
        reasons = []

        # Check keyword matches
        if paper.keywords and user_interests["keywords"]:
            paper_keywords = set(k.lower() for k in paper.keywords)
            user_keywords = set(k.lower() for k in user_interests["keywords"])
            matches = paper_keywords & user_keywords
            if matches:
                reasons.append(f"9M¨sè„s.Í: {', '.join(list(matches)[:3])}")

        # Check author matches
        if paper.authors and user_interests["authors"]:
            paper_authors = {a.get("name", "") for a in paper.authors}
            user_authors = set(user_interests["authors"])
            matches = paper_authors & user_authors
            if matches:
                reasons.append(f"¨sè„\: {', '.join(list(matches)[:2])}")

        # Check journal match
        if paper.journal and user_interests["journals"]:
            if paper.journal in user_interests["journals"]:
                reasons.append(f"Ñh¨sè„
: {paper.journal}")

        # High citation count
        if paper.citation_count and paper.citation_count > 50:
            reasons.append(f"Ø«º‡({paper.citation_count}!)")

        # Recent publication
        if paper.publish_date:
            days_old = (datetime.now().date() - paper.publish_date).days
            if days_old < 30:
                reasons.append(" °Ñh")

        if not reasons:
            reasons.append(f"øs¦Ä: {score:.1f}/10")

        return " | ".join(reasons[:3])

    def get_trending_papers(self, db: Session, limit: int = 10) -> List[Dict]:
        """Get trending papers based on search frequency and citations"""
        # Get papers from last 7 days
        week_ago = datetime.now() - timedelta(days=7)

        trending = db.query(Paper).filter(
            Paper.publish_date >= week_ago
        ).order_by(
            desc(Paper.citation_count)
        ).limit(limit).all()

        return [{
            "id": p.id,
            "title": p.title,
            "abstract": p.abstract,
            "authors": p.authors,
            "keywords": p.keywords,
            "journal": p.journal,
            "publish_date": p.publish_date.isoformat() if p.publish_date else None,
            "citation_count": p.citation_count,
            "source": p.source,
            "source_url": p.source_url,
            "recommendation_reason": f",híèº‡((p: {p.citation_count})"
        } for p in trending]

    def update_user_profile(
        self,
        user_id: str,
        action: str,
        paper_id: str,
        db: Session
    ):
        """Update user profile based on interaction"""
        user_profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        if not user_profile:
            user_profile = UserProfile(
                user_id=user_id,
                reading_history=[],
                search_history=[]
            )
            db.add(user_profile)

        # Update reading history
        if not user_profile.reading_history:
            user_profile.reading_history = []

        user_profile.reading_history.append({
            "paper_id": paper_id,
            "action": action,  # "view", "save", "download"
            "timestamp": datetime.now().isoformat()
        })

        # Extract keywords from paper to update research interests
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if paper and paper.keywords:
            if not user_profile.research_keywords:
                user_profile.research_keywords = []

            # Add new keywords
            for keyword in paper.keywords:
                if keyword not in user_profile.research_keywords:
                    user_profile.research_keywords.append(keyword)

            # Keep only top 50 keywords
            user_profile.research_keywords = user_profile.research_keywords[-50:]

        db.commit()

    def get_similar_papers(
        self,
        paper_id: str,
        db: Session,
        limit: int = 10
    ) -> List[Dict]:
        """Find papers similar to a given paper"""
        # Get the source paper
        source_paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not source_paper or not source_paper.embedding:
            return []

        # Vector similarity search
        similar_papers = db.query(Paper).filter(
            Paper.id != paper_id
        ).order_by(
            Paper.embedding.l2_distance(source_paper.embedding)
        ).limit(limit).all()

        return [{
            "id": p.id,
            "title": p.title,
            "abstract": p.abstract,
            "authors": p.authors,
            "keywords": p.keywords,
            "journal": p.journal,
            "publish_date": p.publish_date.isoformat() if p.publish_date else None,
            "citation_count": p.citation_count,
            "source": p.source,
            "source_url": p.source_url,
            "recommendation_reason": "úíIø<¦¨P"
        } for p in similar_papers]

recommendation_service = RecommendationService()
