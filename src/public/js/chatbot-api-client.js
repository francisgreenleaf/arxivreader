/**
 * Chatbot API Client for ArXiv Reader
 * Handles frontend-backend communication for chat operations
 */

class ChatbotAPIClient {
    constructor(baseUrl = '/api/chatbot') {
        this.baseUrl = baseUrl;
    }

    /**
     * Make HTTP request with error handling
     */
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Configure chatbot settings
     */
    async configure(config) {
        return this.request('/configure', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    /**
     * Get available models for a provider
     */
    async getAvailableModels(provider) {
        return this.request(`/models/${provider}`);
    }

    /**
     * Validate if paper is suitable for chat
     */
    async validatePaper(arxivId) {
        return this.request(`/validate-paper/${arxivId}`);
    }

    /**
     * Get all threads for a paper
     */
    async getPaperThreads(paperId) {
        return this.request(`/threads/${paperId}`);
    }

    /**
     * Create new chat thread
     */
    async createThread(paperId, title) {
        return this.request('/thread', {
            method: 'POST',
            body: JSON.stringify({
                paper_id: paperId,
                title: title
            })
        });
    }

    /**
     * Get thread message history
     */
    async getThreadHistory(threadId) {
        return this.request(`/thread/${threadId}/history`);
    }

    /**
     * Send message to chatbot
     */
    async sendMessage(threadId, message) {
        return this.request('/send', {
            method: 'POST',
            body: JSON.stringify({
                thread_id: threadId,
                message: message
            })
        });
    }

    /**
     * Stream message response from chatbot
     */
    async streamMessage(threadId, message, onChunk, onComplete, onError) {
        try {
            const response = await fetch(`${this.baseUrl}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    thread_id: threadId,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                onError?.(new Error(data.error));
                                return;
                            }
                            
                            if (data.chunk) {
                                onChunk?.(data.chunk);
                            }
                            
                            if (data.done) {
                                onComplete?.(data.message_id);
                                return;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            onError?.(error);
        }
    }

    /**
     * Delete chat thread
     */
    async deleteThread(threadId) {
        return this.request(`/thread/${threadId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Export chat thread
     */
    async exportThread(threadId, format = 'json') {
        return this.request(`/thread/${threadId}/export?format=${format}`);
    }

    /**
     * Get chat statistics
     */
    async getStats() {
        return this.request('/stats');
    }

    /**
     * Update thread title
     */
    async updateThreadTitle(threadId, title) {
        // Note: This endpoint would need to be added to the backend
        return this.request(`/thread/${threadId}/title`, {
            method: 'PUT',
            body: JSON.stringify({ title })
        });
    }

    /**
     * Search related papers for context
     */
    async searchRelatedPapers(query, limit = 5) {
        return this.request(`/search-papers`, {
            method: 'POST',
            body: JSON.stringify({
                query: query,
                limit: limit
            })
        });
    }
}

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatbotAPIClient;
} else {
    window.ChatbotAPIClient = ChatbotAPIClient;
}
