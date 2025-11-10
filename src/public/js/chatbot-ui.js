/**
 * Chatbot UI for ArXiv Reader
 * Manages the chat interface and message handling
 */

class ChatbotUI {
    constructor(containerId, apiClient) {
        this.container = document.getElementById(containerId);
        this.apiClient = apiClient || new ChatbotAPIClient();
        this.currentPaperId = null;
        this.currentThreadId = null;
        this.threads = [];
        this.messages = [];
        this.isStreaming = false;
        
        this.initialize();
    }

    /**
     * Initialize the chat UI
     */
    initialize() {
        this.createChatInterface();
        this.attachEventListeners();
    }

    /**
     * Create the main chat interface HTML
     */
    createChatInterface() {
        this.container.innerHTML = `
            <div class="chatbot-container" id="chatbot-container">
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <i class="fas fa-robot me-2"></i>
                        <span>AI Chat</span>
                    </div>
                    <div class="chatbot-controls">
                        <button class="btn btn-sm btn-outline-secondary me-2" id="new-thread-btn" title="New Conversation">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary me-2" id="thread-list-btn" title="Conversations">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="close-chat-btn" title="Close Chat">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="chatbot-sidebar" id="chatbot-sidebar">
                    <div class="thread-list">
                        <div class="thread-list-header">
                            <h6>Conversations</h6>
                        </div>
                        <div class="thread-list-content" id="thread-list">
                            <!-- Threads will be populated here -->
                        </div>
                    </div>
                </div>

                <div class="chatbot-main">
                    <div class="chat-messages" id="chat-messages">
                        <div class="chat-welcome" id="chat-welcome">
                            <div class="welcome-message">
                                <i class="fas fa-robot mb-3"></i>
                                <h5>Welcome to AI Chat</h5>
                                <p>Start a conversation about this paper. I can help you understand the content, explain concepts, and answer questions.</p>
                                <p><small class="text-muted">Make sure to configure your AI provider in settings first.</small></p>
                            </div>
                        </div>
                    </div>

                    <div class="chat-input-container">
                        <div class="chat-input-wrapper">
                            <textarea class="form-control" id="chat-input" rows="2" placeholder="Ask a question about this paper..."></textarea>
                            <button class="btn btn-primary" id="send-btn" disabled>
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="chat-status" id="chat-status"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Send button and enter key
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');

        sendBtn.addEventListener('click', () => this.sendMessage());
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        chatInput.addEventListener('input', () => {
            const message = chatInput.value.trim();
            sendBtn.disabled = !message || this.isStreaming;
        });

        // Control buttons
        document.getElementById('new-thread-btn').addEventListener('click', () => this.createNewThread());
        document.getElementById('thread-list-btn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('close-chat-btn').addEventListener('click', () => this.closeChatInterface());
    }

    /**
     * Open chat for a specific paper
     */
    async openChat(paperId) {
        try {
            this.currentPaperId = paperId;
            this.showStatus('Validating paper for chat...', 'info');

            // Validate paper
            const validation = await this.apiClient.validatePaper(paperId);
            
            if (!validation.validation.valid) {
                this.showStatus(validation.validation.reason, 'error');
                return;
            }

            // Load threads for this paper
            await this.loadPaperThreads();

            // Show chat interface
            this.show();

            // Auto-create first thread if none exist
            if (this.threads.length === 0) {
                await this.createNewThread(`Discussion with ${validation.validation.title || 'Paper'}`);
            } else {
                // Load the most recent thread
                this.loadThread(this.threads[0].id);
            }

            this.clearStatus();

        } catch (error) {
            this.showStatus(`Failed to open chat: ${error.message}`, 'error');
        }
    }

    /**
     * Load all threads for current paper
     */
    async loadPaperThreads() {
        try {
            const response = await this.apiClient.getPaperThreads(this.currentPaperId);
            this.threads = response.threads.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            this.updateThreadList();
        } catch (error) {
            console.error('Failed to load threads:', error);
            this.threads = [];
        }
    }

    /**
     * Update the thread list in sidebar
     */
    updateThreadList() {
        const threadList = document.getElementById('thread-list');
        
        if (this.threads.length === 0) {
            threadList.innerHTML = '<div class="no-threads">No conversations yet</div>';
            return;
        }

        threadList.innerHTML = this.threads.map(thread => `
            <div class="thread-item ${thread.id === this.currentThreadId ? 'active' : ''}" data-thread-id="${thread.id}">
                <div class="thread-title">${this.escapeHtml(thread.title)}</div>
                <div class="thread-meta">
                    <span class="message-count">${thread.message_count} messages</span>
                    <span class="thread-date">${this.formatDate(thread.updated_at)}</span>
                </div>
                <div class="thread-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); chatbot.deleteThread('${thread.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add click listeners to thread items
        threadList.querySelectorAll('.thread-item').forEach(item => {
            item.addEventListener('click', () => {
                const threadId = item.dataset.threadId;
                this.loadThread(threadId);
            });
        });
    }

