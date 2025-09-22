"""
Paper Context Manager for ArXiv Reader Chatbot
Handles paper content extraction and context preparation for AI conversations
"""

import re
import json
from typing import Dict, List, Optional
from chatbot_service import PaperContext
from html_processor import HTMLProcessor
from arxiv_client import ArxivClient
from bs4 import BeautifulSoup

class PaperContextManager:
    """Manages paper content extraction and context preparation for AI conversations"""
    
    def __init__(self):
        self.html_processor = HTMLProcessor()
        self.arxiv_client = ArxivClient()
    
    def extract_paper_context(self, arxiv_id: str) -> PaperContext:
        """Extract comprehensive paper context for AI conversations"""
        try:
            # Get paper details from ArXiv API
            paper_details = self.arxiv_client.get_paper_details(arxiv_id)
            
            if not paper_details:
                raise Exception(f"Could not fetch paper details for {arxiv_id}")
            
            # Get HTML content if available
            html_content = ""
            sections = []
            
            if self.arxiv_client.check_html_availability(arxiv_id):
                html_data = self.arxiv_client.fetch_html_content(arxiv_id)
                if html_data and html_data.get('success'):
                    processed_html = self.html_processor.process_arxiv_html(
                        arxiv_id, html_data['content']
                    )
                    html_content = processed_html.get('cleaned_content', '')
                    sections = processed_html.get('sections', [])
            
            # Extract text content from HTML for context
            content_text = self._extract_text_from_html(html_content) if html_content else paper_details.get('abstract', '')
            
            # Extract references if available
            references = self._extract_references(html_content) if html_content else []
            
            # Create paper context
            context = PaperContext(
                arxiv_id=arxiv_id,
                title=paper_details.get('title', ''),
                authors=paper_details.get('authors', []),
                abstract=paper_details.get('abstract', ''),
                content=content_text,
                sections=sections,
                references=references
            )
            
            return context
            
        except Exception as e:
            raise Exception(f"Failed to extract paper context: {str(e)}")
    
    def _extract_text_from_html(self, html_content: str) -> str:
        """Extract clean text from HTML content"""
        if not html_content:
            return ""
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text and clean it up
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text
            
        except Exception as e:
            print(f"Error extracting text from HTML: {e}")
            return ""
    
    def _extract_references(self, html_content: str) -> List[str]:
        """Extract references from HTML content"""
        references = []
        
        if not html_content:
            return references
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Look for reference sections
            ref_sections = soup.find_all(['section', 'div'], class_=re.compile(r'.*ref.*|.*bib.*', re.I))
            
            for section in ref_sections:
                # Extract reference items
                ref_items = section.find_all(['li', 'div', 'p'])
                
                for item in ref_items:
                    ref_text = item.get_text().strip()
                    if ref_text and len(ref_text) > 20:  # Filter out short non-reference text
                        references.append(ref_text)
            
            # Limit references to avoid context overflow
            return references[:20]
            
        except Exception as e:
            print(f"Error extracting references: {e}")
            return []
    
    def search_related_papers(self, query: str, limit: int = 5) -> List[Dict]:
        """Search for related papers using ArXiv API"""
        try:
            # Use existing search functionality
            keywords = [keyword.strip() for keyword in query.split() if len(keyword.strip()) > 2]
            
            if not keywords:
                return []
            
            search_results = self.arxiv_client.search_papers(keywords, max_results=limit)
            
            if search_results and search_results.get('success'):
                # Filter and format results
                papers = []
                for paper in search_results.get('papers', []):
                    papers.append({
                        'id': paper.get('id'),
                        'title': paper.get('title'),
                        'authors': paper.get('authors'),
                        'abstract': paper.get('abstract')[:200] + '...' if len(paper.get('abstract', '')) > 200 else paper.get('abstract'),
                        'published': paper.get('published'),
                        'categories': paper.get('categories')
                    })
                
                return papers
            
            return []
            
        except Exception as e:
            print(f"Error searching related papers: {e}")
            return []
    
    def prepare_context_prompt(self, paper: PaperContext, user_query: str) -> str:
        """Prepare optimized context prompt for AI with token management"""
        
        # Base context with paper metadata
        context = f"""Paper: {paper.title}
Authors: {', '.join(paper.authors)}
ArXiv ID: {paper.arxiv_id}

Abstract:
{paper.abstract}

"""
        
        # Add sections overview if available
        if paper.sections and len(paper.sections) > 0:
            context += "Paper Structure:\n"
            for i, section in enumerate(paper.sections[:10]):  # Limit sections
                context += f"{i+1}. {section.get('title', 'Untitled Section')}\n"
            context += "\n"
        
        # Add relevant content based on query
        relevant_content = self._extract_relevant_content(paper, user_query)
        if relevant_content:
            context += f"Relevant Content:\n{relevant_content}\n\n"
        
        # Add query-specific instructions
        context += f"User Question: {user_query}\n\n"
        context += """Instructions:
- Answer based on the provided paper content
- Be specific and cite relevant sections when possible
- If the paper doesn't contain information to answer the question, say so clearly
- Use technical language appropriate for academic discussion
- Format mathematical expressions clearly if relevant
"""
        
        return context
    
    def _extract_relevant_content(self, paper: PaperContext, query: str) -> str:
        """Extract content relevant to user query"""
        if not paper.content or not query:
            return ""
        
        # Simple keyword-based relevance extraction
        query_keywords = set(query.lower().split())
        content_sentences = paper.content.split('.')
        
        relevant_sentences = []
        
        for sentence in content_sentences:
            sentence = sentence.strip()
            if len(sentence) < 20:  # Skip very short sentences
                continue
            
            sentence_lower = sentence.lower()
            
            # Check for keyword matches
            matches = sum(1 for keyword in query_keywords if keyword in sentence_lower)
            
            if matches > 0:
                relevant_sentences.append((sentence, matches))
        
        # Sort by relevance and take top sentences
        relevant_sentences.sort(key=lambda x: x[1], reverse=True)
        
        # Take top sentences up to a reasonable length
        selected_content = []
        total_length = 0
        max_length = 3000  # Token limit consideration
        
        for sentence, _ in relevant_sentences:
            if total_length + len(sentence) > max_length:
                break
            selected_content.append(sentence)
            total_length += len(sentence)
        
        return '. '.join(selected_content) + '.' if selected_content else ""
    
    def get_paper_summary(self, arxiv_id: str) -> Dict:
        """Get a structured summary of the paper for display"""
        try:
            context = self.extract_paper_context(arxiv_id)
            
            summary = {
                'id': context.arxiv_id,
                'title': context.title,
                'authors': context.authors,
                'abstract': context.abstract,
                'sections': len(context.sections) if context.sections else 0,
                'has_content': bool(context.content and len(context.content) > 100),
                'references': len(context.references) if context.references else 0,
                'content_preview': context.content[:300] + '...' if context.content and len(context.content) > 300 else context.content
            }
            
            return summary
            
        except Exception as e:
            return {
                'error': str(e),
                'id': arxiv_id
            }
    
    def validate_paper_for_chat(self, arxiv_id: str) -> Dict:
        """Validate if paper is suitable for chat (has HTML content)"""
        try:
            # Check if paper exists
            paper_details = self.arxiv_client.get_paper_details(arxiv_id)
            if not paper_details:
                return {
                    'valid': False,
                    'reason': 'Paper not found or inaccessible'
                }
            
            # Check HTML availability
            has_html = self.arxiv_client.check_html_availability(arxiv_id)
            if not has_html:
                return {
                    'valid': False,
                    'reason': 'Paper does not have HTML content available. Chat is only available for papers with HTML versions.'
                }
            
            # Try to extract some content
            try:
                context = self.extract_paper_context(arxiv_id)
                if not context.content or len(context.content.strip()) < 100:
                    return {
                        'valid': False,
                        'reason': 'Paper content could not be extracted or is too short for meaningful conversation'
                    }
            except Exception as e:
                return {
                    'valid': False,
                    'reason': f'Failed to process paper content: {str(e)}'
                }
            
            return {
                'valid': True,
                'title': paper_details.get('title'),
                'authors': paper_details.get('authors')
            }
            
        except Exception as e:
            return {
                'valid': False,
                'reason': f'Error validating paper: {str(e)}'
            }

if __name__ == "__main__":
    # Test the context manager
    print("PaperContextManager module loaded successfully")
