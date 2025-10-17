from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db_dependency
from ..services.recommendation import recommendation_service

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])

class RecommendationResponse(BaseModel):
    id: str
    title: str
    abstract: Optional[str]
    authors: List[dict]
    keywords: List[str]
    journal: Optional[str]
    publish_date: Optional[str]
    citation_count: int
    source: str
    source_url: Optional[str]
    relevance_score: float
    recommendation_reason: str

@router.get("/personalized", response_model=List[RecommendationResponse])
async def get_personalized_recommendations(
    user_id: str = Query(..., description="User ID for personalized recommendations"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db_dependency)
):
    """
    Get personalized paper recommendations for a user

    Based on:
    - User's research keywords
    - Search history
    - Reading history
    - Favorite authors and journals
    """
    try:
        recommendations = recommendation_service.generate_personalized_recommendations(
            user_id=user_id,
            db=db,
            limit=limit
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")

@router.get("/similar/{paper_id}", response_model=List[RecommendationResponse])
async def get_similar_papers(
    paper_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db_dependency)
):
    """Get papers similar to a specific paper using vector similarity"""
    try:
        similar_papers = recommendation_service.get_similar_papers(
            paper_id=paper_id,
            db=db,
            limit=limit
        )
        return similar_papers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar papers error: {str(e)}")

@router.get("/trending", response_model=List[RecommendationResponse])
async def get_trending_recommendations(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db_dependency)
):
    """Get trending papers for users without profile"""
    try:
        trending = recommendation_service.get_trending_papers(db=db, limit=limit)
        return trending
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trending papers error: {str(e)}")

@router.post("/interaction")
async def record_interaction(
    user_id: str = Query(...),
    paper_id: str = Query(...),
    action: str = Query(..., description="Action type: view, save, download"),
    db: Session = Depends(get_db_dependency)
):
    """
    Record user interaction with a paper

    This helps improve future recommendations by tracking:
    - Papers viewed
    - Papers saved/bookmarked
    - Papers downloaded
    """
    try:
        recommendation_service.update_user_profile(
            user_id=user_id,
            action=action,
            paper_id=paper_id,
            db=db
        )
        return {"status": "success", "message": "Interaction recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interaction error: {str(e)}")

@router.post("/generate/{user_id}")
async def trigger_recommendation_generation(
    user_id: str,
    db: Session = Depends(get_db_dependency)
):
    """Trigger background task to generate recommendations for a user"""
    try:
        from tasks.crawler_tasks import generate_user_recommendations

        # Trigger Celery task
        task = generate_user_recommendations.delay(user_id)

        return {
            "status": "scheduled",
            "task_id": task.id,
            "user_id": user_id,
            "message": "Recommendation generation scheduled"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task scheduling error: {str(e)}")
