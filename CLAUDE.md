# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

An intelligent paper recommendation system built with FastAPI (backend) and React (frontend), leveraging LLMs (GPT-4) for semantic search and trend analysis. The system provides on-demand paper retrieval and periodic intelligent recommendations through a multi-source search architecture.

**Core Technologies:**
- Backend: Python 3.11, FastAPI 0.104, PostgreSQL 15 with pgvector
- Frontend: React 18.2, Vite 5.0, TailwindCSS 3.3
- Task Queue: Celery 5.3 with Redis 7
- LLM: OpenAI GPT-4, text-embedding-3-small for embeddings
- Vector Search: pgvector extension for semantic similarity

## Development Commands

### Backend

```bash
# Run backend server (development)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run Celery worker for background tasks
celery -A tasks.crawler_tasks worker --loglevel=info

# Run Celery beat for scheduled tasks
celery -A tasks.crawler_tasks beat --loglevel=info

# Monitor Celery tasks with Flower
celery -A tasks.crawler_tasks flower --port=5555

# Database migrations (when schema changes)
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Frontend

```bash
# Run frontend (development)
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Docker Deployment

```bash
# Start entire stack with Docker Compose
cd deployment
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Rebuild after code changes
docker-compose up -d --build

# Stop all services
docker-compose down

# Initialize system (one-time setup)
chmod +x init-system.sh
./init-system.sh
```

### Testing

```bash
# Run all tests (when test suite is created)
cd backend
pytest tests/ -v --cov=app

# Run specific test file
pytest tests/test_api/test_search.py -v

# Generate coverage report
pytest --cov=app --cov-report=html
```

## Architecture & Code Structure

### Backend Service Architecture

The backend follows a layered architecture with clear separation of concerns:

**1. API Layer** (`backend/app/api/`)
- `search.py`: Paper search endpoints with LLM-powered filtering
- `trends.py`: Research trend analysis and hot papers tracking
- Request/response handled via Pydantic models
- Dependency injection for database sessions

**2. Service Layer** (`backend/app/services/`)
- `llm_service.py`: LLM interactions encapsulated here
  - Keyword extraction from natural language queries
  - Paper relevance filtering and ranking (0-10 scale)
  - Research trend analysis from paper clusters
  - Embedding generation for semantic search
- `search_service.py`: Orchestrates multi-source search
  - Combines local DB (pgvector), CNKI, Google Scholar
  - Async parallel search execution with `asyncio.gather`
  - Deduplication by DOI and title similarity
  - Redis caching for repeated queries
- `recommendation.py`: Personalized recommendation logic

**3. Data Layer** (`backend/app/models/`)
- `paper.py`: Core database models
  - `Paper`: Main paper entity with vector embeddings
  - `ResearchTrend`: Stores periodic trend analysis results
  - `UserProfile`: User preferences and interaction history
  - `SearchLog`: Query logs for analytics
- Uses pgvector for semantic similarity search via `embedding.l2_distance()`

**4. Crawler Layer** (`backend/app/crawlers/`)
- `base_crawler.py`: Abstract base class for crawlers
- `cnki_crawler.py`: CNKI (China National Knowledge Infrastructure) scraper
- `scholar_crawler.py`: Google Scholar via SerpAPI (requires API key)
- Crawlers are called asynchronously via Celery tasks

**5. Task Queue** (`backend/tasks/`)
- `crawler_tasks.py`: Celery task definitions
  - `crawl_cnki_daily`: Scheduled daily crawl (every 24h)
  - `analyze_weekly_trends`: Weekly trend analysis (every 7 days)
  - Tasks generate embeddings and store papers with deduplication

### Frontend Component Structure

**Pages** (`frontend/src/pages/`)
- `Search.jsx`: Main search interface with LLM keyword extraction UI
- `Trends.jsx`: Research trend visualization and hot papers

**Components** (`frontend/src/components/`)
- `SearchBar.jsx`: Query input with keyword preview
- `PaperCard.jsx`: Paper display with relevance score and recommendation reason

**Services** (`frontend/src/services/`)
- `api.js`: Axios client for backend communication

