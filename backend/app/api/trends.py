from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
from ..database import get_db_dependency
from ..models.paper import ResearchTrend, Paper

router = APIRouter(prefix="/api/v1/trends", tags=["trends"])

class TrendTopicResponse(BaseModel):
    name: str
    description: str
    paper_count: int
    hot_papers: List[str]

class TrendResponse(BaseModel):
    id: int
    topic: str
    summary: str
    topics: List[dict]
    keywords: List[str]
    analysis_date: str
    paper_count: int
    avg_citation: float

@router.get("/latest", response_model=TrendResponse)
async def get_latest_trends(db: Session = Depends(get_db_dependency)):
    """Get the most recent research trend analysis"""
    latest_trend = db.query(ResearchTrend).order_by(
        ResearchTrend.analysis_date.desc()
    ).first()
    
    if not latest_trend:
        raise HTTPException(status_code=404, detail="No trend analysis available")
    
    return TrendResponse(
        id=latest_trend.id,
        topic=latest_trend.topic,
        summary=latest_trend.trend_summary,
        topics=latest_trend.hot_papers or [],
        keywords=latest_trend.keywords or [],
        analysis_date=latest_trend.analysis_date.isoformat() if latest_trend.analysis_date else "",
        paper_count=latest_trend.paper_count,
        avg_citation=latest_trend.avg_citation or 0.0
    )

@router.get("/history")
async def get_trend_history(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db_dependency)
):
    """Get historical trend analyses"""
    trends = db.query(ResearchTrend).order_by(
        ResearchTrend.analysis_date.desc()
    ).limit(limit).all()
    
    # Return a list of past trend analyses (summary information)
    return [{
        "id": t.id,
        "topic": t.topic,
        "summary": (t.trend_summary[:200] + "...") if (t.trend_summary and len(t.trend_summary) > 200) else (t.trend_summary or ""),
        "analysis_date": t.analysis_date.isoformat() if t.analysis_date else None,
        "paper_count": t.paper_count,
        "avg_citation": t.avg_citation or 0.0
    } for t in trends]

@router.get("/keywords")
async def get_trending_keywords(
    days: int = Query(30, ge=7, le=90),
    limit: int = Query(20, ge=5, le=50),
    db: Session = Depends(get_db_dependency)
):
    """Get trending keywords from recent papers"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    papers = db.query(Paper).filter(
        Paper.publish_date >= cutoff_date
    ).all()
    
    # Count keyword frequency
    keyword_counts: Dict[str, int] = {}
    for paper in papers:
        if paper.keywords:
            for keyword in paper.keywords:
                keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    
    # Sort by frequency
    trending = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return [{
        "keyword": kw,
        "count": count
    } for kw, count in trending]

@router.get("/hot-papers")
async def get_hot_papers(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db_dependency)
):
    """Get hot papers from recent period"""
    cutoff_date = datetime.now() - timedelta(days=days)
    
    hot_papers = db.query(Paper).filter(
        Paper.publish_date >= cutoff_date
    ).order_by(
        Paper.citation_count.desc()
    ).limit(limit).all()
    
    # Return simplified paper info for hot papers
    return [{
        "id": p.id,
        "title": p.title,
        "authors": p.authors,
        "journal": p.journal,
        "publish_date": p.publish_date.isoformat() if p.publish_date else None,
        "citation_count": p.citation_count,
        "abstract": p.abstract,
        "keywords": p.keywords
    } for p in hot_papers]