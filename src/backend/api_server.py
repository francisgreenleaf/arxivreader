from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import os
from typing import Dict, List
from arxiv_client import ArxivClient
from html_processor import HTMLProcessor
from chatbot_service import ChatbotService, ChatbotConfig, ChatMessage
from chat_storage import ChatStorage
from paper_context_manager import PaperContextManager
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize clients
arxiv_client = ArxivClient()
html_processor = HTMLProcessor()

# Data storage paths
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
PREFERENCES_FILE = os.path.join(DATA_DIR, 'preferences.json')
CACHE_DIR = os.path.join(DATA_DIR, 'cache')

def ensure_data_directories():
    """Ensure data directories exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)

def load_preferences() -> Dict:
    """Load user preferences from file"""
    try:
        if os.path.exists(PREFERENCES_FILE):
            with open(PREFERENCES_FILE, 'r') as f:
                preferences = json.load(f)
                # Ensure theme preferences exist with defaults
                if 'theme_preferences' not in preferences:
                    preferences['theme_preferences'] = {
                        "selectedTheme": "light",
                        "customFontSize": 1.0,
                        "availableThemes": ["light", "dark", "academic"]
                    }
                # Ensure chatbot preferences exist with defaults
                if 'chatbot_config' not in preferences:
                    preferences['chatbot_config'] = {
                        "provider": "",
                        "api_key_encrypted": "",
                        "model": "",
                        "max_tokens": 4000,
                        "temperature": 0.7,
                        "is_configured": False
                    }
                return preferences
    except Exception as e:
        print(f"Error loading preferences: {e}")

    return {
        "keywords": [],
        "max_results": 50,
        "saved_papers": [],
        "theme_preferences": {
            "selectedTheme": "light",
            "customFontSize": 1.0,
            "availableThemes": ["light", "dark", "academic"]
        },
        "chatbot_config": {
            "provider": "",
            "api_key_encrypted": "",
            "model": "",
            "max_tokens": 4000,
            "temperature": 0.7,
            "is_configured": False
        }
    }

def save_preferences(preferences: Dict):
    """Save user preferences to file"""
    try:
        ensure_data_directories()
        with open(PREFERENCES_FILE, 'w') as f:
            json.dump(preferences, f, indent=2)
    except Exception as e:
        print(f"Error saving preferences: {e}")

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "ArXiv Reader API is running",
        "timestamp": time.time()
    })

@app.route('/api/preferences', methods=['GET'])
def get_preferences():
    """Get user preferences"""
    try:
        preferences = load_preferences()
        return jsonify({
            "success": True,
            "preferences": preferences
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/preferences', methods=['POST'])
def update_preferences():
    """Update user preferences"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        # Load current preferences and update
        preferences = load_preferences()
        preferences.update(data)
        
        # Save updated preferences
        save_preferences(preferences)
        
        return jsonify({
            "success": True,
            "preferences": preferences
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/search', methods=['POST'])
def search_papers():
    """Search for papers based on keywords"""
    try:
        data = request.get_json()
        
        if not data or 'keywords' not in data:
            return jsonify({
                "success": False,
                "error": "Keywords are required"
            }), 400
        
        keywords = data.get('keywords', [])
        max_results = data.get('max_results', 50)
        start = data.get('start', 0)
        
        if isinstance(keywords, str):
            keywords = [k.strip() for k in keywords.split(',')]
        
        # Search papers using arXiv client
        results = arxiv_client.search_papers(keywords, max_results, start)
        
        if 'error' in results:
            return jsonify({
                "success": False,
                "error": results['error']
            }), 500
        
        return jsonify({
            "success": True,
            "results": results,
            "search_params": {
                "keywords": keywords,
                "max_results": max_results,
                "start": start
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/paper/<arxiv_id>', methods=['GET'])
def get_paper_details(arxiv_id):
    """Get detailed information about a specific paper"""
    try:
        # Get paper metadata
        paper_result = arxiv_client.get_paper_details(arxiv_id)
        
        if 'error' in paper_result:
            return jsonify({
                "success": False,
                "error": paper_result['error']
            }), 404
        
        return jsonify({
            "success": True,
            "paper": paper_result['paper']
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/paper/<arxiv_id>/html', methods=['GET'])
def get_paper_html(arxiv_id):
    """Get HTML content for a paper"""
    try:
        # Check cache first
        cache_file = os.path.join(CACHE_DIR, f"{arxiv_id.replace('/', '_')}.json")
        
        if os.path.exists(cache_file):
            # Load from cache
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    cached_data['from_cache'] = True
                    return jsonify(cached_data)
            except:
                pass  # If cache is corrupted, fetch fresh
        
        # Fetch HTML content
        html_result = arxiv_client.fetch_html_content(arxiv_id)
        
        if not html_result['success']:
            return jsonify({
                "success": False,
                "error": html_result['error']
            }), 404
        
        # Process HTML content
        processed_result = html_processor.process_arxiv_html(
            arxiv_id, 
            html_result['content']
        )
        
        if not processed_result['success']:
            return jsonify({
                "success": False,
                "error": processed_result['error']
            }), 500
        
        # Cache the processed result
        try:
            ensure_data_directories()
            cache_data = {
                "success": True,
                "arxiv_id": arxiv_id,
                "processed_content": processed_result,
                "cached_at": time.time()
            }
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
        except Exception as e:
            print(f"Failed to cache HTML content: {e}")
        
        return jsonify({
            "success": True,
            "arxiv_id": arxiv_id,
            "processed_content": processed_result,
            "from_cache": False
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/saved-papers', methods=['GET'])
def get_saved_papers():
    """Get list of saved papers"""
    try:
        preferences = load_preferences()
        saved_papers = preferences.get('saved_papers', [])
        
        return jsonify({
            "success": True,
            "saved_papers": saved_papers
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/saved-papers', methods=['POST'])
def save_paper():
    """Save a paper to the user's collection"""
    try:
        data = request.get_json()
        
        if not data or 'arxiv_id' not in data:
            return jsonify({
                "success": False,
                "error": "arXiv ID is required"
            }), 400
        
        arxiv_id = data['arxiv_id']
        
        # Load current preferences
        preferences = load_preferences()
        saved_papers = preferences.get('saved_papers', [])
        
        # Check if already saved
        if arxiv_id not in saved_papers:
            saved_papers.append(arxiv_id)
            preferences['saved_papers'] = saved_papers
            save_preferences(preferences)
        
        return jsonify({
            "success": True,
            "message": "Paper saved successfully",
            "saved_papers": saved_papers
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/saved-papers/<arxiv_id>', methods=['DELETE'])
def remove_saved_paper(arxiv_id):
    """Remove a paper from saved collection"""
    try:
        # Load current preferences
        preferences = load_preferences()
        saved_papers = preferences.get('saved_papers', [])
        
        # Remove paper if exists
        if arxiv_id in saved_papers:
            saved_papers.remove(arxiv_id)
            preferences['saved_papers'] = saved_papers
            save_preferences(preferences)
        
        return jsonify({
            "success": True,
            "message": "Paper removed successfully",
            "saved_papers": saved_papers
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Clear the HTML content cache"""
    try:
        if os.path.exists(CACHE_DIR):
            import shutil
            shutil.rmtree(CACHE_DIR)
        ensure_data_directories()
        
        return jsonify({
            "success": True,
            "message": "Cache cleared successfully"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Initialize chatbot services
chat_storage = ChatStorage()
context_manager = PaperContextManager()

def get_chatbot_service() -> ChatbotService:
    """Get configured chatbot service instance"""
    preferences = load_preferences()
    chatbot_config = preferences.get('chatbot_config', {})
    
    if not chatbot_config.get('is_configured') or not chatbot_config.get('api_key_encrypted'):
        return None
    
    # Create temporary service to decrypt API key
    temp_service = ChatbotService()
    try:
        decrypted_key = temp_service.decrypt_api_key(chatbot_config['api_key_encrypted'])
        
        config = ChatbotConfig(
            provider=chatbot_config['provider'],
            api_key=decrypted_key,
            model=chatbot_config['model'],
            max_tokens=chatbot_config.get('max_tokens', 4000),
            temperature=chatbot_config.get('temperature', 0.7)
        )
        
        return ChatbotService(config)
    except Exception as e:
        print(f"Error creating chatbot service: {e}")
        return None

@app.route('/api/chatbot/configure', methods=['POST'])
def configure_chatbot():
    """Configure chatbot settings and API keys"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No configuration data provided"
            }), 400
        
        provider = data.get('provider')
        api_key = data.get('api_key')
        model = data.get('model')
        
        if not all([provider, api_key, model]):
            return jsonify({
                "success": False,
                "error": "Provider, API key, and model are required"
            }), 400
        
        # Validate API key
        chatbot_service = ChatbotService()
        if not chatbot_service.validate_api_key(provider, api_key):
            return jsonify({
                "success": False,
                "error": "Invalid API key or unable to connect to the service"
            }), 400
        
        # Encrypt API key for storage
        encrypted_key = chatbot_service.encrypt_api_key(api_key)
        
        # Load and update preferences
        preferences = load_preferences()
        preferences['chatbot_config'] = {
            "provider": provider,
            "api_key_encrypted": encrypted_key,
            "model": model,
            "max_tokens": data.get('max_tokens', 4000),
            "temperature": data.get('temperature', 0.7),
            "is_configured": True
        }
        
        save_preferences(preferences)
        
        return jsonify({
            "success": True,
            "message": "Chatbot configured successfully",
            "config": {
                "provider": provider,
                "model": model,
                "max_tokens": data.get('max_tokens', 4000),
                "temperature": data.get('temperature', 0.7),
                "is_configured": True
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/models/<provider>', methods=['GET'])
def get_available_models(provider):
    """Get available models for a provider"""
    try:
        chatbot_service = ChatbotService()
        models = chatbot_service.get_available_models(provider)
        
        return jsonify({
            "success": True,
            "models": models
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/validate-paper/<arxiv_id>', methods=['GET'])
def validate_paper_for_chat(arxiv_id):
    """Validate if paper is suitable for chat"""
    try:
        validation = context_manager.validate_paper_for_chat(arxiv_id)
        return jsonify({
            "success": True,
            "validation": validation
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/threads/<paper_id>', methods=['GET'])
def get_paper_threads(paper_id):
    """Get all chat threads for a paper"""
    try:
        threads = chat_storage.get_paper_threads(paper_id)
        
        return jsonify({
            "success": True,
            "threads": [thread.to_dict() for thread in threads]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/thread', methods=['POST'])
def create_chat_thread():
    """Create new chat thread"""
    try:
        data = request.get_json()
        
        if not data or 'paper_id' not in data or 'title' not in data:
            return jsonify({
                "success": False,
                "error": "Paper ID and title are required"
            }), 400
        
        paper_id = data['paper_id']
        title = data['title']
        
        # Validate paper first
        validation = context_manager.validate_paper_for_chat(paper_id)
        if not validation.get('valid'):
            return jsonify({
                "success": False,
                "error": validation.get('reason', 'Paper not suitable for chat')
            }), 400
        
        thread = chat_storage.create_thread(paper_id, title)
        
        return jsonify({
            "success": True,
            "thread": thread.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/thread/<thread_id>/history', methods=['GET'])
def get_thread_history(thread_id):
    """Get message history for a thread"""
    try:
        messages = chat_storage.get_thread_history(thread_id)
        
        return jsonify({
            "success": True,
            "messages": [msg.to_dict() for msg in messages]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/send', methods=['POST'])
def send_chat_message():
    """Send message to chatbot"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data or 'thread_id' not in data:
            return jsonify({
                "success": False,
                "error": "Message and thread ID are required"
            }), 400
        
        user_message = data['message']
        thread_id = data['thread_id']
        
        # Get chatbot service
        chatbot_service = get_chatbot_service()
        if not chatbot_service:
            return jsonify({
                "success": False,
                "error": "Chatbot not configured. Please configure your API keys in settings."
            }), 400
        
        # Extract paper ID from thread ID
        parts = thread_id.split('_')
        if len(parts) < 3:
            return jsonify({
                "success": False,
                "error": "Invalid thread ID"
            }), 400
        
        paper_id = '_'.join(parts[1:-1])
        
        # Get paper context
        context = context_manager.extract_paper_context(paper_id)
        
        # Get conversation history
        history = chat_storage.get_thread_history(thread_id)
        
        # Create user message
        user_msg = ChatMessage(
            id=f"msg_{int(time.time() * 1000)}",
            thread_id=thread_id,
            role="user",
            content=user_message,
            timestamp=time.time()
        )
        
        # Save user message
        chat_storage.save_message(thread_id, user_msg)
        
        # Get AI response
        ai_response = chatbot_service.send_message(user_message, context, history)
        
        # Save AI response
        chat_storage.save_message(thread_id, ai_response)
        
        return jsonify({
            "success": True,
            "user_message": user_msg.to_dict(),
            "ai_response": ai_response.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/stream', methods=['POST'])
def stream_chat_message():
    """Stream chatbot response"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data or 'thread_id' not in data:
            return jsonify({
                "success": False,
                "error": "Message and thread ID are required"
            }), 400
        
        user_message = data['message']
        thread_id = data['thread_id']
        
        # Get chatbot service
        chatbot_service = get_chatbot_service()
        if not chatbot_service:
            return jsonify({
                "success": False,
                "error": "Chatbot not configured"
            }), 400
        
        # Extract paper ID from thread ID
        parts = thread_id.split('_')
        if len(parts) < 3:
            return jsonify({
                "success": False,
                "error": "Invalid thread ID"
            }), 400
        
        paper_id = '_'.join(parts[1:-1])
        
        # Get paper context and history
        context = context_manager.extract_paper_context(paper_id)
        history = chat_storage.get_thread_history(thread_id)
        
        # Save user message
        user_msg = ChatMessage(
            id=f"msg_{int(time.time() * 1000)}",
            thread_id=thread_id,
            role="user",
            content=user_message,
            timestamp=time.time()
        )
        chat_storage.save_message(thread_id, user_msg)
        
        def generate_response():
            full_response = ""
            try:
                for chunk in chatbot_service.stream_response(user_message, context, history):
                    full_response += chunk
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                # Save complete response
                ai_msg = ChatMessage(
                    id=f"msg_{int(time.time() * 1000)}",
                    thread_id=thread_id,
                    role="assistant",
                    content=full_response,
                    timestamp=time.time()
                )
                chat_storage.save_message(thread_id, ai_msg)
                
                yield f"data: {json.dumps({'done': True, 'message_id': ai_msg.id})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(generate_response(), mimetype='text/event-stream')
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/thread/<thread_id>', methods=['DELETE'])
def delete_chat_thread(thread_id):
    """Delete a chat thread"""
    try:
        chat_storage.delete_thread(thread_id)
        
        return jsonify({
            "success": True,
            "message": "Thread deleted successfully"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/thread/<thread_id>/export', methods=['GET'])
def export_chat_thread(thread_id):
    """Export chat thread"""
    try:
        format_type = request.args.get('format', 'json')
        
        export_data = chat_storage.export_thread(thread_id, format_type)
        
        return jsonify({
            "success": True,
            "export_data": export_data,
            "format": format_type
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/chatbot/stats', methods=['GET'])
def get_chat_stats():
    """Get chatbot usage statistics"""
    try:
        stats = chat_storage.get_stats()
        
        return jsonify({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500

if __name__ == '__main__':
    # Initialize data directories
    ensure_data_directories()
    
    # Run the server
    print("Starting ArXiv Reader API server...")
    print("API will be available at: http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)
