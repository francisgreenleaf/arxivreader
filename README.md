# ArXiv Reader

A modern web application for browsing and reading arXiv research papers with beautiful HTML formatting. Search papers by keywords, view them with proper formatting, and save papers for later reading.

## Features

- 🔍 **Smart Search**: Search arXiv papers using keywords with advanced filtering
- 📄 **HTML Rendering**: View papers in clean, formatted HTML (when available)  
- 🎯 **Keyword Management**: Save and manage your research interests
- 💾 **Paper Bookmarking**: Save papers for later reading
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- ⚡ **Fast Caching**: Intelligent caching system for quick paper loading
- 🧮 **Math Support**: Proper rendering of mathematical equations via MathJax

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

#### Settings
- Adjust maximum results per search
- Manage default keywords
- Clear cached content to free up space

## API Endpoints

The application provides a RESTful API:

- `GET /api/preferences` - Get user preferences
- `POST /api/preferences` - Update user preferences
- `POST /api/search` - Search for papers
- `GET /api/paper/:id` - Get paper details
- `GET /api/paper/:id/html` - Get paper HTML content
- `GET /api/saved-papers` - Get saved papers list
- `POST /api/saved-papers` - Save a paper
- `DELETE /api/saved-papers/:id` - Remove saved paper
- `POST /api/cache/clear` - Clear content cache

## Project Structure

```
arxivreader/
├── src/
│   ├── backend/              # Python backend
│   │   ├── arxiv_client.py   # arXiv API integration
│   │   ├── html_processor.py # HTML content processing
│   │   └── api_server.py     # Flask API server
│   ├── public/               # Frontend static files
│   │   ├── css/styles.css    # Application styles
│   │   ├── js/app.js         # Frontend JavaScript
│   │   └── index.html        # Main HTML page
│   └── index.js              # Node.js server
├── data/                     # User data and cache
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

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
