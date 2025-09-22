# ArXiv Reader

A modern web application for browsing and reading arXiv research papers with beautiful HTML formatting. Search papers by keywords, view them with proper formatting, save papers for later reading, and now **discuss papers with AI** through integrated chatbot functionality.

## Features

### Core Features
- 🔍 **Smart Search**: Search arXiv papers using keywords with advanced filtering
- 📄 **HTML Rendering**: View papers in clean, formatted HTML (when available)  
- 🎯 **Keyword Management**: Save and manage your research interests
- 💾 **Paper Bookmarking**: Save papers for later reading
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- ⚡ **Fast Caching**: Intelligent caching system for quick paper loading
- 🧮 **Math Support**: Proper rendering of mathematical equations via MathJax

### 🤖 NEW: AI Chatbot Integration
- **Paper Discussions**: Chat with AI about specific papers using OpenAI GPT or Anthropic Claude
- **Context Awareness**: AI has full access to paper content, sections, and metadata
- **Multiple Conversations**: Create multiple chat threads per paper
- **Conversation History**: Persistent chat history with export capabilities
- **Secure API Keys**: Encrypted storage of API credentials
- **Real-time Streaming**: Live streaming responses for natural conversation flow
- **Model Selection**: Choose from latest GPT-4, Claude-3, and other advanced models

### 🎨 NEW: Theme System
- **Multiple Themes**: Choose from Light, Dark, and Academic themes
- **Dynamic Switching**: Change themes instantly without page reload
- **Consistent Design**: Themes apply across all components including chat interface
- **User Preferences**: Theme selection persists between sessions

## Architecture

- **Backend**: Python with Flask API server for arXiv integration
- **Frontend**: Node.js with Express serving a modern web interface
- **Storage**: JSON file-based preferences and caching
- **API Integration**: Direct integration with arXiv API for paper search and retrieval

## Prerequisites

- **Node.js** (v18.0.0 or higher)
- **Python** (v3.8 or higher)
- **pnpm** (v8.0.0 or higher)

