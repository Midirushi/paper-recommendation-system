# Quick Start Guide - New Features

This guide helps you test all the newly implemented features in the paper recommendation system.

## Prerequisites

1. **Set up environment variables** in `backend/.env`:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   SCHOLAR_API_KEY=your-serpapi-key  # Get from https://serpapi.com
   ```

2. **Start the system** with Docker:
   ```bash
   cd deployment
   docker-compose up -d
   ```

3. **Access the API docs** at: http://localhost:8000/docs

---

## 1. Test Google Scholar Crawler

### Manual Crawl via API:
```bash
curl -X POST "http://localhost:8000/api/v1/admin/crawl/manual" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["machine learning", "knowledge graph"],
    "source": "scholar",
    "limit": 20
  }'
```

**Expected Response:**
```json
{
  "source": "scholar",
  "keywords": ["machine learning", "knowledge graph"],
  "total_found": 20,
  "new_papers": 18,
  "updated_papers": 2
}
```

---

## 2. Test Personalized Recommendations

### Step 1: Record User Interactions
```bash
# User views a paper
curl -X POST "http://localhost:8000/api/v1/recommendations/interaction?user_id=alice&paper_id=paper_123&action=view"

# User saves a paper
curl -X POST "http://localhost:8000/api/v1/recommendations/interaction?user_id=alice&paper_id=paper_456&action=save"
```

### Step 2: Get Personalized Recommendations
```bash
curl -X GET "http://localhost:8000/api/v1/recommendations/personalized?user_id=alice&limit=10"
```

**Expected Response:**
```json
[
  {
    "id": "paper_789",
    "title": "Knowledge Graph Embedding Methods",
    "relevance_score": 8.5,
    "recommendation_reason": "匹配您关注的关键词: knowledge graph, embedding | 高被引论文(156次)",
    ...
  }
]
```

### Step 3: Trigger Background Recommendation Generation
```bash
curl -X POST "http://localhost:8000/api/v1/recommendations/generate/alice"
```

**Response:**
```json
{
  "status": "scheduled",
  "task_id": "abc-123-def-456",
  "user_id": "alice"
}
```

---

## 3. Test Similar Papers (Vector Search)

```bash
# Find papers similar to a specific paper
curl -X GET "http://localhost:8000/api/v1/recommendations/similar/paper_123?limit=5"
```

**Expected Response:**
```json
[
  {
    "id": "paper_999",
    "title": "Advanced Knowledge Graph Techniques",
    "recommendation_reason": "基于语义相似度推荐",
    ...
  }
]
```

---

## 4. Test Vector Store Operations

### Check Embedding Coverage:
```bash
curl -X GET "http://localhost:8000/api/v1/admin/embeddings/stats"
```

**Response:**
```json
{
  "total_papers": 1000,
  "papers_with_embeddings": 850,
  "coverage_percentage": 85.0,
  "embedding_dimension": 1536
}
```

### Rebuild Missing Embeddings:
```bash
curl -X POST "http://localhost:8000/api/v1/admin/embeddings/rebuild?batch_size=50"
```

**Response:**
```json
{
  "total_papers": 150,
  "updated": 150,
  "status": "completed"
}
```

---

## 5. Test Crawler Statistics

```bash
curl -X GET "http://localhost:8000/api/v1/admin/crawl/stats?days=7"
```

**Expected Response:**
```json
{
  "period_days": 7,
  "total_papers": 245,
  "by_source": {
    "cnki": 120,
    "scholar": 125
  },
  "avg_per_day": 35.0
}
```

---

## 6. Test Citation Updates

```bash
# Update citation counts for 100 papers
curl -X POST "http://localhost:8000/api/v1/admin/citations/update?limit=100"
```

**Response:**
```json
{
  "status": "success",
  "updated_count": 87,
  "message": "Updated citation counts for 87 papers"
}
```

---

## 7. Test Celery Task Management

### Trigger Tasks Manually:
```bash
# Trigger trend analysis
curl -X POST "http://localhost:8000/api/v1/admin/tasks/trigger/trends"

