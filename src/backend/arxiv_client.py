import requests
import feedparser
import xml.etree.ElementTree as ET
from urllib.parse import urlencode, quote
import time
from typing import List, Dict, Optional
import re

class ArxivClient:
    """Client for interacting with arXiv API and fetching paper content"""
    
    def __init__(self):
        self.base_url = "http://export.arxiv.org/api/query"
        self.html_base_url = "https://arxiv.org/html"
        
    def build_search_query(self, search_type: str, query_data: dict) -> str:
        """Convert search parameters into arXiv search query format"""
        if search_type == "keywords":
            return self._build_keywords_query(query_data.get("keywords", []))
        elif search_type == "title":
            return self._build_title_query(query_data.get("title", ""))
        elif search_type == "author":
            return self._build_author_query(query_data.get("author", ""))
        elif search_type == "advanced":
            return self._build_advanced_query(query_data)
        else:
            # Fallback to keywords for backward compatibility
            return self._build_keywords_query(query_data.get("keywords", []))
    
    def _build_keywords_query(self, keywords: List[str]) -> str:
        """Build query for keyword-based search"""
        if not keywords:
            return ""
        
        # Create a query that searches in title, abstract, and all fields
        query_parts = []
        for keyword in keywords:
            # Search in multiple fields for better coverage
            field_searches = [
                f"ti:{keyword}",  # title
                f"abs:{keyword}",  # abstract
                f"all:{keyword}"   # all fields
            ]
            query_parts.append(f"({' OR '.join(field_searches)})")
        
        return " AND ".join(query_parts)
    
    def _build_title_query(self, title: str) -> str:
        """Build query for title-based search"""
        if not title.strip():
            return ""
        
        title = title.strip()
        
        # If title contains quotes, search for exact phrase
        if '"' in title:
            return f"ti:{title}"
        
        # For multi-word titles, try both exact phrase and individual words
        words = title.split()
        if len(words) > 1:
            # Search for exact phrase OR all words in title
            exact_phrase = f'ti:"{title}"'
            word_search = " AND ".join([f"ti:{word}" for word in words])
            return f"({exact_phrase} OR ({word_search}))"
        else:
            # Single word - search in title
            return f"ti:{title}"
    
    def _build_author_query(self, author: str) -> str:
        """Build query for author-based search"""
        if not author.strip():
            return ""
        
        author = author.strip()
        
        # Handle different author name formats
        if ',' in author:
            # "Last, First" format
            return f'au:"{author}"'
        elif ' ' in author:
            # "First Last" format - try both orders
            parts = author.split()
            if len(parts) == 2:
                first, last = parts
                format1 = f'au:"{last}, {first}"'
                format2 = f'au:"{first} {last}"'
                return f"({format1} OR {format2})"
            else:
                # Multiple names - search as phrase
                return f'au:"{author}"'
        else:
            # Single name - could be first or last name
            return f"au:{author}"
    
    def _build_advanced_query(self, query_data: dict) -> str:
        """Build query for advanced search with multiple criteria"""
        query_parts = []
        
        # Title search
        if query_data.get("title"):
            title_query = self._build_title_query(query_data["title"])
            if title_query:
                query_parts.append(f"({title_query})")
        
        # Author search
        if query_data.get("author"):
            author_query = self._build_author_query(query_data["author"])
            if author_query:
                query_parts.append(f"({author_query})")
        
        # Keywords search
        if query_data.get("keywords"):
            keywords_query = self._build_keywords_query(query_data["keywords"])
            if keywords_query:
                query_parts.append(f"({keywords_query})")
        
        # Abstract search
        if query_data.get("abstract"):
            abstract_terms = query_data["abstract"]
            if isinstance(abstract_terms, str):
                abstract_terms = [abstract_terms]
            abs_parts = [f"abs:{term}" for term in abstract_terms]
            query_parts.append(f"({' AND '.join(abs_parts)})")
        
        # Category filter
        if query_data.get("categories"):
            categories = query_data["categories"]
            if isinstance(categories, str):
                categories = [categories]
            cat_parts = [f"cat:{cat}" for cat in categories]
            query_parts.append(f"({' OR '.join(cat_parts)})")
        
        # Combine with AND logic
        return " AND ".join(query_parts) if query_parts else ""
    
    def search_papers(self, search_type: str = "keywords", query_data: dict = None, max_results: int = 50, start: int = 0) -> Dict:
        """Search for papers using arXiv API with enhanced search types"""
        # Handle backward compatibility
        if query_data is None and isinstance(search_type, list):
            # Old API: search_papers(keywords_list)
            query_data = {"keywords": search_type}
            search_type = "keywords"
        elif query_data is None:
            query_data = {}
        
        search_query = self.build_search_query(search_type, query_data)
        
        if not search_query:
            return {"papers": [], "total_results": 0, "error": "No search criteria provided"}
        
        params = {
            "search_query": search_query,
            "start": start,
            "max_results": min(max_results, 100),  # API limit
            "sortBy": "submittedDate",
            "sortOrder": "descending"
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            
            # Parse the Atom feed
            feed = feedparser.parse(response.content)
            
            if hasattr(feed, 'status') and feed.status != 200:
                return {"papers": [], "total_results": 0, "error": "API request failed"}
            
            papers = []
            for entry in feed.entries:
                paper_data = self._parse_paper_entry(entry)
                papers.append(paper_data)
            
            # Get total results from OpenSearch extension
            total_results = 0
            if hasattr(feed.feed, 'opensearch_totalresults'):
                total_results = int(feed.feed.opensearch_totalresults)
            
            return {
                "papers": papers,
                "total_results": total_results,
                "query": search_query
            }
            
        except requests.RequestException as e:
            return {"papers": [], "total_results": 0, "error": f"Network error: {str(e)}"}
        except Exception as e:
            return {"papers": [], "total_results": 0, "error": f"Parsing error: {str(e)}"}
    
    def _parse_paper_entry(self, entry) -> Dict:
        """Parse a single paper entry from arXiv feed"""
        # Extract arXiv ID from the entry ID
        arxiv_id = entry.id.split('/abs/')[-1]
        
        # Parse authors
        authors = []
        if hasattr(entry, 'authors'):
            authors = [author.name for author in entry.authors]
        elif hasattr(entry, 'author'):
            authors = [entry.author]
        
        # Parse categories
        categories = []
        if hasattr(entry, 'tags'):
            categories = [tag.term for tag in entry.tags]
        
        # Parse publication and update dates
        published = getattr(entry, 'published', '')
        updated = getattr(entry, 'updated', '')
        
        # Extract PDF and abstract links
        pdf_link = ""
        abstract_link = ""
        for link in getattr(entry, 'links', []):
            if link.get('type') == 'application/pdf':
                pdf_link = link.href
            elif link.get('rel') == 'alternate':
                abstract_link = link.href
        
        # Check if HTML version is available
        html_available = self.check_html_availability(arxiv_id)
        
        return {
            "id": arxiv_id,
            "title": getattr(entry, 'title', '').strip(),
            "authors": authors,
            "abstract": getattr(entry, 'summary', '').strip(),
            "categories": categories,
            "published": published,
            "updated": updated,
            "pdf_link": pdf_link,
            "abstract_link": abstract_link,
            "html_available": html_available,
            "html_link": f"{self.html_base_url}/{arxiv_id}" if html_available else ""
        }
    
    def check_html_availability(self, arxiv_id: str) -> bool:
        """Check if HTML version is available for a paper"""
        html_url = f"{self.html_base_url}/{arxiv_id}"
        try:
            response = requests.head(html_url, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def fetch_html_content(self, arxiv_id: str) -> Dict:
        """Fetch HTML content for a paper"""
        html_url = f"{self.html_base_url}/{arxiv_id}"
        
        try:
            response = requests.get(html_url, timeout=30)
            response.raise_for_status()
            
            return {
                "success": True,
                "content": response.text,
                "url": html_url
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Failed to fetch HTML content: {str(e)}",
                "url": html_url
            }
    
    def get_paper_details(self, arxiv_id: str) -> Dict:
        """Get detailed information about a specific paper"""
        params = {
            "id_list": arxiv_id,
            "max_results": 1
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            
            feed = feedparser.parse(response.content)
            
            if not feed.entries:
                return {"error": "Paper not found"}
            
            paper_data = self._parse_paper_entry(feed.entries[0])
            return {"success": True, "paper": paper_data}
            
        except Exception as e:
            return {"error": f"Failed to fetch paper details: {str(e)}"}

if __name__ == "__main__":
    # Test the client
    client = ArxivClient()
    
    # Test search
    results = client.search_papers(["machine learning", "neural networks"], max_results=5)
    print(f"Found {results['total_results']} papers")
    
    for paper in results['papers']:
        print(f"- {paper['title']}")
        print(f"  HTML available: {paper['html_available']}")
        print()
