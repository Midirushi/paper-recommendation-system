from sqlalchemy import Column, String, Text, Date, JSON, Integer, Float, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import ARRAY
from pgvector.sqlalchemy import Vector
from datetime import datetime

Base = declarative_base()

class Paper(Base):
    __tablename__ = "papers"
    
    id = Column(String(100), primary_key=True)
    title = Column(Text, nullable=False)
    title_en = Column(Text)
    abstract = Column(Text)
    abstract_en = Column(Text)
    
    # Metadata
    authors = Column(JSON)  # [{"name": "Zhang San", "affiliation": "Tsinghua"}]
    keywords = Column(ARRAY(String))
    keywords_en = Column(ARRAY(String))
    
    # Publication Info
    journal = Column(String(200))
    publish_date = Column(Date)
    doi = Column(String(100), unique=True)
    issn = Column(String(20))
    
    # Source
    source = Column(String(50))  # cnki, wos, scholar, local
    source_url = Column(Text)
    pdf_path = Column(String(500))
    
    # Metrics
    citation_count = Column(Integer, default=0)
    impact_factor = Column(Float)
    
    # Vector Embedding for Semantic Search
    embedding = Column(Vector(1536))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_paper_publish_date', 'publish_date'),
        Index('idx_paper_source', 'source'),
        Index('idx_paper_journal', 'journal'),
    )


class ResearchTrend(Base):
    __tablename__ = "research_trends"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    topic = Column(String(200), nullable=False)
    trend_summary = Column(Text)
    hot_papers = Column(JSON)  # List of paper IDs
    keywords = Column(ARRAY(String))
    
    # Analysis Period
    analysis_date = Column(Date, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    
    # Statistics
    paper_count = Column(Integer)
    avg_citation = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_trend_date', 'analysis_date'),
        Index('idx_trend_topic', 'topic'),
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True)
    
    # Research Interests
    research_keywords = Column(ARRAY(String))
    favorite_authors = Column(ARRAY(String))
    favorite_journals = Column(ARRAY(String))
    
    # Interaction History
    search_history = Column(JSON)  # [{query, timestamp}]
    reading_history = Column(JSON)  # [{paper_id, action, timestamp}]
    
    # Preferences
    push_frequency = Column(String(20), default="weekly")  # daily, weekly, monthly
    push_enabled = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SearchLog(Base):
    __tablename__ = "search_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50))
    query = Column(Text, nullable=False)
    extracted_keywords = Column(JSON)
    
    # Results
    result_count = Column(Integer)
    result_paper_ids = Column(ARRAY(String))
    
    # Performance
    response_time = Column(Float)  # seconds
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_search_user', 'user_id'),
        Index('idx_search_date', 'created_at'),
    )