## Installation

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies
pip3 install -r requirements.txt
```

### 2. Start the Application

You need to run both the Python backend and Node.js frontend:

**Terminal 1 - Start Python Backend:**
```bash
pnpm backend
```
This starts the Flask API server on http://localhost:5000

**Terminal 2 - Start Node.js Frontend:**
```bash
pnpm start
```
This starts the web interface on http://localhost:3000

### 3. Open Your Browser

Navigate to http://localhost:3000 and start exploring arXiv papers!

## Usage

### Getting Started

1. **Add Keywords**: Enter research topics you're interested in (e.g., "machine learning", "neural networks")
2. **Search Papers**: Click "Search Papers" to find relevant research
3. **Browse Results**: View paper summaries with abstracts and metadata
4. **Read Papers**: Click on papers to view detailed information or HTML content
5. **Save Papers**: Bookmark interesting papers for later reading

### Key Features

#### Keyword Management
- Add keywords related to your research interests
- Keywords are automatically saved and persist between sessions
- Remove keywords by clicking the × button

#### Paper Viewing
- **Summary View**: See title, authors, abstract, and metadata
- **HTML View**: Read full papers with proper formatting (when available)
- **PDF Links**: Direct links to original arXiv PDFs
- **Categories**: View arXiv subject classifications

#### 🤖 AI Chatbot (NEW)
To use the AI chatbot feature:

1. **Configure API**: Go to Settings → Chatbot Configuration
2. **Choose Provider**: Select OpenAI or Anthropic
3. **Add API Key**: Enter your API key (stored securely with encryption)
4. **Select Model**: Choose from available models (GPT-4, Claude-3, etc.)
5. **Start Chatting**: Open any paper and click the "Chat" button

**Chatbot Features:**
- **Contextual Understanding**: AI has full access to the current paper's content
- **Multi-threading**: Create multiple conversation threads per paper
- **Streaming Responses**: Real-time message streaming for natural flow
- **History Management**: All conversations are saved and can be revisited
- **Export Options**: Export conversations for sharing or archiving

#### 🎨 Theme System (NEW)
- **Theme Selection**: Choose themes via Settings or the theme toggle button
- **Available Themes**:
  - **Light**: Clean, bright interface perfect for daytime reading
  - **Dark**: Easy on the eyes for low-light environments
  - **Academic**: Traditional academic styling with serif fonts
- **Persistent Preferences**: Theme choice is saved and applied on startup
- **Chat Integration**: Themes apply consistently across the chat interface

#### Settings
- Adjust maximum results per search
- Manage default keywords
- Configure chatbot API keys and models
- Select preferred theme
- Clear cached content to free up space

## API Endpoints

The application provides a RESTful API:

### Core Endpoints
- `GET /api/preferences` - Get user preferences
- `POST /api/preferences` - Update user preferences
- `POST /api/search` - Search for papers
- `GET /api/paper/:id` - Get paper details
- `GET /api/paper/:id/html` - Get paper HTML content
- `GET /api/saved-papers` - Get saved papers list
- `POST /api/saved-papers` - Save a paper
- `DELETE /api/saved-papers/:id` - Remove saved paper
- `POST /api/cache/clear` - Clear content cache

### 🤖 NEW: Chatbot Endpoints
- `POST /api/chatbot/configure` - Configure chatbot settings and validate API keys
- `POST /api/chatbot/send` - Send message to AI and get response
- `POST /api/chatbot/stream` - Stream AI response for real-time chat
- `GET /api/chatbot/threads/<paper_id>` - Get all chat threads for a paper
- `POST /api/chatbot/thread` - Create new chat thread
- `DELETE /api/chatbot/thread/<thread_id>` - Delete chat thread and history
- `GET /api/chatbot/thread/<thread_id>/history` - Get conversation history
- `POST /api/chatbot/thread/<thread_id>/export` - Export conversation thread

## Project Structure

```
arxivreader/
├── src/
│   ├── backend/                      # Python backend
│   │   ├── arxiv_client.py           # arXiv API integration
│   │   ├── html_processor.py         # HTML content processing
│   │   ├── api_server.py             # Flask API server
│   │   ├── chatbot_service.py        # 🤖 NEW: AI chatbot service
│   │   ├── chat_storage.py           # 🤖 NEW: Chat history management
│   │   └── paper_context_manager.py  # 🤖 NEW: Paper context extraction
│   ├── public/                       # Frontend static files
│   │   ├── css/
│   │   │   ├── styles.css            # Main application styles
│   │   │   ├── chatbot.css           # 🤖 NEW: Chatbot interface styles
│   │   │   └── themes/               # 🎨 NEW: Theme system
│   │   │       ├── light.css         # Light theme
│   │   │       ├── dark.css          # Dark theme
│   │   │       └── academic.css      # Academic theme
│   │   ├── js/
│   │   │   ├── app.js                # Main frontend application
│   │   │   ├── theme-manager.js      # 🎨 NEW: Theme management
│   │   │   ├── chatbot-ui.js         # 🤖 NEW: Chat interface
│   │   │   └── chatbot-api-client.js # 🤖 NEW: Chat API client
│   │   └── index.html                # Main HTML page
│   └── index.js                      # Node.js server
├── data/                             # User data and cache
│   ├── preferences.json              # User preferences (extended)
│   ├── cache/                        # Paper content cache
│   └── chat_history/                 # 🤖 NEW: Chat conversations
├── implementation_plan.md            # 📋 NEW: Development plan
├── requirements.txt                  # Python dependencies (updated)
├── package.json                      # Node.js dependencies
└── README.md                         # This file
```

### New Files Added (Major Release)

**🤖 AI Chatbot System:**
- `src/backend/chatbot_service.py` - Core AI integration with OpenAI/Anthropic APIs
- `src/backend/chat_storage.py` - Persistent conversation management
- `src/backend/paper_context_manager.py` - Paper content extraction for AI context
- `src/public/js/chatbot-ui.js` - Interactive chat interface
- `src/public/js/chatbot-api-client.js` - Frontend-backend communication
- `src/public/css/chatbot.css` - Chat-specific styling
- `data/chat_history/` - Directory for conversation storage

**🎨 Theme System:**
- `src/public/js/theme-manager.js` - Dynamic theme switching
- `src/public/css/themes/light.css` - Light theme definitions
- `src/public/css/themes/dark.css` - Dark theme definitions
- `src/public/css/themes/academic.css` - Academic theme definitions

**📋 Documentation:**
- `implementation_plan.md` - Comprehensive development plan and feature specifications

## Development

### Scripts

- `pnpm start` - Start Node.js frontend server
- `pnpm backend` - Start Python backend server  
- `pnpm dev` - Start Node.js server with auto-reload
- `pnpm install-python` - Install Python dependencies

### Testing the Installation

1. Ensure both servers are running
2. Open http://localhost:3000
3. Add a keyword like "quantum computing"
4. Click "Search Papers"
5. Try viewing a paper with HTML available

### Troubleshooting

**Python Backend Issues:**
- Ensure all Python dependencies are installed: `pip3 install -r requirements.txt`
- Check Python version: `python3 --version` (should be 3.8+)
- Verify Flask server is running on port 5000

**Frontend Issues:**
- Ensure Node.js dependencies are installed: `pnpm install`
- Check Node.js version: `node --version` (should be 18.0+)
- Verify the frontend can connect to the Python backend

**Common Issues:**
- Port conflicts: Change ports in environment variables if needed
- Network connectivity: Ensure you can reach arxiv.org
- Cache issues: Use the "Clear Cache" button in settings

## Configuration

### Environment Variables

- `PORT` - Frontend server port (default: 3000)
- `PYTHON_API_URL` - Python backend URL (default: http://localhost:5000)

### Data Storage

- User preferences: `data/preferences.json`
- Cached content: `data/cache/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC

## Acknowledgments

- [arXiv](https://arxiv.org) for providing the open research paper repository
- [MathJax](https://www.mathjax.org/) for mathematical equation rendering
- [Bootstrap](https://getbootstrap.com/) for responsive UI components
