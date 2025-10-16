import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from datetime import datetime, timedelta
from ..models.paper import Paper, SearchLog
from .llm_service import llm_service
from ..database import redis_client
import json

class SearchService:
    def __init__(self):
        self.llm = llm_service
    
    async def search(self, query: str, user_id: str, db: Session) -> Dict[str, Any]:
        """Main search function combining all sources"""
        start_time = datetime.now()
        
        # Step 1: Extract keywords using LLM
        keywords_data = self.llm.extract_keywords(query)
        
        # Step 2: Multi-source search
        search_tasks = [
            self._search_local_db(keywords_data, db),
            self._search_cnki(keywords_data),
            self._search_scholar(keywords_data)
        ]
        
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Merge and deduplicate results
        all_papers = []
        for result in results:
            if isinstance(result, list):
                all_papers.extend(result)
        
        # Remove duplicates by DOI and title
        unique_papers = self._deduplicate_papers(all_papers)
        
        # Step 3: LLM filtering and ranking
        filtered_papers = self.llm.filter_papers(query, unique_papers, top_k=20)
        
        # Step 4: Log search
        response_time = (datetime.now() - start_time).total_seconds()
        self._log_search(db, user_id, query, keywords_data, filtered_papers, response_time)
        
        return {
            "query": query,
            "keywords": keywords_data,
            "total_found": len(unique_papers),
            "returned": len(filtered_papers),
            "papers": filtered_papers,
            "response_time": response_time
        }
    
    async def _search_local_db(self, keywords: Dict, db: Session, limit: int = 50) -> List[Dict]:
        """Search in local database with vector similarity"""
        try:
            # Combine keywords for embedding
            query_text = " ".join(
                keywords.get('core_keywords_zh', []) + 
                keywords.get('core_keywords_en', []) +
                keywords.get('extended_keywords', [])
            )
            
            # Generate query embedding
            query_embedding = self.llm.generate_embedding(query_text)
            
            # Time range filter
            time_filter = self._get_time_filter(keywords.get('time_range', 'recent_5_years'))
            
            # Vector similarity search with filters
            papers = db.query(Paper).filter(
                Paper.publish_date >= time_filter
            ).order_by(
                Paper.embedding.l2_distance(query_embedding)
            ).limit(limit).all()
            
            return [self._paper_to_dict(p) for p in papers]
        
        except Exception as e:
            print(f"Local DB search error: {e}")
            return []
    
    async def _search_cnki(self, keywords: Dict) -> List[Dict]:
        """Search CNKI (China National Knowledge Infrastructure)"""
        # Check cache
        cache_key = f"cnki:{json.dumps(keywords, sort_keys=True)}"
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Placeholder: Implement actual CNKI API call
            # For now, return empty list
            # In production, use CNKI API or web scraping
            results = []
            
            # Cache results for 1 hour
            redis_client.setex(cache_key, 3600, json.dumps(results))
            return results
        
        except Exception as e:
            print(f"CNKI search error: {e}")
            return []
    
    async def _search_scholar(self, keywords: Dict) -> List[Dict]:
        """Search Google Scholar via SerpAPI"""
        cache_key = f"scholar:{json.dumps(keywords, sort_keys=True)}"
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Placeholder: Implement SerpAPI call
            # from serpapi import GoogleSearch
            # params = {
            #     "q": " ".join(keywords.get('core_keywords_en', [])),
            #     "api_key": settings.SCHOLAR_API_KEY
            # }
            # search = GoogleSearch(params)
            # results = search.get_dict()
            
            results = []
            redis_client.setex(cache_key, 3600, json.dumps(results))
            return results
        
        except Exception as e:
            print(f"Scholar search error: {e}")
            return []
    
    def _deduplicate_papers(self, papers: List[Dict]) -> List[Dict]:
        """Remove duplicate papers by DOI and title"""
        seen_dois = set()
        seen_titles = set()
        unique_papers = []
        
        for paper in papers:
            doi = paper.get('doi', '').lower().strip()
            title = paper.get('title', '').lower().strip()
            
            if doi and doi in seen_dois:
                continue
            if title and title in seen_titles:
                continue
            
            if doi:
                seen_dois.add(doi)
            if title:
                seen_titles.add(title)
            
            unique_papers.append(paper)
        
        return unique_papers
    
    def _get_time_filter(self, time_range: str) -> datetime:
        """Convert time range string to datetime filter"""
        now = datetime.now()
        
        if time_range == "recent_1_year":
            return now - timedelta(days=365)
        elif time_range == "recent_3_years":
            return now - timedelta(days=365*3)
        elif time_range == "recent_5_years":
            return now - timedelta(days=365*5)
        else:  # all_time
            return datetime(1900, 1, 1)
    
    def _paper_to_dict(self, paper: Paper) -> Dict:
        """Convert SQLAlchemy Paper object to dictionary"""
        return {
            "id": paper.id,
            "title": paper.title,
            "abstract": paper.abstract,
            "authors": paper.authors,
            "keywords": paper.keywords,
            "journal": paper.journal,
            "publish_date": paper.publish_date.isoformat() if paper.publish_date else None,
            "doi": paper.doi,
            "source": paper.source,
            "source_url": paper.source_url,
            "citation_count": paper.citation_count,
            "pdf_path": paper.pdf_path
        }
    
    def _log_search(self, db: Session, user_id: str, query: str, 
                    keywords: Dict, results: List[Dict], response_time: float):
        """Log search query and results"""
        try:
            search_log = SearchLog(
                user_id=user_id,
                query=query,
                extracted_keywords=keywords,
                result_count=len(results),
                result_paper_ids=[p['id'] for p in results],
                response_time=response_time
            )
            db.add(search_log)
            db.commit()
        except Exception as e:
            print(f"Error logging search: {e}")
            db.rollback()

search_service = SearchService()