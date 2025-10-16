from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db_dependency
from ..services.search_service import search_service
from ..models.paper import Paper, SearchLog

router = APIRouter(prefix="/api/v1/search", tags=["search"])

# Request/Response models
class SearchRequest(BaseModel):
    query: str
    user_id: Optional[str] = "anonymous"
    limit: int = 20

class PaperResponse(BaseModel):
    id: str
    title: str
    abstract: Optional[str]
    authors: List[dict]
    keywords: List[str]
    journal: Optional[str]
    publish_date: Optional[str]
    doi: Optional[str]
    source: str
    source_url: Optional[str]
    citation_count: int
    relevance_score: Optional[float] = None
    recommendation_reason: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    keywords: dict
    total_found: int
    returned: int
    papers: List[PaperResponse]
    response_time: float

@router.post("/", response_model=SearchResponse)
async def search_papers(request: SearchRequest, db: Session = Depends(get_db_dependency)):
    """
    Search papers based on user query
    
    The system will:
    1. Extract keywords using LLM
    2. Search multiple sources (local DB, CNKI, Scholar)
    3. Filter and rank results using LLM
    4. Return top relevant papers
    """
    try:
        result = await search_service.search(
            query=request.query,
            user_id=request.user_id,
            db=db
        )
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@router.get("/paper/{paper_id}", response_model=PaperResponse)
async def get_paper_details(paper_id: str, db: Session = Depends(get_db_dependency)):
    """Get detailed information about a specific paper"""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    return PaperResponse(
        id=paper.id,
        title=paper.title,
        abstract=paper.abstract,
        authors=paper.authors or [],
        keywords=paper.keywords or [],
        journal=paper.journal,
        publish_date=paper.publish_date.isoformat() if paper.publish_date else None,
        doi=paper.doi,
        source=paper.source,
        source_url=paper.source_url,
        citation_count=paper.citation_count or 0
    )

@router.get("/history")
async def get_search_history(
    user_id: str = Query(...),
    limit: int = 20,
    db: Session = Depends(get_db_dependency)
):
    """Get user's search history"""
    logs = db.query(SearchLog).filter(
        SearchLog.user_id == user_id
    ).order_by(
        SearchLog.created_at.desc()
    ).limit(limit).all()
    
    return [{
        "id": log.id,
        "query": log.query,
        "keywords": log.extracted_keywords,
        "result_count": log.result_count,
        "timestamp": log.created_at.isoformat()
    } for log in logs]

@router.get("/popular")
async def get_popular_papers(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db_dependency)
):
    """Get popular papers based on search frequency"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get most searched papers
    from sqlalchemy import func
    popular = db.query(
        Paper.id,
        Paper.title,
        Paper.citation_count,
        func.count(SearchLog.id).label('search_count')
    ).join(
        SearchLog,
        Paper.id == func.any(SearchLog.result_paper_ids)
    ).filter(
        SearchLog.created_at >= cutoff_date
    ).group_by(
        Paper.id
    ).order_by(
        func.count(SearchLog.id).desc()
    ).limit(limit).all()
    
    return [{
        "paper_id": p.id,
        "title": p.title,
        "citation_count": p.citation_count,
        "search_count": p.search_count
    } for p in popular]

from datetime import timedelta