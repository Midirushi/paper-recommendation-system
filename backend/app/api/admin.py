from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..database import get_db_dependency
from ..utils.vector_store import vector_store
from ..services.crawler_service import crawler_service

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

class CrawlRequest(BaseModel):
    keywords: List[str]
    source: str
    limit: int = 50

class VectorStatsResponse(BaseModel):
    total_papers: int
    papers_with_embeddings: int
    coverage_percentage: float
    embedding_dimension: int

class CrawlStatsResponse(BaseModel):
    period_days: int
    total_papers: int
    by_source: dict
    avg_per_day: float

@router.post("/crawl/manual")
async def trigger_manual_crawl(
    request: CrawlRequest,
    db: Session = Depends(get_db_dependency)
):
    """Manually trigger a crawl from a specific source"""
    try:
        result = crawler_service.crawl_by_keywords(
            keywords=request.keywords,
            source=request.source,
            db=db,
            limit=request.limit
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crawl error: {str(e)}")

@router.post("/embeddings/rebuild")
async def rebuild_embeddings(
    batch_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db_dependency)
):
    """
    Rebuild embeddings for papers without them

    WARNING: This can be expensive if you have many papers
    """
    try:
        result = vector_store.rebuild_all_embeddings(db, batch_size)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rebuild error: {str(e)}")

@router.get("/embeddings/stats", response_model=VectorStatsResponse)
async def get_embedding_stats(db: Session = Depends(get_db_dependency)):
    """Get statistics about vector embeddings"""
    try:
        stats = vector_store.get_vector_statistics(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@router.get("/crawl/stats", response_model=CrawlStatsResponse)
async def get_crawl_stats(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db_dependency)
):
    """Get crawler statistics for the last N days"""
    try:
        stats = crawler_service.get_crawl_statistics(db, days)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@router.post("/citations/update")
async def update_citations(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_dependency)
):
    """Update citation counts for existing papers"""
    try:
        updated = crawler_service.update_paper_citations(db, limit)
        return {
            "status": "success",
            "updated_count": updated,
            "message": f"Updated citation counts for {updated} papers"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")

@router.post("/paper/{paper_id}/enrich")
async def enrich_paper(
    paper_id: str,
    db: Session = Depends(get_db_dependency)
):
    """Enrich a paper with additional details from its source"""
    try:
        success = crawler_service.enrich_paper_details(paper_id, db)
        if success:
            return {
                "status": "success",
                "paper_id": paper_id,
                "message": "Paper enriched successfully"
            }
        else:
            return {
                "status": "no_update",
                "paper_id": paper_id,
                "message": "No additional details available"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrich error: {str(e)}")

@router.post("/tasks/trigger/{task_name}")
async def trigger_celery_task(task_name: str):
    """Manually trigger a Celery task"""
    try:
        from tasks import crawler_tasks

        if task_name == "daily_crawl":
            task = crawler_tasks.crawl_cnki_daily.delay()
        elif task_name == "all_sources":
            task = crawler_tasks.crawl_all_sources.delay()
        elif task_name == "trends":
            task = crawler_tasks.analyze_weekly_trends.delay()
        else:
            raise HTTPException(status_code=400, detail=f"Unknown task: {task_name}")

        return {
            "status": "scheduled",
            "task_id": task.id,
            "task_name": task_name,
            "message": f"Task {task_name} scheduled successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task error: {str(e)}")

@router.get("/tasks/status/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a Celery task"""
    try:
        from celery.result import AsyncResult
        from tasks.crawler_tasks import celery_app

        result = AsyncResult(task_id, app=celery_app)

        return {
            "task_id": task_id,
            "status": result.state,
            "result": result.result if result.ready() else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")