### Key Workflows

**1. Intelligent Search Flow:**
```
User Query → LLM Keyword Extraction (GPT-4) →
Multi-Source Search (Local DB + CNKI + Scholar in parallel) →
Deduplication → LLM Filtering & Ranking →
Top 20 Results with Relevance Scores
```

**2. Vector Semantic Search:**
- Text is embedded using `text-embedding-3-small` (1536 dimensions)
- Stored in PostgreSQL with pgvector extension
- Query: `Paper.embedding.l2_distance(query_embedding)` for similarity
- Time range filters applied before vector search for efficiency

**3. Trend Analysis Pipeline:**
- Celery beat triggers weekly (configurable in `crawler_tasks.py`)
- Fetches papers from last 7 days
- LLM analyzes clusters to identify 3-5 hot topics
- Stores analysis in `ResearchTrend` table
- Frontend displays latest trends via `/api/v1/trends/latest`

## Environment Configuration

**Required API Keys** (set in `backend/.env`):
```bash
OPENAI_API_KEY=sk-...          # Required for LLM and embeddings
ANTHROPIC_API_KEY=sk-ant-...   # Optional (not currently used)
CNKI_API_KEY=...               # Optional (for CNKI crawler)
SCHOLAR_API_KEY=...            # Optional (SerpAPI for Google Scholar)
```

**Database URLs:**
- PostgreSQL: `postgresql://user:pass@host:5432/papers_db`
- Redis: `redis://host:6379/0` (cache), `/1` (Celery broker), `/2` (results)

**Important Settings** (`backend/app/config.py`):
- `LLM_MODEL`: Default is `gpt-4-turbo-preview` (can use `claude-3-sonnet-20240229`)
- `EMBEDDING_MODEL`: `text-embedding-3-small` (must match `VECTOR_DIMENSION: 1536`)
- `CRAWLER_DELAY`: Rate limiting between requests (default 2s)

## Database Schema Notes

