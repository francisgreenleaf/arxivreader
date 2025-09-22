# Implementation Plan

## [Overview]
Add an AI chatbot feature that enables users to discuss arXiv papers with HTML content using OpenAI or Anthropic APIs.

This implementation integrates a comprehensive chatbot system into the existing ArXiv Reader application. Users will be able to configure their OpenAI or Anthropic API keys through the settings interface, then engage in intelligent conversations about papers with HTML formatting. The chatbot will have access to the current paper's content and the ability to search and reference other papers from the arXiv database during conversations. The system includes enhanced features like persistent conversation history, multiple conversation threads per paper, and the ability to export chat sessions. The implementation leverages the existing Flask backend architecture and extends the current preference management system to securely store API credentials server-side.

## [Types]
Define comprehensive data structures for chatbot functionality, API key management, and conversation storage.

```python
# Chatbot Configuration Types
class ChatbotConfig:
    provider: str  # "openai" or "anthropic"
    api_key: str
    model: str  # e.g., "gpt-4", "claude-3-sonnet"
    max_tokens: int
    temperature: float
    
class ChatMessage:
    id: str
    thread_id: str
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: datetime
    metadata: dict  # For storing context info
    
class ChatThread:
    id: str
    paper_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    is_active: bool
    
class PaperContext:
    arxiv_id: str
    title: str
    authors: List[str]
    abstract: str
    content: str  # HTML content
    sections: List[dict]
    references: List[str]
```

```javascript
// Frontend Types
interface ChatbotState {
    isConfigured: boolean;
    provider: 'openai' | 'anthropic';
    model: string;
    isConnected: boolean;
}

interface ChatMessage {
    id: string;
    threadId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
}

interface ChatThread {
    id: string;
    paperId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    isActive: boolean;
}
```

## [Files]
Create new chatbot service files and update existing components for integration.

**New Files:**
- `src/backend/chatbot_service.py` - Core chatbot service with API integrations
- `src/backend/chat_storage.py` - Chat history and thread management
- `src/backend/paper_context_manager.py` - Paper content extraction and context preparation
- `src/public/js/chatbot-ui.js` - Frontend chat interface and message handling
- `src/public/js/chatbot-api-client.js` - API communication layer for chat operations
- `src/public/css/chatbot.css` - Styles for chat interface components

**Modified Files:**
- `src/backend/api_server.py` - Add chatbot API endpoints and configuration management
- `src/public/js/app.js` - Integrate chat interface into paper viewer
- `src/public/index.html` - Add chat UI elements and configuration modals
- `src/public/css/styles.css` - Update styles for chat integration
- `requirements.txt` - Add OpenAI and Anthropic Python SDKs
- `package.json` - Update to reflect new chatbot capabilities

**Storage Structure:**
- `data/preferences.json` - Extended with chatbot_config section
- `data/chat_history/` - Directory for chat thread storage
- `data/chat_history/{paper_id}/` - Per-paper chat organization
- `data/chat_history/{paper_id}/{thread_id}.json` - Individual thread files

## [Functions]
Implement comprehensive chatbot functionality with API integration and conversation management.

**New Functions in `chatbot_service.py`:**
- `ChatbotService.__init__(config: ChatbotConfig)` - Initialize with API credentials
- `ChatbotService.send_message(message: str, context: PaperContext, thread_id: str) -> ChatMessage` - Send message to AI API
- `ChatbotService.stream_response(message: str, context: PaperContext, thread_id: str) -> Iterator[str]` - Stream AI responses
- `ChatbotService.validate_api_key(provider: str, api_key: str) -> bool` - Validate API credentials
- `ChatbotService.get_available_models(provider: str) -> List[str]` - Fetch available models

**New Functions in `chat_storage.py`:**
- `ChatStorage.create_thread(paper_id: str, title: str) -> ChatThread` - Create new conversation thread
- `ChatStorage.save_message(thread_id: str, message: ChatMessage)` - Persist chat message
- `ChatStorage.get_thread_history(thread_id: str) -> List[ChatMessage]` - Retrieve conversation history
- `ChatStorage.get_paper_threads(paper_id: str) -> List[ChatThread]` - Get all threads for a paper
- `ChatStorage.delete_thread(thread_id: str)` - Remove thread and messages
- `ChatStorage.export_thread(thread_id: str, format: str) -> str` - Export conversation

**New Functions in `paper_context_manager.py`:**
- `PaperContextManager.extract_paper_context(arxiv_id: str) -> PaperContext` - Extract paper content and metadata
- `PaperContextManager.search_related_papers(query: str, limit: int) -> List[dict]` - Find related papers
- `PaperContextManager.prepare_context_prompt(paper: PaperContext, query: str) -> str` - Format context for AI

**Modified Functions in `api_server.py`:**
- `load_preferences()` - Add chatbot configuration loading
- `save_preferences(preferences: Dict)` - Include chatbot config persistence
- Add `@app.route('/api/chatbot/configure', methods=['POST'])` - Configure chatbot settings
- Add `@app.route('/api/chatbot/send', methods=['POST'])` - Send chat message
- Add `@app.route('/api/chatbot/stream', methods=['POST'])` - Stream chat response
- Add `@app.route('/api/chatbot/threads/<paper_id>', methods=['GET'])` - Get paper threads
- Add `@app.route('/api/chatbot/thread', methods=['POST'])` - Create new thread
- Add `@app.route('/api/chatbot/thread/<thread_id>', methods=['DELETE'])` - Delete thread

