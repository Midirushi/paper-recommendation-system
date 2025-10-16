import time
import requests
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from ..config import settings
import hashlib

class BaseCrawler(ABC):
    """Base class for all paper crawlers"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': settings.CRAWLER_USER_AGENT
        })
        self.delay = settings.CRAWLER_DELAY
        self.timeout = settings.CRAWLER_TIMEOUT
    
    @abstractmethod
    def fetch_latest_papers(self, days: int = 1) -> List[Dict]:
        """Fetch papers published in the last N days"""
        pass
    
    @abstractmethod
    def search_papers(self, keywords: List[str], limit: int = 50) -> List[Dict]:
        """Search papers by keywords"""
        pass
    
    def _make_request(self, url: str, method: str = "GET", **kwargs) -> Optional[requests.Response]:
        """Make HTTP request with error handling and rate limiting"""
        try:
            time.sleep(self.delay)  # Rate limiting
            
            if method == "GET":
                response = self.session.get(url, timeout=self.timeout, **kwargs)
            else:
                response = self.session.post(url, timeout=self.timeout, **kwargs)
            
            response.raise_for_status()
            return response
        
        except requests.exceptions.RequestException as e:
            print(f"Request error for {url}: {e}")
            return None
    
    def _parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML content"""
        return BeautifulSoup(html, 'html.parser')
    
    def _generate_paper_id(self, title: str, source: str) -> str:
        """Generate unique paper ID from title and source"""
        unique_string = f"{source}:{title}".encode('utf-8')
        return hashlib.md5(unique_string).hexdigest()
    
    def _create_selenium_driver(self) -> webdriver.Chrome:
        """Create Selenium WebDriver for JavaScript-heavy sites"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument(f'user-agent={settings.CRAWLER_USER_AGENT}')
        
        driver = webdriver.Chrome(options=chrome_options)
        return driver
    
    def _normalize_paper_data(self, raw_data: Dict) -> Dict:
        """Normalize paper data to standard format"""
        return {
            "id": raw_data.get("id", ""),
            "title": raw_data.get("title", "").strip(),
            "title_en": raw_data.get("title_en", ""),
            "abstract": raw_data.get("abstract", "").strip(),
            "abstract_en": raw_data.get("abstract_en", ""),
            "authors": raw_data.get("authors", []),
            "keywords": raw_data.get("keywords", []),
            "keywords_en": raw_data.get("keywords_en", []),
            "journal": raw_data.get("journal", ""),
            "publish_date": raw_data.get("publish_date"),
            "doi": raw_data.get("doi", ""),
            "source": raw_data.get("source", ""),
            "source_url": raw_data.get("source_url", ""),
            "pdf_path": raw_data.get("pdf_path"),
            "citation_count": raw_data.get("citation_count", 0)
        }