    /**
     * Create new thread
     */
    async createNewThread(title = null) {
        try {
            if (!this.currentPaperId) {
                this.showStatus('No paper selected', 'error');
                return;
            }

            const threadTitle = title || prompt('Enter conversation title:', 'New Discussion');
            if (!threadTitle) return;

            this.showStatus('Creating new conversation...', 'info');

            const response = await this.apiClient.createThread(this.currentPaperId, threadTitle);
            
            // Reload threads and select the new one
            await this.loadPaperThreads();
            this.loadThread(response.thread.id);

            this.clearStatus();

        } catch (error) {
            this.showStatus(`Failed to create conversation: ${error.message}`, 'error');
        }
    }

    /**
     * Load specific thread
     */
    async loadThread(threadId) {
        try {
            this.currentThreadId = threadId;
            this.showChatLoading('Loading conversation...');

            const response = await this.apiClient.getThreadHistory(threadId);
            this.messages = response.messages;

            this.renderMessages();
            this.updateThreadList(); // Update active state
            this.hideSidebar();
            this.clearStatus();

        } catch (error) {
            this.showStatus(`Failed to load conversation: ${error.message}`, 'error');
        }
    }

    /**
     * Send message
     */
    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message || this.isStreaming || !this.currentThreadId) {
            return;
        }

        // Clear input and disable send button
        chatInput.value = '';
        document.getElementById('send-btn').disabled = true;
        this.isStreaming = true;

        // Add user message to UI
        this.addMessage({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Show typing indicator
        const typingIndicatorId = this.showTypingIndicator();

        try {
            // Stream response from API
            let responseId = null;
            let firstChunk = true;

            await this.apiClient.streamMessage(
                this.currentThreadId,
                message,
                (chunk) => {
                    // Remove typing indicator on first chunk
                    if (firstChunk) {
                        this.removeTypingIndicator(typingIndicatorId);
                        responseId = this.addMessage({
                            role: 'assistant',
                            content: '',
                            timestamp: new Date().toISOString(),
                            isStreaming: true
                        });
                        firstChunk = false;
                    }
                    this.updateStreamingMessage(responseId, chunk);
                },
                (messageId) => {
                    if (responseId) {
                        this.completeStreamingMessage(responseId, messageId);
                    }
                },
                (error) => {
                    this.removeTypingIndicator(typingIndicatorId);
                    if (responseId) {
                        this.handleStreamingError(responseId, error);
                    } else {
                        this.showStatus(`Chat error: ${error.message}`, 'error');
                    }
                }
            );

        } catch (error) {
            this.removeTypingIndicator(typingIndicatorId);
            this.showStatus(`Chat error: ${error.message}`, 'error');
        } finally {
            this.isStreaming = false;
            document.getElementById('send-btn').disabled = false;
        }
    }

    /**
     * Add message to chat display
     */
    addMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const welcome = document.getElementById('chat-welcome');
        
        // Hide welcome message if visible
        if (welcome) {
            welcome.style.display = 'none';
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}-message${message.isStreaming ? ' streaming' : ''}`;
        messageDiv.id = messageId;

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text"${message.isStreaming ? ' id="streaming-text"' : ''}>${this.formatMessageContent(message.content)}</div>
                <div class="message-meta">
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    ${message.role === 'assistant' ? '<span class="message-role">AI</span>' : '<span class="message-role">You</span>'}
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        return messageId;
    }

    /**
     * Update streaming message content
     */
    updateStreamingMessage(messageId, chunk) {
        const messageDiv = document.getElementById(messageId);
        const textElement = messageDiv.querySelector('#streaming-text');
        
        if (textElement) {
            textElement.innerHTML += this.escapeHtml(chunk);
            this.scrollToBottom();
        }
    }

    /**
     * Complete streaming message
     */
    completeStreamingMessage(messageId, apiMessageId) {
        const messageDiv = document.getElementById(messageId);
        messageDiv.classList.remove('streaming');
        
        const textElement = messageDiv.querySelector('#streaming-text');
        if (textElement) {
            textElement.removeAttribute('id');
        }

        // Update threads list to reflect new message
        this.loadPaperThreads();
    }

    /**
     * Handle streaming error
     */
    handleStreamingError(messageId, error) {
        const messageDiv = document.getElementById(messageId);
        const textElement = messageDiv.querySelector('#streaming-text');
        
        if (textElement) {
            textElement.innerHTML = `<span class="text-danger">Error: ${error.message}</span>`;
            textElement.removeAttribute('id');
        }
        
        messageDiv.classList.remove('streaming');
        this.showStatus(`Chat error: ${error.message}`, 'error');
    }

    /**
     * Render all messages
     */
    renderMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        const welcome = document.getElementById('chat-welcome');

        if (this.messages.length === 0) {
            welcome.style.display = 'block';
            return;
        }

        welcome.style.display = 'none';
        
        // Clear existing messages
        const existingMessages = messagesContainer.querySelectorAll('.chat-message');
        existingMessages.forEach(msg => msg.remove());

        // Render all messages
        this.messages.forEach(message => {
            this.addMessage(message);
        });
    }

    /**
     * Delete thread
     */
    async deleteThread(threadId) {
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }

        try {
            await this.apiClient.deleteThread(threadId);
            
            // Reload threads
            await this.loadPaperThreads();

            // If deleted thread was current, clear messages
            if (threadId === this.currentThreadId) {
                this.currentThreadId = null;
                this.messages = [];
                this.renderMessages();
            }

        } catch (error) {
            this.showStatus(`Failed to delete conversation: ${error.message}`, 'error');
        }
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('chatbot-sidebar');
        sidebar.classList.toggle('active');
    }

    /**
     * Hide sidebar
     */
    hideSidebar() {
        const sidebar = document.getElementById('chatbot-sidebar');
        sidebar.classList.remove('active');
    }

    /**
     * Show chat interface
     */
    show() {
        this.container.style.display = 'block';
        document.body.classList.add('chatbot-open');
    }

    /**
     * Close chat interface
     */
    closeChatInterface() {
        this.container.style.display = 'none';
        document.body.classList.remove('chatbot-open');
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('chat-status');
        statusDiv.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : 'info'} alert-sm mb-0">${message}</div>`;
    }

    /**
     * Clear status message
     */
    clearStatus() {
        const statusDiv = document.getElementById('chat-status');
        statusDiv.innerHTML = '';
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Format message content with basic markdown support
     */
    formatMessageContent(content) {
        if (!content) return '';
        
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Format date for thread list
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const welcome = document.getElementById('chat-welcome');
        
        if (welcome) {
            welcome.style.display = 'none';
        }

        const indicatorId = `typing_${Date.now()}`;
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'chat-message assistant-message';
        indicatorDiv.id = indicatorId;

        indicatorDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-indicator-dots">
                    <div class="typing-indicator-dot"></div>
                    <div class="typing-indicator-dot"></div>
                    <div class="typing-indicator-dot"></div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(indicatorDiv);
        this.scrollToBottom();

        return indicatorId;
    }

    /**
     * Remove typing indicator
     */
    removeTypingIndicator(indicatorId) {
        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Show chat loading state
     */
    showChatLoading(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const welcome = document.getElementById('chat-welcome');
        
        if (welcome) {
            welcome.style.display = 'none';
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'chat-loading-indicator';
        loadingDiv.className = 'chat-loading';
        loadingDiv.innerHTML = `
            <div class="text-center">
                <div class="chat-loading-spinner mb-2"></div>
                <small class="text-muted">${message}</small>
            </div>
        `;

        messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    /**
     * Clear chat loading state
     */
    clearChatLoading() {
        const loadingDiv = document.getElementById('chat-loading-indicator');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatbotUI;
} else {
    window.ChatbotUI = ChatbotUI;
}
