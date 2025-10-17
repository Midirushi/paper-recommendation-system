from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from ..models.paper import Paper
from ..services.llm_service import llm_service
from ..database import redis_client
import json
import numpy as np

class VectorStore:
    """Utility for vector operations and semantic search"""

    def __init__(self):
        self.llm = llm_service
        self.dimension = 1536  # OpenAI text-embedding-3-small dimension

    def generate_and_store_embedding(
        self,
        paper_id: str,
        text: str,
        db: Session
    ) -> bool:
        """Generate embedding for text and store in database"""
        try:
            # Generate embedding
            embedding = self.llm.generate_embedding(text)

            # Update paper with embedding
            paper = db.query(Paper).filter(Paper.id == paper_id).first()
            if paper:
                paper.embedding = embedding
                db.commit()
                return True

            return False

        except Exception as e:
            print(f"Error generating embedding: {e}")
            db.rollback()
            return False

    def batch_generate_embeddings(
        self,
        papers: List[Paper],
        db: Session,
        batch_size: int = 10
    ) -> int:
        """Generate embeddings for multiple papers in batches"""
        updated_count = 0

        for i in range(0, len(papers), batch_size):
            batch = papers[i:i + batch_size]

            for paper in batch:
                try:
                    # Skip if already has embedding
                    if paper.embedding:
                        continue

                    # Generate text for embedding
                    text_parts = []
                    if paper.title:
                        text_parts.append(paper.title)
                    if paper.abstract:
                        text_parts.append(paper.abstract)
                    if paper.keywords:
                        text_parts.append(" ".join(paper.keywords))

                    text = " ".join(text_parts)

                    # Generate and store embedding
                    embedding = self.llm.generate_embedding(text)
                    paper.embedding = embedding
                    updated_count += 1

                except Exception as e:
                    print(f"Error generating embedding for paper {paper.id}: {e}")
                    continue

            # Commit batch
            db.commit()

        return updated_count

    def semantic_search(
        self,
        query: str,
        db: Session,
        limit: int = 20,
        filters: Dict = None
    ) -> List[Paper]:
        """Perform semantic search using vector similarity"""
        # Generate query embedding
        query_embedding = self.llm.generate_embedding(query)

        # Build query
        query_obj = db.query(Paper)

        # Apply filters if provided
        if filters:
            if filters.get("source"):
                query_obj = query_obj.filter(Paper.source == filters["source"])

            if filters.get("start_date"):
                query_obj = query_obj.filter(Paper.publish_date >= filters["start_date"])

            if filters.get("end_date"):
                query_obj = query_obj.filter(Paper.publish_date <= filters["end_date"])

            if filters.get("min_citations"):
                query_obj = query_obj.filter(
                    Paper.citation_count >= filters["min_citations"]
                )

        # Order by vector similarity
        results = query_obj.order_by(
            Paper.embedding.l2_distance(query_embedding)
        ).limit(limit).all()

        return results

    def find_similar_papers(
        self,
        paper_id: str,
        db: Session,
        limit: int = 10,
        threshold: float = 0.8
    ) -> List[Dict]:
        """Find papers similar to a given paper"""
        # Get source paper
        source_paper = db.query(Paper).filter(Paper.id == paper_id).first()

        if not source_paper or not source_paper.embedding:
            return []

        # Find similar papers
        similar_papers = db.query(Paper).filter(
            Paper.id != paper_id
        ).order_by(
            Paper.embedding.l2_distance(source_paper.embedding)
        ).limit(limit).all()

        # Calculate similarity scores
        results = []
        for paper in similar_papers:
            if paper.embedding:
                # Calculate cosine similarity
                similarity = self._cosine_similarity(
                    source_paper.embedding,
                    paper.embedding
                )

                if similarity >= threshold:
                    results.append({
                        "paper": paper,
                        "similarity": similarity
                    })

        return results

    def cluster_papers(
        self,
        paper_ids: List[str],
        db: Session,
        n_clusters: int = 5
    ) -> Dict[int, List[str]]:
        """Cluster papers using k-means on embeddings"""
        papers = db.query(Paper).filter(Paper.id.in_(paper_ids)).all()

        # Extract embeddings
        embeddings = []
        paper_id_list = []

        for paper in papers:
            if paper.embedding:
                embeddings.append(paper.embedding)
                paper_id_list.append(paper.id)

        if len(embeddings) < n_clusters:
            return {0: paper_id_list}

        # Simple k-means clustering
        embeddings_array = np.array(embeddings)
        clusters = self._simple_kmeans(embeddings_array, n_clusters)

        # Group paper IDs by cluster
        cluster_map = {}
        for cluster_id, paper_id in zip(clusters, paper_id_list):
            if cluster_id not in cluster_map:
                cluster_map[cluster_id] = []
            cluster_map[cluster_id].append(paper_id)

        return cluster_map

    def get_paper_topics(
        self,
        paper_ids: List[str],
        db: Session,
        top_n: int = 10
    ) -> List[Dict]:
        """Extract main topics from a set of papers"""
        papers = db.query(Paper).filter(Paper.id.in_(paper_ids)).all()

        # Collect all keywords
        keyword_counts = {}
        for paper in papers:
            if paper.keywords:
                for keyword in paper.keywords:
                    keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1

        # Sort by frequency
        sorted_keywords = sorted(
            keyword_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Return top N keywords with counts
        return [
            {"keyword": kw, "count": count}
            for kw, count in sorted_keywords[:top_n]
        ]

    def cache_search_results(
        self,
        query: str,
        results: List[Dict],
        ttl: int = 3600
    ):
        """Cache search results in Redis"""
        cache_key = f"search_results:{query}"
        redis_client.setex(
            cache_key,
            ttl,
            json.dumps(results, ensure_ascii=False)
        )

    def get_cached_results(self, query: str) -> Optional[List[Dict]]:
        """Get cached search results"""
        cache_key = f"search_results:{query}"
        cached = redis_client.get(cache_key)

        if cached:
            return json.loads(cached)

        return None

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        vec1_array = np.array(vec1)
        vec2_array = np.array(vec2)

        dot_product = np.dot(vec1_array, vec2_array)
        norm1 = np.linalg.norm(vec1_array)
        norm2 = np.linalg.norm(vec2_array)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))

    def _simple_kmeans(
        self,
        embeddings: np.ndarray,
        n_clusters: int,
        max_iterations: int = 100
    ) -> List[int]:
        """Simple k-means clustering implementation"""
        n_samples = len(embeddings)

        # Initialize centroids randomly
        random_indices = np.random.choice(n_samples, n_clusters, replace=False)
        centroids = embeddings[random_indices]

        for _ in range(max_iterations):
            # Assign to nearest centroid
            distances = np.zeros((n_samples, n_clusters))
            for i, centroid in enumerate(centroids):
                distances[:, i] = np.linalg.norm(embeddings - centroid, axis=1)

            labels = np.argmin(distances, axis=1)

            # Update centroids
            new_centroids = np.zeros_like(centroids)
            for i in range(n_clusters):
                cluster_points = embeddings[labels == i]
                if len(cluster_points) > 0:
                    new_centroids[i] = cluster_points.mean(axis=0)
                else:
                    new_centroids[i] = centroids[i]

            # Check convergence
            if np.allclose(centroids, new_centroids):
                break

            centroids = new_centroids

        return labels.tolist()

    def rebuild_all_embeddings(self, db: Session, batch_size: int = 50) -> Dict:
        """Rebuild embeddings for all papers (use with caution)"""
        # Get all papers without embeddings
        papers = db.query(Paper).filter(Paper.embedding == None).all()

        total = len(papers)
        updated = self.batch_generate_embeddings(papers, db, batch_size)

        return {
            "total_papers": total,
            "updated": updated,
            "status": "completed"
        }

    def get_vector_statistics(self, db: Session) -> Dict:
        """Get statistics about vectors in the database"""
        total_papers = db.query(Paper).count()
        papers_with_embeddings = db.query(Paper).filter(
            Paper.embedding != None
        ).count()

        return {
            "total_papers": total_papers,
            "papers_with_embeddings": papers_with_embeddings,
            "coverage_percentage": (papers_with_embeddings / total_papers * 100)
                                   if total_papers > 0 else 0,
            "embedding_dimension": self.dimension
        }

vector_store = VectorStore()
