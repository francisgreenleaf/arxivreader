"""
Chatbot Service for ArXiv Reader
Handles AI API integrations with OpenAI and Anthropic
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Iterator, Optional
from dataclasses import dataclass, asdict
import tiktoken
import openai
import anthropic
from cryptography.fernet import Fernet
import os

@dataclass
class ChatbotConfig:
    """Configuration for chatbot service"""
    provider: str  # "openai" or "anthropic"
    api_key: str
    model: str
    max_tokens: int = 4000
    temperature: float = 0.7
    
@dataclass
class ChatMessage:
    """Individual chat message"""
    id: str
    thread_id: str
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: datetime
    metadata: Dict = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'thread_id': self.thread_id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            'metadata': self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict):
        timestamp = data['timestamp']
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        return cls(
            id=data['id'],
            thread_id=data['thread_id'],
            role=data['role'],
            content=data['content'],
            timestamp=timestamp,
            metadata=data.get('metadata', {})
        )

@dataclass
class PaperContext:
    """Paper context for AI conversations"""
    arxiv_id: str
    title: str
    authors: List[str]
    abstract: str
    content: str
    sections: List[Dict] = None
    references: List[str] = None
    
    def to_context_string(self) -> str:
        """Convert paper context to formatted string for AI"""
        context = f"""Paper Information:
Title: {self.title}
Authors: {', '.join(self.authors)}
ArXiv ID: {self.arxiv_id}

Abstract:
{self.abstract}

Content:
{self.content[:8000]}...  # Truncate for token limits
"""
        if self.sections:
            context += "\n\nSections:\n"
            for section in self.sections[:10]:  # Limit sections
                context += f"- {section.get('title', 'Untitled')}\n"
                
        return context

class ChatbotService:
    """Main chatbot service handling AI API integrations"""
    
    def __init__(self, config: ChatbotConfig = None):
        self.config = config
        self._openai_client = None
        self._anthropic_client = None
        self._encryption_key = self._get_or_create_encryption_key()
        
        if config:
            self._initialize_client()
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for API keys"""
        key_file = os.path.join('data', '.chatbot_key')
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            os.makedirs('data', exist_ok=True)
            with open(key_file, 'wb') as f:
                f.write(key)
            return key
    
    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt API key for secure storage"""
        f = Fernet(self._encryption_key)
        return f.encrypt(api_key.encode()).decode()
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt API key for use"""
        f = Fernet(self._encryption_key)
        return f.decrypt(encrypted_key.encode()).decode()
    
    def _initialize_client(self):
        """Initialize the appropriate AI client"""
        if not self.config:
            return
            
        if self.config.provider == "openai":
            self._openai_client = openai.OpenAI(api_key=self.config.api_key)
        elif self.config.provider == "anthropic":
            self._anthropic_client = anthropic.Anthropic(api_key=self.config.api_key)
    
    def validate_api_key(self, provider: str, api_key: str) -> bool:
        """Validate API key by making a test call"""
        try:
            if provider == "openai":
                client = openai.OpenAI(api_key=api_key)
                # Test with minimal request
                client.models.list()
                return True
            elif provider == "anthropic":
                client = anthropic.Anthropic(api_key=api_key)
                # Test with minimal message
                client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=1,
                    messages=[{"role": "user", "content": "Hi"}]
                )
                return True
        except Exception as e:
            print(f"API key validation failed: {e}")
            return False
        return False
    
    def get_available_models(self, provider: str) -> List[str]:
        """Get available models for a provider"""
        if provider == "openai":
            return [
                "gpt-4-turbo-preview",
                "gpt-4",
                "gpt-3.5-turbo",
                "gpt-3.5-turbo-16k"
            ]
        elif provider == "anthropic":
            return [
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307"
            ]
        return []
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text (approximation for Anthropic, exact for OpenAI)"""
        if self.config.provider == "openai":
            try:
                encoding = tiktoken.encoding_for_model(self.config.model)
                return len(encoding.encode(text))
            except:
                # Fallback approximation
                return len(text) // 4
        else:
            # Anthropic approximation
            return len(text) // 4
    
    def _prepare_messages(self, user_message: str, context: PaperContext, history: List[ChatMessage]) -> List[Dict]:
        """Prepare messages for AI API call"""
        messages = []
        
        # System message with paper context
        system_content = f"""You are an AI assistant helping users understand and discuss academic papers from arXiv. You have access to the full content of a paper and can answer questions about it in detail.

