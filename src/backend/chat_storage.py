"""
Chat Storage for ArXiv Reader
Handles conversation persistence and thread management
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from chatbot_service import ChatMessage

@dataclass
class ChatThread:
    """Chat thread metadata"""
    id: str
    paper_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    is_active: bool = True
    
    def to_dict(self):
        return {
            'id': self.id,
            'paper_id': self.paper_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at,
            'message_count': self.message_count,
            'is_active': self.is_active
        }
    
    @classmethod
    def from_dict(cls, data: Dict):
        created_at = data['created_at']
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        updated_at = data['updated_at']
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
            
        return cls(
            id=data['id'],
            paper_id=data['paper_id'],
            title=data['title'],
            created_at=created_at,
            updated_at=updated_at,
            message_count=data.get('message_count', 0),
            is_active=data.get('is_active', True)
        )

class ChatStorage:
    """Manages chat thread and message persistence"""
    
    def __init__(self, base_path: str = "data/chat_history"):
        self.base_path = base_path
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure chat storage directories exist"""
        os.makedirs(self.base_path, exist_ok=True)
    
    def _get_paper_dir(self, paper_id: str) -> str:
        """Get directory path for a paper's chat data"""
        paper_dir = os.path.join(self.base_path, paper_id)
        os.makedirs(paper_dir, exist_ok=True)
        return paper_dir
    
    def _get_thread_file(self, paper_id: str, thread_id: str) -> str:
        """Get file path for thread data"""
        paper_dir = self._get_paper_dir(paper_id)
        return os.path.join(paper_dir, f"{thread_id}.json")
    
    def _get_thread_index_file(self, paper_id: str) -> str:
        """Get file path for thread index"""
        paper_dir = self._get_paper_dir(paper_id)
        return os.path.join(paper_dir, "threads.json")
    
    def create_thread(self, paper_id: str, title: str) -> ChatThread:
        """Create new conversation thread"""
        thread_id = f"thread_{paper_id}_{int(time.time() * 1000)}"
        now = datetime.now()
        
        thread = ChatThread(
            id=thread_id,
            paper_id=paper_id,
            title=title,
            created_at=now,
            updated_at=now,
            message_count=0,
            is_active=True
        )
        
        # Update thread index
        self._update_thread_index(paper_id, thread)
        
        # Create empty thread file
        thread_file = self._get_thread_file(paper_id, thread_id)
        thread_data = {
            'thread': thread.to_dict(),
            'messages': []
        }
        
        with open(thread_file, 'w') as f:
            json.dump(thread_data, f, indent=2)
        
        return thread
    
    def _update_thread_index(self, paper_id: str, thread: ChatThread):
        """Update thread index for a paper"""
        index_file = self._get_thread_index_file(paper_id)
        
        # Load existing index
        threads_index = []
        if os.path.exists(index_file):
            try:
                with open(index_file, 'r') as f:
                    threads_data = json.load(f)
                    threads_index = threads_data.get('threads', [])
            except:
                threads_index = []
        
        # Update or add thread
        updated = False
        for i, existing_thread in enumerate(threads_index):
            if existing_thread['id'] == thread.id:
                threads_index[i] = thread.to_dict()
                updated = True
                break
        
        if not updated:
            threads_index.append(thread.to_dict())
        
        # Sort by updated_at (most recent first)
        threads_index.sort(key=lambda x: x['updated_at'], reverse=True)
        
        # Save updated index
        with open(index_file, 'w') as f:
            json.dump({'threads': threads_index}, f, indent=2)
    
    def save_message(self, thread_id: str, message: ChatMessage):
        """Save message to thread"""
        # Extract paper_id from thread_id (format: thread_paperid_timestamp)
        parts = thread_id.split('_')
        if len(parts) >= 3:
            paper_id = '_'.join(parts[1:-1])  # Handle paper IDs with underscores
        else:
            raise ValueError(f"Invalid thread_id format: {thread_id}")
        
        thread_file = self._get_thread_file(paper_id, thread_id)
        
        # Load existing thread data
        if os.path.exists(thread_file):
            with open(thread_file, 'r') as f:
                thread_data = json.load(f)
        else:
            # Create new thread if it doesn't exist
            thread_data = {
                'thread': {
                    'id': thread_id,
                    'paper_id': paper_id,
                    'title': 'New Conversation',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'message_count': 0,
                    'is_active': True
                },
                'messages': []
            }
        
        # Add message
        thread_data['messages'].append(message.to_dict())
        
        # Update thread metadata
        thread_data['thread']['updated_at'] = datetime.now().isoformat()
        thread_data['thread']['message_count'] = len(thread_data['messages'])
        
        # Save updated thread
        with open(thread_file, 'w') as f:
            json.dump(thread_data, f, indent=2)
        
        # Update thread index
        thread = ChatThread.from_dict(thread_data['thread'])
        self._update_thread_index(paper_id, thread)
    
    def get_thread_history(self, thread_id: str) -> List[ChatMessage]:
        """Get all messages from a thread"""
        # Extract paper_id from thread_id
        parts = thread_id.split('_')
        if len(parts) >= 3:
            paper_id = '_'.join(parts[1:-1])
        else:
            return []
        
        thread_file = self._get_thread_file(paper_id, thread_id)
        
        if not os.path.exists(thread_file):
            return []
        
        try:
            with open(thread_file, 'r') as f:
                thread_data = json.load(f)
            
            messages = []
            for msg_data in thread_data.get('messages', []):
                messages.append(ChatMessage.from_dict(msg_data))
            
            return messages
        except:
            return []
    
    def get_paper_threads(self, paper_id: str) -> List[ChatThread]:
        """Get all threads for a paper"""
        index_file = self._get_thread_index_file(paper_id)
        
        if not os.path.exists(index_file):
            return []
        
        try:
            with open(index_file, 'r') as f:
                threads_data = json.load(f)
            
            threads = []
            for thread_data in threads_data.get('threads', []):
                threads.append(ChatThread.from_dict(thread_data))
            
            return threads
        except:
            return []
    
    def get_thread(self, thread_id: str) -> Optional[ChatThread]:
        """Get specific thread metadata"""
        # Extract paper_id from thread_id
        parts = thread_id.split('_')
        if len(parts) >= 3:
            paper_id = '_'.join(parts[1:-1])
        else:
            return None
        
        thread_file = self._get_thread_file(paper_id, thread_id)
        
        if not os.path.exists(thread_file):
            return None
        
        try:
            with open(thread_file, 'r') as f:
                thread_data = json.load(f)
            
            return ChatThread.from_dict(thread_data['thread'])
        except:
            return None
    
    def delete_thread(self, thread_id: str):
        """Delete a thread and its messages"""
        # Extract paper_id from thread_id
        parts = thread_id.split('_')
        if len(parts) >= 3:
            paper_id = '_'.join(parts[1:-1])
        else:
            return
        
        thread_file = self._get_thread_file(paper_id, thread_id)
        
        # Remove thread file
        if os.path.exists(thread_file):
            os.remove(thread_file)
        
        # Update thread index
        index_file = self._get_thread_index_file(paper_id)
        if os.path.exists(index_file):
            try:
                with open(index_file, 'r') as f:
                    threads_data = json.load(f)
                
                # Remove thread from index
                threads_index = threads_data.get('threads', [])
                threads_index = [t for t in threads_index if t['id'] != thread_id]
                
                with open(index_file, 'w') as f:
                    json.dump({'threads': threads_index}, f, indent=2)
            except:
                pass
    
    def update_thread_title(self, thread_id: str, new_title: str):
        """Update thread title"""
        # Extract paper_id from thread_id
        parts = thread_id.split('_')
        if len(parts) >= 3:
            paper_id = '_'.join(parts[1:-1])
        else:
            return
        
        thread_file = self._get_thread_file(paper_id, thread_id)
        
        if not os.path.exists(thread_file):
            return
        
        try:
            with open(thread_file, 'r') as f:
                thread_data = json.load(f)
            
            thread_data['thread']['title'] = new_title
            thread_data['thread']['updated_at'] = datetime.now().isoformat()
            
            with open(thread_file, 'w') as f:
                json.dump(thread_data, f, indent=2)
            
            # Update thread index
            thread = ChatThread.from_dict(thread_data['thread'])
            self._update_thread_index(paper_id, thread)
            
        except:
            pass
    
    def export_thread(self, thread_id: str, format_type: str = "json") -> str:
        """Export thread conversation"""
        messages = self.get_thread_history(thread_id)
        thread = self.get_thread(thread_id)
        
        if format_type == "json":
            export_data = {
                'thread': thread.to_dict() if thread else {},
                'messages': [msg.to_dict() for msg in messages]
            }
            return json.dumps(export_data, indent=2)
        
        elif format_type == "text":
            if not thread:
                return "Thread not found"
            
            export_text = f"ArXiv Reader Chat Export\n"
            export_text += f"Paper ID: {thread.paper_id}\n"
            export_text += f"Thread: {thread.title}\n"
            export_text += f"Created: {thread.created_at}\n"
            export_text += f"Messages: {len(messages)}\n\n"
            export_text += "=" * 50 + "\n\n"
            
            for msg in messages:
                timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M:%S") if isinstance(msg.timestamp, datetime) else str(msg.timestamp)
                export_text += f"[{timestamp}] {msg.role.upper()}:\n"
                export_text += f"{msg.content}\n\n"
            
            return export_text
        
        elif format_type == "markdown":
            if not thread:
                return "# Thread not found"
            
            export_md = f"# ArXiv Reader Chat Export\n\n"
            export_md += f"**Paper ID:** {thread.paper_id}  \n"
            export_md += f"**Thread:** {thread.title}  \n"
            export_md += f"**Created:** {thread.created_at}  \n"
            export_md += f"**Messages:** {len(messages)}\n\n"
            export_md += "---\n\n"
            
            for msg in messages:
                timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M:%S") if isinstance(msg.timestamp, datetime) else str(msg.timestamp)
                role_emoji = "🤖" if msg.role == "assistant" else "👤"
                export_md += f"## {role_emoji} {msg.role.title()} - {timestamp}\n\n"
                export_md += f"{msg.content}\n\n"
            
            return export_md
        
        return "Unsupported format"
    
    def get_stats(self) -> Dict:
        """Get chat storage statistics"""
        stats = {
            'total_papers': 0,
            'total_threads': 0,
            'total_messages': 0,
            'papers': {}
        }
        
        if not os.path.exists(self.base_path):
            return stats
        
        # Count papers and threads
        for paper_dir in os.listdir(self.base_path):
            paper_path = os.path.join(self.base_path, paper_dir)
            if os.path.isdir(paper_path):
                stats['total_papers'] += 1
                
                # Count threads and messages for this paper
                paper_threads = self.get_paper_threads(paper_dir)
                thread_count = len(paper_threads)
                message_count = sum(thread.message_count for thread in paper_threads)
                
                stats['total_threads'] += thread_count
                stats['total_messages'] += message_count
                
                stats['papers'][paper_dir] = {
                    'threads': thread_count,
                    'messages': message_count
                }
        
        return stats

if __name__ == "__main__":
    # Test the storage system
    print("ChatStorage module loaded successfully")
