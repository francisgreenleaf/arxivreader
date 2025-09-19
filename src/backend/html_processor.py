from bs4 import BeautifulSoup, NavigableString
import re
from typing import Dict, Optional
import requests

class HTMLProcessor:
    """Process and clean arXiv HTML content for consistent display"""
    
    def __init__(self):
        self.unwanted_elements = [
            'script', 'style', 'nav', 'footer', 'header',
            '.ltx_page_navbar', '.ltx_page_footer', '.ltx_page_header'
        ]
        
    def process_arxiv_html(self, arxiv_id: str, html_content: str) -> Dict:
        """Process raw arXiv HTML content and extract the main paper content"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract paper metadata
            metadata = self._extract_metadata(soup, arxiv_id)
            
            # Clean and process main content
            main_content = self._extract_main_content(soup)
            processed_content = self._clean_content(main_content)
            
            # Extract sections
            sections = self._extract_sections(processed_content)
            
            return {
                "success": True,
                "arxiv_id": arxiv_id,
                "metadata": metadata,
                "content": str(processed_content),
                "sections": sections,
                "has_math": self._has_mathematical_content(processed_content)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to process HTML content: {str(e)}"
            }
    
    def _extract_metadata(self, soup: BeautifulSoup, arxiv_id: str) -> Dict:
        """Extract paper metadata from HTML"""
        metadata = {"arxiv_id": arxiv_id}
        
        # Extract title
        title_elem = soup.find('h1', class_='ltx_title')
        if title_elem:
            metadata['title'] = title_elem.get_text().strip()
        
        # Extract authors
        authors = []
        author_elems = soup.find_all('span', class_='ltx_author')
        for author_elem in author_elems:
            author_name = author_elem.get_text().strip()
            if author_name:
                authors.append(author_name)
        metadata['authors'] = authors
        
        # Extract abstract
        abstract_elem = soup.find('div', class_='ltx_abstract')
        if abstract_elem:
            abstract_text = abstract_elem.get_text().strip()
            # Remove "Abstract" label if present
            abstract_text = re.sub(r'^abstract\s*', '', abstract_text, flags=re.IGNORECASE)
            metadata['abstract'] = abstract_text
        
        # Extract publication info
        date_elem = soup.find('div', class_='ltx_dates')
        if date_elem:
            metadata['date'] = date_elem.get_text().strip()
        
        return metadata
    
    def _extract_main_content(self, soup: BeautifulSoup) -> BeautifulSoup:
        """Extract the main paper content, removing navigation and other non-content elements"""
        # Find the main content container
        main_content = soup.find('div', class_='ltx_page_main')
        if not main_content:
            main_content = soup.find('article')
        if not main_content:
            main_content = soup.find('body')
        
        if not main_content:
            return soup
        
        # Create a new soup with just the main content
        new_soup = BeautifulSoup('', 'html.parser')
        main_div = new_soup.new_tag('div', **{'class': 'arxiv-content'})
        
        # Copy the main content
        if main_content:
            main_div.extend(main_content.contents)
        
        new_soup.append(main_div)
        return new_soup
    
    def _clean_content(self, soup: BeautifulSoup) -> BeautifulSoup:
        """Clean the content by removing unwanted elements and fixing formatting"""
        # Remove unwanted elements
        for selector in self.unwanted_elements:
            if selector.startswith('.'):
                # Class selector
                class_name = selector[1:]
                elements = soup.find_all(class_=class_name)
            else:
                # Tag selector
                elements = soup.find_all(selector)
            
            for elem in elements:
                elem.decompose()
        
        # Remove empty paragraphs
        empty_p_tags = soup.find_all('p', string=lambda text: not text or text.isspace())
        for p in empty_p_tags:
            p.decompose()
        
        # Fix image sources to be absolute URLs
        for img in soup.find_all('img'):
            src = img.get('src')
            if src and not src.startswith('http'):
                img['src'] = f"https://arxiv.org/html/{src}"
        
        # Add responsive classes to tables
        for table in soup.find_all('table'):
            table['class'] = table.get('class', []) + ['table', 'table-responsive']
        
        # Add classes to mathematical content
        for math in soup.find_all(['math', 'span'], class_='ltx_Math'):
            if 'ltx_Math' not in math.get('class', []):
                math['class'] = math.get('class', []) + ['ltx_Math']
        
        return soup
    
    def _extract_sections(self, soup: BeautifulSoup) -> list:
        """Extract paper sections for navigation"""
        sections = []
        
        # Look for section headers
        section_headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        for header in section_headers:
            if header.get_text().strip():
                section_id = header.get('id', '')
                if not section_id:
                    # Generate an ID from the text
                    section_id = re.sub(r'[^\w\s-]', '', header.get_text().strip().lower())
                    section_id = re.sub(r'[-\s]+', '-', section_id)
                    header['id'] = section_id
                
                sections.append({
                    'id': section_id,
                    'title': header.get_text().strip(),
                    'level': int(header.name[1])  # h1 -> 1, h2 -> 2, etc.
                })
        
        return sections
    
    def _has_mathematical_content(self, soup: BeautifulSoup) -> bool:
        """Check if the content contains mathematical expressions"""
        # Look for LaTeX math elements
        math_elements = soup.find_all(['math', 'span'], class_='ltx_Math')
        if math_elements:
            return True
        
        # Look for equation environments
        equation_elements = soup.find_all(['div', 'span'], class_=['ltx_equation', 'ltx_eqn_table'])
        if equation_elements:
            return True
        
        # Look for inline math patterns
        text_content = soup.get_text()
        math_patterns = [r'\$.*?\$', r'\\[a-zA-Z]+', r'\\begin\{.*?\}']
        for pattern in math_patterns:
            if re.search(pattern, text_content):
                return True
        
        return False
    
    def create_paper_summary(self, processed_data: Dict) -> Dict:
        """Create a summary view of the paper for list display"""
        if not processed_data.get('success'):
            return processed_data
        
        metadata = processed_data['metadata']
        
        # Extract first few sentences of content for preview
        soup = BeautifulSoup(processed_data['content'], 'html.parser')
        
        # Get text content and create preview
        text_content = soup.get_text()
        sentences = re.split(r'[.!?]+', text_content)
        preview = '. '.join(sentences[:3])[:300]
        if len(preview) < len(text_content):
            preview += "..."
        
        return {
            "arxiv_id": processed_data['arxiv_id'],
            "title": metadata.get('title', 'Unknown Title'),
            "authors": metadata.get('authors', []),
            "abstract": metadata.get('abstract', ''),
            "preview": preview,
            "sections": processed_data['sections'],
            "has_math": processed_data['has_math'],
            "date": metadata.get('date', '')
        }

if __name__ == "__main__":
    # Test the processor
    processor = HTMLProcessor()
    
    # Test with sample HTML (you would normally get this from arxiv_client)
    sample_html = """
    <html>
    <body>
        <div class="ltx_page_main">
            <h1 class="ltx_title">Sample Paper Title</h1>
            <div class="ltx_authors">
                <span class="ltx_author">Author One</span>
                <span class="ltx_author">Author Two</span>
            </div>
            <div class="ltx_abstract">
                <h6>Abstract</h6>
                <p>This is a sample abstract content.</p>
            </div>
            <section>
                <h2>Introduction</h2>
                <p>This is the introduction section.</p>
            </section>
        </div>
    </body>
    </html>
    """
    
    result = processor.process_arxiv_html("test123", sample_html)
    print("Processing result:", result['success'])
    if result['success']:
        summary = processor.create_paper_summary(result)
        print("Paper title:", summary['title'])
