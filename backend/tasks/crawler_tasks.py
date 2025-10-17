from celery import Celery
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SessionLocal
from app.models.paper import Paper, ResearchTrend
from app.crawlers.cnki_crawler import cnki_crawler
from app.services.llm_service import llm_service

# Initialize Celery
celery_app = Celery(
    'paper_crawler',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Shanghai',
    enable_utc=True,
)

# Scheduled tasks
celery_app.conf.beat_schedule = {
    'daily-crawl-cnki': {
        'task': 'tasks.crawler_tasks.crawl_cnki_daily',
        'schedule': 86400.0,  # Every 24 hours
    },
    'weekly-trend-analysis': {
        'task': 'tasks.crawler_tasks.analyze_weekly_trends',
        'schedule': 604800.0,  # Every 7 days
    },
}

@celery_app.task(name='tasks.crawler_tasks.crawl_cnki_daily')
def crawl_cnki_daily():
    """Daily task to crawl latest papers from CNKI"""
    db = SessionLocal()
    try:
        print(f"Starting daily CNKI crawl at {datetime.now()}")
        
        # Fetch papers from last 2 days (to avoid missing papers)
        papers = cnki_crawler.fetch_latest_papers(days=2)
        
        new_count = 0
        updated_count = 0
        
        for paper_data in papers:
            # Check if paper already exists
            existing = db.query(Paper).filter(Paper.id == paper_data['id']).first()
            
            if existing:
                # Update existing paper
                for key, value in paper_data.items():
                    setattr(existing, key, value)
                updated_count += 1
            else:
                # Generate embedding for new paper
                text_for_embedding = f"{paper_data['title']} {paper_data.get('abstract', '')}"
                embedding = llm_service.generate_embedding(text_for_embedding)
                paper_data['embedding'] = embedding
                
                # Create new paper
                new_paper = Paper(**paper_data)
                db.add(new_paper)
                new_count += 1
        
        db.commit()
        
        result = {
            "status": "success",
            "new_papers": new_count,
            "updated_papers": updated_count,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"Daily crawl completed: {result}")
        return result
    
    except Exception as e:
        db.rollback()
        print(f"Error in daily crawl: {e}")
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()

@celery_app.task(name='tasks.crawler_tasks.crawl_all_sources')
def crawl_all_sources():
    """Crawl papers from all configured sources"""
    db = SessionLocal()
    try:
        from app.services.crawler_service import crawler_service
        import asyncio

        # Use crawler service to crawl all sources
        keywords = ["knowledge graph", "machine learning", "artificial intelligence"]

        # Run async crawl
        loop = asyncio.get_event_loop()
        results = loop.run_until_complete(
            crawler_service.crawl_all_sources(keywords, db, days=1)
        )

        return {
            "status": "success",
            "cnki_papers": results.get("cnki", 0),
            "scholar_papers": results.get("scholar", 0),
            "total_new": results.get("total_new", 0),
            "total_updated": results.get("total_updated", 0)
        }

    except Exception as e:
        db.rollback()
        print(f"Error in crawl_all_sources: {e}")
        return {"status": "error", "message": str(e)}

    finally:
        db.close()

@celery_app.task(name='tasks.crawler_tasks.analyze_weekly_trends')
def analyze_weekly_trends():
    """Weekly task to analyze research trends"""
    db = SessionLocal()
    try:
        print(f"Starting weekly trend analysis at {datetime.now()}")
        
        # Get papers from last 7 days
        week_ago = datetime.now() - timedelta(days=7)
        recent_papers = db.query(Paper).filter(
            Paper.publish_date >= week_ago
        ).all()
        
        if not recent_papers:
            print("No papers found for trend analysis")
            return {"status": "no_data"}
        
        # Convert to dict format for LLM
        papers_data = [
            {
                "title": p.title,
                "abstract": p.abstract,
                "keywords": p.keywords,
                "journal": p.journal,
                "publish_date": p.publish_date.isoformat() if p.publish_date else None,
                "citation_count": p.citation_count
            }
            for p in recent_papers
        ]
        
        # Analyze trends using LLM
        trend_analysis = llm_service.analyze_trends(papers_data, period="week")
        
        # Store trend analysis
        trend_record = ResearchTrend(
            topic="综合研究趋势",
            trend_summary=trend_analysis.get('summary', ''),
            hot_papers=trend_analysis.get('hot_papers', []),
            keywords=trend_analysis.get('keywords', []),
            analysis_date=datetime.now().date(),
            start_date=week_ago.date(),
            end_date=datetime.now().date(),
            paper_count=len(recent_papers),
            avg_citation=sum(p.citation_count or 0 for p in recent_papers) / len(recent_papers)
        )
        
        db.add(trend_record)
        db.commit()
        
        result = {
            "status": "success",
            "analyzed_papers": len(recent_papers),
            "topics_found": len(trend_analysis.get('topics', [])),
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"Trend analysis completed: {result}")
        return result
    
    except Exception as e:
        db.rollback()
        print(f"Error in trend analysis: {e}")
        return {"status": "error", "message": str(e)}
    
    finally:
        db.close()

@celery_app.task(name='tasks.crawler_tasks.generate_user_recommendations')
def generate_user_recommendations(user_id: str):
    """Generate personalized paper recommendations for a user"""
    db = SessionLocal()
    try:
        from app.services.recommendation import recommendation_service

        # Generate personalized recommendations
        recommendations = recommendation_service.generate_personalized_recommendations(
            user_id=user_id,
            db=db,
            limit=10
        )

        if not recommendations:
            return {
                "status": "no_recommendations",
                "user_id": user_id,
                "message": "No recommendations available"
            }

        # TODO: Send email notification with recommendations
        # For now, just log and store the recommendations
        print(f"Generated {len(recommendations)} recommendations for user {user_id}")

        # Store recommendations in cache for quick access
        from app.database import redis_client
        import json
        cache_key = f"user_recommendations:{user_id}"
        redis_client.setex(
            cache_key,
            86400,  # 24 hours
            json.dumps(recommendations, ensure_ascii=False)
        )

        return {
            "status": "success",
            "user_id": user_id,
            "recommendation_count": len(recommendations),
            "top_paper": recommendations[0].get("title") if recommendations else None
        }

    except Exception as e:
        print(f"Error generating recommendations for user {user_id}: {e}")
        return {"status": "error", "message": str(e), "user_id": user_id}

    finally:
        db.close()