**Vector Search Setup:**
- PostgreSQL requires pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector`
- Automatically enabled in `database.py:init_db()`
- Embedding dimension must match OpenAI model: 1536 for `text-embedding-3-small`

**Indexes:**
- Papers: `publish_date`, `source`, `journal` for filtered queries
- SearchLog: `user_id`, `created_at` for history tracking
- Vector similarity uses HNSW index (add manually for production performance)

## LLM Prompt Engineering

**Keyword Extraction** (`llm_service.py:extract_keywords`):
- Structured JSON output with `response_format={"type": "json_object"}`
- Extracts: core keywords (ZH/EN), extended terms, time range, document types
- Temperature: 0.3 (deterministic for consistency)

**Paper Filtering** (`llm_service.py:filter_papers`):
- Evaluates up to 50 papers at once (token limit consideration)
- Outputs relevance score (0-10, 1 decimal), filters >=6.0
- Provides 50-char recommendation reason per paper
- Temperature: 0.2 (more deterministic ranking)

**Trend Analysis** (`llm_service.py:analyze_trends`):
- Analyzes up to 100 recent papers
- Identifies 3-5 hot topics with paper clustering
- Generates 200-char summary
- Temperature: 0.4 (balance creativity and accuracy)

## Caching Strategy

**Redis Caching** (`search_service.py`):
- Cache key format: `{source}:{json_dumps(keywords, sort_keys=True)}`
- TTL: 3600 seconds (1 hour) for search results
- Benefits: Identical queries return in <100ms

**When to Invalidate:**
- New papers added to database
- Crawler completes daily run
- Manual flush: `redis_client.flushdb()` (use with caution)

## Known Limitations & TODOs

**Crawler Implementation:**
- CNKI crawler needs actual API integration (current implementation is simplified)
- Google Scholar requires SerpAPI subscription (paid service)
- Web of Science API not yet implemented

**Missing Features:**
- PDF full-text parsing not implemented
- Email notification system for recommendations (task generates but doesn't send)
- User authentication/authorization not fully integrated

**Performance:**
- Vector search without HNSW index (add for >100k papers)
- No result pagination (currently hardcoded limit=20)
- LLM calls not batched (sequential processing)

**Completed Implementations:**
- ✅ Google Scholar crawler with SerpAPI
- ✅ Personalized recommendation service
- ✅ Crawler orchestration service
- ✅ Vector store utilities with k-means clustering
- ✅ User profile management and interaction tracking
- ✅ Similar papers recommendation
- ✅ Admin API endpoints for management
- ✅ Celery task for personalized recommendations

## API Endpoints Reference

**Search:**
- `POST /api/v1/search/` - Main search with LLM filtering
- `GET /api/v1/search/paper/{paper_id}` - Get paper details
- `GET /api/v1/search/history?user_id=...` - User search history
- `GET /api/v1/search/popular?days=7&limit=10` - Trending papers by search frequency

**Trends:**
- `GET /api/v1/trends/latest` - Most recent trend analysis
- `GET /api/v1/trends/history?limit=10` - Historical trends
- `GET /api/v1/trends/keywords?days=30` - Trending keywords
- `GET /api/v1/trends/hot-papers?days=7` - Hot papers by citations

**Recommendations:**
- `GET /api/v1/recommendations/personalized?user_id=...` - Get personalized recommendations
- `GET /api/v1/recommendations/similar/{paper_id}` - Get similar papers by vector similarity
- `GET /api/v1/recommendations/trending` - Get trending papers
- `POST /api/v1/recommendations/interaction` - Record user interaction with paper
- `POST /api/v1/recommendations/generate/{user_id}` - Trigger background recommendation generation

**Admin (for management operations):**
- `POST /api/v1/admin/crawl/manual` - Manually trigger crawl from specific source
- `POST /api/v1/admin/embeddings/rebuild` - Rebuild missing embeddings
- `GET /api/v1/admin/embeddings/stats` - Get embedding coverage statistics
- `GET /api/v1/admin/crawl/stats?days=7` - Get crawler statistics
- `POST /api/v1/admin/citations/update` - Update citation counts
- `POST /api/v1/admin/paper/{paper_id}/enrich` - Enrich paper with source details
- `POST /api/v1/admin/tasks/trigger/{task_name}` - Trigger Celery task manually
- `GET /api/v1/admin/tasks/status/{task_id}` - Get Celery task status

**System:**
- `GET /` - API info
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation (Swagger UI)

## Deployment Notes

**Docker Services:**
- `postgres`: PostgreSQL with pgvector (ankane/pgvector:latest)
- `redis`: Redis 7 Alpine (persistent storage with AOF)
- `backend`: FastAPI app (port 8000)
- `celery_worker`: Background task processor
- `celery_beat`: Task scheduler
- `flower`: Celery monitoring UI (port 5555)
- `frontend`: React app served by Nginx (port 80)

**Initialization Script** (`deployment/init-system.sh`):
- Creates `.env` from `.env.example`
- Starts all Docker services
- Waits for database health check
- Runs initial database migrations

**Volumes:**
- `postgres_data`: Database persistence
- `redis_data`: Redis AOF persistence
- `backend_logs`: Application logs
- `paper_pdfs`: PDF storage (for future PDF parsing feature)

## Common Debugging

**Database Connection Issues:**
- Check `DATABASE_URL` format in `.env`
- Verify PostgreSQL is running: `docker-compose ps postgres`
- Enable pgvector: `docker-compose exec postgres psql -U paperuser -d papers_db -c "CREATE EXTENSION IF NOT EXISTS vector;"`

**LLM API Errors:**
- Rate limit: Check OpenAI dashboard usage
- Invalid key: Verify `OPENAI_API_KEY` in `.env`
- Token limit exceeded: Reduce papers sent to `filter_papers` (default 50)

**Celery Task Not Running:**
- Check worker logs: `docker-compose logs -f celery_worker`
- Verify Redis connection: `docker-compose exec redis redis-cli ping`
- Restart beat scheduler: `docker-compose restart celery_beat`

**Vector Search Returns No Results:**
- Ensure embeddings are generated for papers (check `Paper.embedding` not null)
- Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- Check embedding dimension matches (1536)
