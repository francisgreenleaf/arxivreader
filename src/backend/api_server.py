from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from typing import Dict, List
from arxiv_client import ArxivClient
from html_processor import HTMLProcessor
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
                return json.load(f)
    except Exception as e:
        print(f"Error loading preferences: {e}")
    
    return {"keywords": [], "max_results": 50, "saved_papers": []}

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
