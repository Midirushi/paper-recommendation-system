from typing import List, Dict
from datetime import datetime, timedelta
from .base_crawler import BaseCrawler
import re

class CNKICrawler(BaseCrawler):
    """CNKI (China National Knowledge Infrastructure) crawler"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.cnki.net"
        self.search_url = "https://kns.cnki.net/kns8/Brief/GetGridTableHtml"
    
    def fetch_latest_papers(self, days: int = 1) -> List[Dict]:
        """Fetch papers from the last N days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Build search query for date range
        keywords = ["地理", "知识图谱"]  # Example keywords
        return self.search_papers(keywords, limit=100, start_date=start_date, end_date=end_date)
    
    def search_papers(self, keywords: List[str], limit: int = 50, 
                      start_date: datetime = None, end_date: datetime = None) -> List[Dict]:
        """Search CNKI for papers"""
        papers = []
        
        try:
            # Note: This is a simplified example. Real CNKI API requires authentication
            # and proper request parameters. You may need to use Selenium for actual implementation.
            
            search_query = " ".join(keywords)
            
            # Example parameters (need to be adjusted based on actual CNKI API)
            params = {
                "QueryJson": self._build_query_json(search_query, start_date, end_date),
                "PageName": "DefaultResult",
                "DBCode": "SCDB",  # Journal database
                "KuaKuCodes": "CJFQ,CDMD,CIPD,CCND,CISD",
                "CurPage": 1,
                "RecordsCntPerPage": limit
            }
            
            # Make request
            response = self._make_request(self.search_url, method="POST", data=params)
            
            if response:
                # Parse results (this is a placeholder - actual parsing depends on CNKI's response format)
                papers = self._parse_cnki_results(response.text)
            
            return papers[:limit]
        
        except Exception as e:
            print(f"CNKI search error: {e}")
            return []
    
    def _build_query_json(self, query: str, start_date: datetime = None, 
                          end_date: datetime = None) -> str:
        """Build CNKI query JSON"""
        # Simplified query structure
        query_json = {
            "Platform": "",
            "DBCode": "SCDB",
            "KuaKuCode": "CJFQ,CDMD,CIPD,CCND,CISD",
            "QNode": {
                "QGroup": [
                    {
                        "Key": "Subject",
                        "Title": "",
                        "Logic": 0,
                        "Items": [
                            {
                                "Title": "主题",
                                "Name": "SU",
                                "Value": query,
                                "Operate": "%="
                            }
                        ]
                    }
                ]
            }
        }
        
        # Add date filter if provided
        if start_date and end_date:
            query_json["QNode"]["QGroup"].append({
                "Key": "ControlGroup",
                "Title": "",
                "Logic": 0,
                "Items": [
                    {
                        "Title": "发表时间",
                        "Name": "PD",
                        "Value": f"{start_date.strftime('%Y-%m-%d')} TO {end_date.strftime('%Y-%m-%d')}",
                        "Operate": "="
                    }
                ]
            })
        
        import json
        return json.dumps(query_json, ensure_ascii=False)
    
    def _parse_cnki_results(self, html: str) -> List[Dict]:
        """Parse CNKI search results"""
        papers = []
        soup = self._parse_html(html)
        
        # Parse table rows (this is a simplified example)
        rows = soup.find_all('tr', class_='result-table-list')
        
        for row in rows:
            try:
                # Extract paper information
                title_elem = row.find('a', class_='fz14')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                link = title_elem.get('href', '')
                
                # Extract authors
                authors_elem = row.find('td', class_='author')
                authors = []
                if authors_elem:
                    author_links = authors_elem.find_all('a')
                    authors = [{"name": a.get_text(strip=True)} for a in author_links]
                
                # Extract journal and date
                source_elem = row.find('td', class_='source')
                journal = ""
                publish_date = None
                if source_elem:
                    source_text = source_elem.get_text(strip=True)
                    journal = source_text.split(',')[0] if ',' in source_text else source_text
                    
                    # Try to extract date
                    date_match = re.search(r'(\d{4})-(\d{2})', source_text)
                    if date_match:
                        publish_date = f"{date_match.group(1)}-{date_match.group(2)}-01"
                
                # Generate paper ID
                paper_id = self._generate_paper_id(title, "cnki")
                
                paper = {
                    "id": paper_id,
                    "title": title,
                    "authors": authors,
                    "journal": journal,
                    "publish_date": publish_date,
                    "source": "cnki",
                    "source_url": f"{self.base_url}{link}" if link else "",
                    "doi": "",
                    "keywords": [],
                    "abstract": ""
                }
                
                papers.append(self._normalize_paper_data(paper))
            
            except Exception as e:
                print(f"Error parsing CNKI paper: {e}")
                continue
        
        return papers
    
    def fetch_paper_details(self, paper_url: str) -> Dict:
        """Fetch detailed information for a specific paper"""
        try:
            response = self._make_request(paper_url)
            if not response:
                return {}
            
            soup = self._parse_html(response.text)
            
            # Extract abstract
            abstract_elem = soup.find('span', id='ChDivSummary')
            abstract = abstract_elem.get_text(strip=True) if abstract_elem else ""
            
            # Extract keywords
            keywords_elem = soup.find('p', class_='keywords')
            keywords = []
            if keywords_elem:
                keyword_links = keywords_elem.find_all('a')
                keywords = [k.get_text(strip=True) for k in keyword_links]
            
            # Extract DOI
            doi_elem = soup.find('p', class_='doi')
            doi = doi_elem.get_text(strip=True).replace('DOI:', '').strip() if doi_elem else ""
            
            return {
                "abstract": abstract,
                "keywords": keywords,
                "doi": doi
            }
        
        except Exception as e:
            print(f"Error fetching paper details: {e}")
            return {}

cnki_crawler = CNKICrawler()