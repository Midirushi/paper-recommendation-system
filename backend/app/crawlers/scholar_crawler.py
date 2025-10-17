from typing import List, Dict, Optional
from datetime import datetime, timedelta
from .base_crawler import BaseCrawler
import requests
from ..config import settings

class ScholarCrawler(BaseCrawler):
    """Google Scholar crawler using SerpAPI"""

    def __init__(self):
        super().__init__()
        self.api_key = settings.SCHOLAR_API_KEY
        self.base_url = "https://serpapi.com/search.json"

    def fetch_latest_papers(self, days: int = 1) -> List[Dict]:
        """Fetch papers from the last N days"""
        end_year = datetime.now().year
        start_year = (datetime.now() - timedelta(days=days)).year

        # Google Scholar doesn't have precise date filtering, so we use year range
        keywords = ["knowledge graph", "geographic"]  # Example keywords
        return self.search_papers(keywords, limit=100, year_low=start_year, year_high=end_year)

    def search_papers(self, keywords: List[str], limit: int = 50,
                      year_low: int = None, year_high: int = None) -> List[Dict]:
        """Search Google Scholar via SerpAPI"""
        if not self.api_key or self.api_key == "your-serpapi-key":
            print("Warning: SCHOLAR_API_KEY not configured. Skipping Google Scholar search.")
            return []

        papers = []

        try:
            query = " ".join(keywords)

            # SerpAPI parameters
            params = {
                "engine": "google_scholar",
                "q": query,
                "api_key": self.api_key,
                "num": min(limit, 20),  # SerpAPI limits to 20 per request
                "hl": "en"
            }

            # Add year filter if provided
            if year_low and year_high:
                params["as_ylo"] = year_low
                params["as_yhi"] = year_high

            # Make request
            response = requests.get(self.base_url, params=params, timeout=self.timeout)
            response.raise_for_status()

            data = response.json()

            # Parse results
            if "organic_results" in data:
                for result in data["organic_results"][:limit]:
                    paper = self._parse_scholar_result(result)
                    if paper:
                        papers.append(paper)

            return papers

        except Exception as e:
            print(f"Google Scholar search error: {e}")
            return []

    def _parse_scholar_result(self, result: Dict) -> Optional[Dict]:
        """Parse a single Google Scholar result"""
        try:
            title = result.get("title", "")
            if not title:
                return None

            # Extract authors
            authors = []
            if "publication_info" in result:
                authors_str = result["publication_info"].get("authors", "")
                if authors_str:
                    author_names = [a.strip() for a in authors_str.split(",")]
                    authors = [{"name": name} for name in author_names if name]

            # Extract publication info
            journal = ""
            publish_date = None
            if "publication_info" in result:
                summary = result["publication_info"].get("summary", "")
                # Try to extract journal name and year
                if " - " in summary:
                    parts = summary.split(" - ")
                    if len(parts) >= 2:
                        journal = parts[0].strip()

                # Extract year
                year = result.get("inline_links", {}).get("cited_by", {}).get("year")
                if not year and "publication_info" in result:
                    # Try to extract from summary
                    import re
                    year_match = re.search(r'\b(19|20)\d{2}\b', summary)
                    if year_match:
                        year = year_match.group(0)

                if year:
                    publish_date = f"{year}-01-01"

            # Extract citation count
            citation_count = 0
            if "inline_links" in result and "cited_by" in result["inline_links"]:
                cited_by = result["inline_links"]["cited_by"]
                if "total" in cited_by:
                    citation_count = cited_by["total"]

            # Extract link
            link = result.get("link", "")

            # Extract snippet as abstract
            abstract = result.get("snippet", "")

            # Generate paper ID
            paper_id = self._generate_paper_id(title, "scholar")

            paper = {
                "id": paper_id,
                "title": title,
                "title_en": title,
                "abstract": abstract,
                "abstract_en": abstract,
                "authors": authors,
                "journal": journal,
                "publish_date": publish_date,
                "source": "scholar",
                "source_url": link,
                "citation_count": citation_count,
                "doi": "",
                "keywords": [],
                "keywords_en": []
            }

            return self._normalize_paper_data(paper)

        except Exception as e:
            print(f"Error parsing Scholar result: {e}")
            return None

    def search_by_author(self, author_name: str, limit: int = 20) -> List[Dict]:
        """Search papers by author name"""
        if not self.api_key or self.api_key == "your-serpapi-key":
            return []

        try:
            params = {
                "engine": "google_scholar",
                "q": f'author:"{author_name}"',
                "api_key": self.api_key,
                "num": min(limit, 20)
            }

            response = requests.get(self.base_url, params=params, timeout=self.timeout)
            response.raise_for_status()

            data = response.json()
            papers = []

            if "organic_results" in data:
                for result in data["organic_results"]:
                    paper = self._parse_scholar_result(result)
                    if paper:
                        papers.append(paper)

            return papers

        except Exception as e:
            print(f"Author search error: {e}")
            return []

    def get_paper_citations(self, paper_title: str) -> int:
        """Get citation count for a specific paper"""
        if not self.api_key or self.api_key == "your-serpapi-key":
            return 0

        try:
            params = {
                "engine": "google_scholar",
                "q": paper_title,
                "api_key": self.api_key,
                "num": 1
            }

            response = requests.get(self.base_url, params=params, timeout=self.timeout)
            response.raise_for_status()

            data = response.json()

            if "organic_results" in data and len(data["organic_results"]) > 0:
                result = data["organic_results"][0]
                if "inline_links" in result and "cited_by" in result["inline_links"]:
                    return result["inline_links"]["cited_by"].get("total", 0)

            return 0

        except Exception as e:
            print(f"Citation count error: {e}")
            return 0

scholar_crawler = ScholarCrawler()
