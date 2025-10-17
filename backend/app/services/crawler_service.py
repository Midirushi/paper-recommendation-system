from typing import List, Dict
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.paper import Paper
from ..crawlers.cnki_crawler import cnki_crawler
from ..crawlers.scholar_crawler import scholar_crawler
from .llm_service import llm_service
import asyncio

class CrawlerService:
    """Service to orchestrate multiple crawlers"""

    def __init__(self):
        self.cnki = cnki_crawler
        self.scholar = scholar_crawler
        self.llm = llm_service

    async def crawl_all_sources(
        self,
        keywords: List[str],
        db: Session,
        days: int = 1
    ) -> Dict[str, int]:
        """Crawl papers from all available sources"""
        results = {
            "cnki": 0,
            "scholar": 0,
            "total_new": 0,
            "total_updated": 0
        }

        # Crawl from both sources in parallel
        tasks = [
            self._crawl_cnki(keywords, days),
            self._crawl_scholar(keywords, days)
        ]

        crawl_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process CNKI results
        if not isinstance(crawl_results[0], Exception):
            cnki_papers = crawl_results[0]
            results["cnki"] = len(cnki_papers)
            new, updated = self._store_papers(cnki_papers, db)
            results["total_new"] += new
            results["total_updated"] += updated

        # Process Scholar results
        if not isinstance(crawl_results[1], Exception):
            scholar_papers = crawl_results[1]
            results["scholar"] = len(scholar_papers)
            new, updated = self._store_papers(scholar_papers, db)
            results["total_new"] += new
            results["total_updated"] += updated

        return results

    async def _crawl_cnki(self, keywords: List[str], days: int) -> List[Dict]:
        """Crawl CNKI asynchronously"""
        try:
            loop = asyncio.get_event_loop()
            papers = await loop.run_in_executor(
                None,
                self.cnki.search_papers,
                keywords,
                100  # limit
            )
            return papers
        except Exception as e:
            print(f"CNKI crawl error: {e}")
            return []

    async def _crawl_scholar(self, keywords: List[str], days: int) -> List[Dict]:
        """Crawl Google Scholar asynchronously"""
        try:
            loop = asyncio.get_event_loop()
            papers = await loop.run_in_executor(
                None,
                self.scholar.search_papers,
                keywords,
                100  # limit
            )
            return papers
        except Exception as e:
            print(f"Scholar crawl error: {e}")
            return []

    def _store_papers(self, papers: List[Dict], db: Session) -> tuple:
        """Store papers in database with deduplication"""
        new_count = 0
        updated_count = 0

        for paper_data in papers:
            try:
                # Check if paper exists by ID or DOI
                existing = None

                if paper_data.get("id"):
                    existing = db.query(Paper).filter(
                        Paper.id == paper_data["id"]
                    ).first()

                if not existing and paper_data.get("doi"):
                    existing = db.query(Paper).filter(
                        Paper.doi == paper_data["doi"]
                    ).first()

                # Check for duplicate by title similarity
                if not existing and paper_data.get("title"):
                    similar = db.query(Paper).filter(
                        Paper.title == paper_data["title"]
                    ).first()
                    if similar:
                        existing = similar

                if existing:
                    # Update existing paper
                    for key, value in paper_data.items():
                        if key != "id" and value:  # Don't update ID
                            setattr(existing, key, value)
                    updated_count += 1
                else:
                    # Generate embedding for new paper
                    if paper_data.get("title") and paper_data.get("abstract"):
                        text_for_embedding = f"{paper_data['title']} {paper_data['abstract']}"
                    elif paper_data.get("title"):
                        text_for_embedding = paper_data["title"]
                    else:
                        continue  # Skip if no title

                    embedding = self.llm.generate_embedding(text_for_embedding)
                    paper_data["embedding"] = embedding

                    # Create new paper
                    new_paper = Paper(**paper_data)
                    db.add(new_paper)
                    new_count += 1

                # Commit in batches to avoid large transactions
                if (new_count + updated_count) % 50 == 0:
                    db.commit()

            except Exception as e:
                print(f"Error storing paper: {e}")
                db.rollback()
                continue

        # Final commit
        db.commit()

        return new_count, updated_count

    def crawl_by_keywords(
        self,
        keywords: List[str],
        source: str,
        db: Session,
        limit: int = 50
    ) -> Dict:
        """Crawl papers from specific source by keywords"""
        papers = []

        if source == "cnki":
            papers = self.cnki.search_papers(keywords, limit=limit)
        elif source == "scholar":
            papers = self.scholar.search_papers(keywords, limit=limit)
        else:
            raise ValueError(f"Unknown source: {source}")

        # Store papers
        new, updated = self._store_papers(papers, db)

        return {
            "source": source,
            "keywords": keywords,
            "total_found": len(papers),
            "new_papers": new,
            "updated_papers": updated
        }

    def update_paper_citations(self, db: Session, limit: int = 100) -> int:
        """Update citation counts for existing papers"""
        updated_count = 0

        # Get papers without recent citation updates
        cutoff_date = datetime.now() - timedelta(days=30)
        papers = db.query(Paper).filter(
            Paper.source == "scholar"
        ).limit(limit).all()

        for paper in papers:
            try:
                # Get updated citation count from Google Scholar
                citation_count = self.scholar.get_paper_citations(paper.title)

                if citation_count != paper.citation_count:
                    paper.citation_count = citation_count
                    paper.updated_at = datetime.now()
                    updated_count += 1

                # Commit in batches
                if updated_count % 10 == 0:
                    db.commit()

            except Exception as e:
                print(f"Error updating citations for {paper.title}: {e}")
                continue

        db.commit()
        return updated_count

    def enrich_paper_details(self, paper_id: str, db: Session) -> bool:
        """Enrich paper with additional details from source"""
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper:
            return False

        try:
            if paper.source == "cnki" and paper.source_url:
                # Fetch detailed information from CNKI
                details = self.cnki.fetch_paper_details(paper.source_url)

                if details:
                    if details.get("abstract"):
                        paper.abstract = details["abstract"]
                    if details.get("keywords"):
                        paper.keywords = details["keywords"]
                    if details.get("doi"):
                        paper.doi = details["doi"]

                    # Regenerate embedding with new content
                    text_for_embedding = f"{paper.title} {paper.abstract}"
                    paper.embedding = self.llm.generate_embedding(text_for_embedding)

                    db.commit()
                    return True

            return False

        except Exception as e:
            print(f"Error enriching paper details: {e}")
            db.rollback()
            return False

    def get_crawl_statistics(self, db: Session, days: int = 7) -> Dict:
        """Get crawler statistics for the last N days"""
        cutoff_date = datetime.now() - timedelta(days=days)

        # Count papers by source
        cnki_count = db.query(Paper).filter(
            Paper.source == "cnki",
            Paper.created_at >= cutoff_date
        ).count()

        scholar_count = db.query(Paper).filter(
            Paper.source == "scholar",
            Paper.created_at >= cutoff_date
        ).count()

        total_count = db.query(Paper).filter(
            Paper.created_at >= cutoff_date
        ).count()

        return {
            "period_days": days,
            "total_papers": total_count,
            "by_source": {
                "cnki": cnki_count,
                "scholar": scholar_count
            },
            "avg_per_day": total_count / days if days > 0 else 0
        }

crawler_service = CrawlerService()