# Trigger all-sources crawl
curl -X POST "http://localhost:8000/api/v1/admin/tasks/trigger/all_sources"
```

### Check Task Status:
```bash
curl -X GET "http://localhost:8000/api/v1/admin/tasks/status/abc-123-def-456"
```

**Response:**
```json
{
  "task_id": "abc-123-def-456",
  "status": "SUCCESS",
  "result": {
    "status": "success",
    "user_id": "alice",
    "recommendation_count": 10
  }
}
```

---

## 8. Test Paper Enrichment

```bash
# Fetch additional details for a paper from its source
curl -X POST "http://localhost:8000/api/v1/admin/paper/paper_123/enrich"
```

**Response:**
```json
{
  "status": "success",
  "paper_id": "paper_123",
  "message": "Paper enriched successfully"
}
```

---

## 9. Integration Test Workflow

### Complete User Journey:
```bash
# 1. User searches for papers
curl -X POST "http://localhost:8000/api/v1/search/" \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning for knowledge graphs", "user_id": "bob", "limit": 10}'

# 2. User views a paper (record interaction)
curl -X POST "http://localhost:8000/api/v1/recommendations/interaction?user_id=bob&paper_id=paper_567&action=view"

# 3. Find similar papers
curl -X GET "http://localhost:8000/api/v1/recommendations/similar/paper_567"

# 4. Get personalized recommendations
curl -X GET "http://localhost:8000/api/v1/recommendations/personalized?user_id=bob&limit=5"

# 5. Generate new recommendations in background
curl -X POST "http://localhost:8000/api/v1/recommendations/generate/bob"
```

---

## 10. Monitor System Health

### Check API Health:
```bash
curl -X GET "http://localhost:8000/health"
```

### View Celery Tasks (Flower):
- Open browser: http://localhost:5555
- View active tasks, worker status, task history

### View Backend Logs:
```bash
docker-compose logs -f backend
```

### View Celery Worker Logs:
```bash
docker-compose logs -f celery_worker
```

---

## Common Issues & Solutions

### Issue 1: Google Scholar Returns No Results
**Cause:** `SCHOLAR_API_KEY` not set or invalid

**Solution:**
1. Get API key from https://serpapi.com
2. Add to `backend/.env`: `SCHOLAR_API_KEY=your-key`
3. Restart: `docker-compose restart backend`

---

### Issue 2: Embeddings Not Generated
**Cause:** `OPENAI_API_KEY` not set

**Solution:**
1. Add to `backend/.env`: `OPENAI_API_KEY=sk-...`
2. Rebuild embeddings: `curl -X POST "http://localhost:8000/api/v1/admin/embeddings/rebuild"`

---

### Issue 3: Recommendations Return Empty
**Cause:** User has no interaction history

**Solution:**
1. Record some interactions first:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/recommendations/interaction?user_id=test&paper_id=paper_1&action=view"
   ```
2. Or use trending recommendations:
   ```bash
   curl -X GET "http://localhost:8000/api/v1/recommendations/trending"
   ```

---

### Issue 4: Celery Tasks Not Running
**Cause:** Celery worker not started

**Solution:**
```bash
docker-compose restart celery_worker
docker-compose logs -f celery_worker
```

---

## Performance Tips

1. **Batch Operations:**
   - Use batch size 50-100 for embedding generation
   - Process citations in batches of 100

2. **Caching:**
   - Recommendations are cached for 24 hours
   - Search results cached for 1 hour
   - Clear cache if needed: `docker-compose exec redis redis-cli FLUSHDB`

3. **Rate Limiting:**
   - SerpAPI: 100 searches/month on free plan
   - OpenAI: Watch token usage for embeddings

---

## Advanced Usage

### Custom Recommendation Algorithm:
Edit `backend/app/services/recommendation.py:_calculate_relevance_score()` to adjust weights:
```python
# Current weights:
keyword_matching: 40%
author_matching: 20%
journal_matching: 15%
citation_count: 15%
recency: 10%
```

### Add Custom Crawler:
1. Extend `BaseCrawler` in `backend/app/crawlers/`
2. Implement `fetch_latest_papers()` and `search_papers()`
3. Register in `crawler_service.py`

### Schedule Custom Tasks:
Add to `backend/tasks/crawler_tasks.py`:
```python
celery_app.conf.beat_schedule = {
    'my-custom-task': {
        'task': 'tasks.crawler_tasks.my_task',
        'schedule': 3600.0,  # Every hour
    }
}
```

---

## API Documentation

Visit http://localhost:8000/docs for complete interactive API documentation with:
- All endpoints
- Request/response schemas
- Try-it-out functionality
- Example payloads

---

## Success Indicators

✅ Scholar crawler returns papers
✅ Embeddings generated (check stats)
✅ Recommendations personalized for users
✅ Similar papers returned via vector search
✅ Celery tasks complete successfully
✅ Citation counts updated
✅ User interactions tracked

Your paper recommendation system is now fully operational! 🚀