Current Paper Context:
{context.to_context_string()}

Instructions:
- Answer questions directly related to this paper using the provided content
- If asked about concepts not in the paper, provide general academic knowledge but mention the limitation
- You can reference specific sections, equations, figures, or results from the paper
- If the user asks about other papers, note that you only have access to this current paper's content
- Be precise and cite specific parts of the paper when relevant
- If mathematical content is discussed, format it clearly"""
        
        if self.config.provider == "openai":
            messages.append({"role": "system", "content": system_content})
        
        # Add conversation history (limited by token count)
        max_history_tokens = 2000
        current_tokens = self._count_tokens(system_content + user_message)
        
        for msg in history[-10:]:  # Last 10 messages max
            msg_tokens = self._count_tokens(msg.content)
            if current_tokens + msg_tokens > max_history_tokens:
                break
            messages.append({"role": msg.role, "content": msg.content})
            current_tokens += msg_tokens
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # For Anthropic, handle system message differently
        if self.config.provider == "anthropic":
            # Remove system message and return it separately
            anthropic_messages = [m for m in messages if m["role"] != "system"]
            return anthropic_messages, system_content
        
        return messages
    
    def send_message(self, user_message: str, context: PaperContext, history: List[ChatMessage] = None) -> ChatMessage:
        """Send message to AI and get response"""
        if not self.config or not self._openai_client and not self._anthropic_client:
            raise Exception("Chatbot not configured")
        
        history = history or []
        
        try:
            if self.config.provider == "openai":
                messages = self._prepare_messages(user_message, context, history)
                
                response = self._openai_client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature
                )
                
                assistant_message = response.choices[0].message.content
                
            elif self.config.provider == "anthropic":
                messages, system_content = self._prepare_messages(user_message, context, history)
                
                response = self._anthropic_client.messages.create(
                    model=self.config.model,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    system=system_content,
                    messages=messages
                )
                
                assistant_message = response.content[0].text
                
            # Create response message
            response_msg = ChatMessage(
                id=f"msg_{int(time.time() * 1000)}",
                thread_id=history[0].thread_id if history else f"thread_{int(time.time())}",
                role="assistant",
                content=assistant_message,
                timestamp=datetime.now(),
                metadata={
                    "model": self.config.model,
                    "provider": self.config.provider,
                    "paper_id": context.arxiv_id
                }
            )
            
            return response_msg
            
        except Exception as e:
            raise Exception(f"Failed to get AI response: {str(e)}")
    
    def stream_response(self, user_message: str, context: PaperContext, history: List[ChatMessage] = None) -> Iterator[str]:
        """Stream AI response for real-time display"""
        if not self.config:
            raise Exception("Chatbot not configured")
        
        history = history or []
        
        try:
            if self.config.provider == "openai":
                messages = self._prepare_messages(user_message, context, history)
                
                stream = self._openai_client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    stream=True
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                        
            elif self.config.provider == "anthropic":
                messages, system_content = self._prepare_messages(user_message, context, history)
                
                with self._anthropic_client.messages.stream(
                    model=self.config.model,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    system=system_content,
                    messages=messages
                ) as stream:
                    for text in stream.text_stream:
                        yield text
                        
        except Exception as e:
            yield f"Error: {str(e)}"

if __name__ == "__main__":
    # Test the service
    print("ChatbotService module loaded successfully")