**New Functions in `chatbot-ui.js`:**
- `ChatbotUI.initialize(containerId: string)` - Setup chat interface
- `ChatbotUI.openChat(paperId: string)` - Open chat for specific paper
- `ChatbotUI.sendMessage(message: string)` - Send user message
- `ChatbotUI.displayMessage(message: ChatMessage)` - Render chat message
- `ChatbotUI.loadThreadHistory(threadId: string)` - Load and display conversation
- `ChatbotUI.createNewThread(title: string)` - Create new conversation thread
- `ChatbotUI.exportThread(threadId: string, format: string)` - Export conversation

## [Classes]
Create new chatbot service classes and extend existing application components.

**New Classes:**
- `ChatbotService` in `src/backend/chatbot_service.py` - Core AI API integration service
  - Key methods: `send_message()`, `stream_response()`, `validate_api_key()`
  - Handles OpenAI and Anthropic API communication
  - Manages conversation context and token limits

- `ChatStorage` in `src/backend/chat_storage.py` - Conversation persistence manager
  - Key methods: `create_thread()`, `save_message()`, `get_thread_history()`
  - Manages file-based chat history storage
  - Handles thread lifecycle and message organization

- `PaperContextManager` in `src/backend/paper_context_manager.py` - Paper content processor
  - Key methods: `extract_paper_context()`, `search_related_papers()`
  - Integrates with existing HTMLProcessor and ArxivClient
  - Prepares structured context for AI conversations

- `ChatbotUI` in `src/public/js/chatbot-ui.js` - Frontend chat interface controller
  - Key methods: `initialize()`, `sendMessage()`, `displayMessage()`
  - Manages chat UI state and message rendering
  - Handles real-time message streaming and thread management

- `ChatbotAPIClient` in `src/public/js/chatbot-api-client.js` - API communication handler
  - Key methods: `sendMessage()`, `streamMessage()`, `loadThreads()`
  - Manages frontend-backend communication for chat operations
  - Handles streaming responses and error management

**Modified Classes:**
- `ArxivReaderApp` in `src/public/js/app.js` - Extend with chatbot integration
  - Add methods: `initializeChatbot()`, `showChatInterface()`, `configureChatbot()`
  - Integrate chat UI into paper viewer workflow
  - Add chatbot configuration to settings management

## [Dependencies]
Add AI API client libraries and update existing dependencies for chatbot functionality.

**Python Dependencies (requirements.txt):**
- `openai==1.3.8` - OpenAI GPT API client
- `anthropic==0.8.1` - Anthropic Claude API client  
- `tiktoken==0.5.2` - Token counting for OpenAI models
- `python-dotenv==1.0.0` - Environment variable management
- `cryptography==41.0.8` - API key encryption utilities

**JavaScript Dependencies:**
- No new npm packages required
- Utilizes existing Bootstrap and FontAwesome for UI components
- Leverages browser's native EventSource API for streaming responses

**Integration Requirements:**
- Extend existing Flask-CORS configuration for chatbot endpoints
- Update MathJax integration to render math in chat messages
- Ensure compatibility with existing theme system for chat UI

## [Testing]
Implement comprehensive testing strategy for chatbot functionality and API integrations.

**Backend Testing:**
- Unit tests for `ChatbotService` API integration methods
- Mock tests for OpenAI and Anthropic API responses
- Integration tests for chat storage and retrieval operations
- Security tests for API key encryption and validation
- Performance tests for message processing and context preparation

**Frontend Testing:**
- UI component tests for chat interface elements
- Message rendering and streaming functionality tests
- Thread management and history loading tests
- Settings configuration and API key validation tests
- Mobile responsiveness tests for chat interface

**End-to-End Testing:**
- Complete chat workflow tests (configure → chat → save)
- Multi-thread conversation management tests
- Paper context integration and cross-reference tests
- Error handling and recovery scenario tests
- Export functionality and data integrity tests

## [Implementation Order]
Sequential implementation steps to minimize integration conflicts and ensure progressive functionality.

1. **Backend Foundation** - Create core chatbot service and storage components
   - Implement `ChatbotService` with API integrations
   - Create `ChatStorage` for conversation persistence
   - Develop `PaperContextManager` for content extraction
   - Add chatbot API endpoints to Flask server

2. **Frontend Infrastructure** - Build chat UI components and API client
   - Create `ChatbotUI` class and interface components
   - Implement `ChatbotAPIClient` for backend communication
   - Add chat interface styles and responsive design
   - Integrate chat button and modal into paper viewer

3. **Configuration System** - Extend settings for API key management
   - Update preferences schema for chatbot configuration
   - Add API key configuration UI in settings page
   - Implement secure server-side key storage and encryption
   - Add API key validation and model selection features

4. **Core Chat Functionality** - Implement basic messaging and conversation
   - Enable message sending and receiving capabilities
   - Implement real-time message streaming interface
   - Add conversation thread creation and management
   - Integrate paper content as conversation context

5. **Enhanced Features** - Add advanced chatbot capabilities
   - Implement conversation history persistence and loading
   - Add multiple thread support per paper
   - Enable cross-paper reference and search capabilities
   - Create conversation export and sharing functionality

6. **Testing and Polish** - Comprehensive testing and user experience refinement
   - Conduct thorough API integration testing
   - Perform security audits on API key handling
   - Test responsive design across devices and browsers
   - Implement error handling and user feedback systems
