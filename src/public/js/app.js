// ArXiv Reader Frontend Application
class ArxivReaderApp {
    constructor() {
        this.keywords = [];
        this.currentPapers = [];
        this.currentPaper = null;
        this.searchParams = null;
        this.savedPapers = [];
        this.themeManager = null;
        this.chatbot = null;
        this.chatbotAPI = null;
        this.isChatbotConfigured = false;
        
        this.init();
    }

    async init() {
        // Initialize themes first
        await this.initializeThemes();
        
        // Initialize chatbot
        await this.initializeChatbot();
        
        // Load preferences
        await this.loadPreferences();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateKeywordsDisplay();
        this.showWelcomeScreen();
        
        console.log('ArXiv Reader App initialized');
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('brand-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showWelcomeScreen();
        });
        
        document.getElementById('nav-home').addEventListener('click', (e) => {
            e.preventDefault();
            this.showWelcomeScreen();
        });
        
        document.getElementById('nav-saved').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSavedPapers();
        });
        
        document.getElementById('nav-settings').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSettingsPage();
        });

        // Search type selector
        document.getElementById('search-type-select').addEventListener('change', (e) => {
            this.handleSearchTypeChange(e.target.value);
        });

        // Keywords management
        document.getElementById('keyword-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addKeyword();
            }
        });
        
        document.getElementById('add-keyword').addEventListener('click', () => {
            this.addKeyword();
        });

        // Search inputs - Enter key support
        document.getElementById('title-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPapers();
            }
        });

        document.getElementById('author-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPapers();
            }
        });

        // Advanced search inputs
        document.getElementById('advanced-title-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPapers();
            }
        });

        document.getElementById('advanced-author-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPapers();
            }
        });

        document.getElementById('advanced-keywords-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPapers();
            }
        });

        document.getElementById('advanced-abstract-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPapers();
            }
        });

        // Search
        document.getElementById('search-button').addEventListener('click', () => {
            this.searchPapers();
        });

        // Results management
        document.getElementById('load-more-btn').addEventListener('click', () => {
            this.loadMoreResults();
        });
        
        document.getElementById('clear-results-btn').addEventListener('click', () => {
            this.clearResults();
        });

        // View toggles
        document.getElementById('view-grid').addEventListener('click', () => {
            this.setViewMode('grid');
        });
        
        document.getElementById('view-list').addEventListener('click', () => {
            this.setViewMode('list');
        });

        // Paper viewer
        document.getElementById('back-to-results').addEventListener('click', () => {
            this.showPapersList();
        });
        
        document.getElementById('save-paper-btn').addEventListener('click', () => {
            this.toggleSavePaper();
        });
        
        document.getElementById('toggle-toc').addEventListener('click', () => {
            this.toggleTableOfContents();
        });

        // Settings
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.clearCache();
        });

        // Theme controls
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.handleThemeChange(e.target.value);
        });

        document.getElementById('font-size-range').addEventListener('input', (e) => {
            const multiplier = parseFloat(e.target.value);
            this.handleFontSizeChange(multiplier);
        });

        // Setup chatbot event listeners
        this.setupChatbotEventListeners();
    }

    setupChatbotEventListeners() {
        // Chat paper button (in paper viewer)
        const chatPaperBtn = document.getElementById('chat-paper-btn');
        if (chatPaperBtn) {
            chatPaperBtn.addEventListener('click', () => {
                this.openChatForCurrentPaper();
            });
        }

        // Floating chat button
        const chatButton = document.getElementById('chat-button');
        if (chatButton) {
            chatButton.addEventListener('click', () => {
                this.openChatForCurrentPaper();
            });
        }

        // AI configuration form
        const aiProvider = document.getElementById('ai-provider');
        const aiApiKey = document.getElementById('ai-api-key');
        const aiModel = document.getElementById('ai-model');
        const configureAIBtn = document.getElementById('configure-ai-btn');
        const temperatureSlider = document.getElementById('ai-temperature');

        if (aiProvider) {
            aiProvider.addEventListener('change', (e) => {
                this.handleAIProviderChange(e.target.value);
            });
        }

        if (aiApiKey) {
            aiApiKey.addEventListener('input', (e) => {
                this.updateConfigureButtonState();
            });
        }

        if (configureAIBtn) {
            configureAIBtn.addEventListener('click', () => {
                this.configureAI();
            });
        }

        if (temperatureSlider) {
            temperatureSlider.addEventListener('input', (e) => {
                this.updateTemperatureDisplay(parseFloat(e.target.value));
            });
        }
    }

    // Chatbot Initialization
    async initializeChatbot() {
        try {
            this.chatbotAPI = new ChatbotAPIClient();
            this.chatbot = new ChatbotUI('chatbot-interface', this.chatbotAPI);
            
            // Load chatbot configuration status
            await this.loadChatbotConfig();
            
            console.log('Chatbot initialized');
        } catch (error) {
            console.error('Failed to initialize chatbot:', error);
        }
    }

    async loadChatbotConfig() {
        try {
            const response = await fetch('/api/preferences');
            const data = await response.json();
            
            if (data.success && data.preferences.chatbot_config) {
                const config = data.preferences.chatbot_config;
                this.isChatbotConfigured = config.is_configured || false;
                
                // Update UI based on configuration
                this.updateChatbotUI(config);
            }
        } catch (error) {
            console.error('Failed to load chatbot config:', error);
        }
    }

    updateChatbotUI(config) {
        // Update settings form
        const providerSelect = document.getElementById('ai-provider');
        const modelSelect = document.getElementById('ai-model');
        const maxTokensInput = document.getElementById('ai-max-tokens');
        const temperatureSlider = document.getElementById('ai-temperature');
        const statusDiv = document.getElementById('ai-status');

        if (providerSelect) {
            providerSelect.value = config.provider || '';
            if (config.provider) {
                this.handleAIProviderChange(config.provider);
            }
        }

        if (modelSelect && config.model) {
            modelSelect.value = config.model;
        }

        if (maxTokensInput) {
            maxTokensInput.value = config.max_tokens || 4000;
        }

        if (temperatureSlider) {
            temperatureSlider.value = config.temperature || 0.7;
            this.updateTemperatureDisplay(config.temperature || 0.7);
        }

        if (statusDiv) {
            if (this.isChatbotConfigured) {
                statusDiv.innerHTML = '<small class="text-success"><i class="fas fa-check me-1"></i>AI Configured</small>';
            } else {
                statusDiv.innerHTML = '<small class="text-muted">Configure your AI provider above</small>';
            }
        }
    }

    // Keywords Management
    addKeyword() {
        const input = document.getElementById('keyword-input');
        const keyword = input.value.trim();
        
        if (keyword && !this.keywords.includes(keyword)) {
            this.keywords.push(keyword);
            input.value = '';
            this.updateKeywordsDisplay();
            this.savePreferences();
        }
    }

    removeKeyword(keyword) {
        this.keywords = this.keywords.filter(k => k !== keyword);
        this.updateKeywordsDisplay();
        this.savePreferences();
    }

    updateKeywordsDisplay() {
        const container = document.getElementById('keywords-list');
        container.innerHTML = '';
        
        this.keywords.forEach(keyword => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.innerHTML = `
                ${keyword}
                <span class="remove-keyword" onclick="app.removeKeyword('${keyword}')">×</span>
            `;
            container.appendChild(tag);
        });
    }

    // Search Type Management
    handleSearchTypeChange(searchType) {
        // Hide all search modes
        const searchModes = document.querySelectorAll('.search-mode');
        searchModes.forEach(mode => {
            mode.style.display = 'none';
        });

        // Show selected search mode
        const selectedMode = document.getElementById(`${searchType}-search`);
        if (selectedMode) {
            selectedMode.style.display = 'block';
        }

        // Update search button text based on type
        const searchButton = document.getElementById('search-button');
        const searchTypeNames = {
            'keywords': 'Search by Keywords',
            'title': 'Search by Title',
            'author': 'Search by Author',
            'advanced': 'Advanced Search'
        };
        
        searchButton.innerHTML = `<i class="fas fa-search me-1"></i>${searchTypeNames[searchType] || 'Search Papers'}`;
    }

    // Enhanced Search Functionality
    async searchPapers(start = 0) {
        const searchType = document.getElementById('search-type-select').value;
        let searchData = {};
        let isValid = false;

        // Build search data based on type
        switch (searchType) {
            case 'keywords':
                if (this.keywords.length === 0) {
                    this.showError('Please add at least one keyword to search');
                    return;
                }
                searchData = {
                    search_type: 'keywords',
                    keywords: this.keywords
                };
                isValid = true;
                break;

            case 'title':
                const title = document.getElementById('title-input').value.trim();
                if (!title) {
                    this.showError('Please enter a paper title to search');
                    return;
                }
                searchData = {
                    search_type: 'title',
                    title: title
                };
                isValid = true;
                break;

            case 'author':
                const author = document.getElementById('author-input').value.trim();
                if (!author) {
                    this.showError('Please enter an author name to search');
                    return;
                }
                searchData = {
                    search_type: 'author',
                    author: author
                };
                isValid = true;
                break;

            case 'advanced':
                const advancedTitle = document.getElementById('advanced-title-input').value.trim();
                const advancedAuthor = document.getElementById('advanced-author-input').value.trim();
                const advancedKeywords = document.getElementById('advanced-keywords-input').value.trim();
                const advancedAbstract = document.getElementById('advanced-abstract-input').value.trim();

                if (!advancedTitle && !advancedAuthor && !advancedKeywords && !advancedAbstract) {
                    this.showError('Please fill in at least one field for advanced search');
                    return;
                }

                searchData = {
                    search_type: 'advanced',
                    title: advancedTitle,
                    author: advancedAuthor,
                    keywords: advancedKeywords ? advancedKeywords.split(',').map(k => k.trim()) : [],
                    abstract: advancedAbstract
                };
                isValid = true;
                break;

            default:
                this.showError('Invalid search type selected');
                return;
        }

        if (!isValid) {
            return;
        }

        // Add pagination and limits
        searchData.max_results = 20;
        searchData.start = start;

        this.showLoading('Searching papers...');

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchData)
            });

            const data = await response.json();

            if (data.success) {
                if (start === 0) {
                    this.currentPapers = data.results.papers;
                    this.searchParams = data.search_params;
                } else {
                    this.currentPapers.push(...data.results.papers);
                }
                
                this.displayPapers();
                this.updateSearchInfo(data.results.total_results, searchType);
            } else {
                this.showError(data.error || 'Failed to search papers');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    async loadMoreResults() {
        if (this.searchParams && this.currentPapers.length > 0) {
            const start = this.currentPapers.length;
            await this.searchPapers(start);
        }
    }

    // Display Methods
    displayPapers() {
        const container = document.getElementById('papers-list');
        const viewMode = document.getElementById('view-grid').classList.contains('active') ? 'grid' : 'list';
        
        container.className = viewMode === 'grid' ? 'row papers-grid' : 'papers-list';
        container.innerHTML = '';

        this.currentPapers.forEach(paper => {
            const paperElement = this.createPaperCard(paper, viewMode);
            container.appendChild(paperElement);
        });

        this.showPapersContainer();
    }

    createPaperCard(paper, viewMode = 'list') {
        const colClass = viewMode === 'grid' ? 'col-md-6 col-lg-4 mb-3' : 'col-12';
        const div = document.createElement('div');
        div.className = colClass;

        // Format authors
        const authors = Array.isArray(paper.authors) ? paper.authors.slice(0, 3).join(', ') : 'Unknown';
        const moreAuthors = paper.authors && paper.authors.length > 3 ? ` and ${paper.authors.length - 3} more` : '';

        // Format date
        const date = paper.published ? new Date(paper.published).toLocaleDateString() : 'No date';

        // Create badges
        const badges = [];
        if (paper.html_available) {
            badges.push('<span class="paper-badge html-available-badge">HTML Available</span>');
        }
        if (paper.categories && paper.categories.length > 0) {
            badges.push(`<span class="paper-badge bg-secondary text-white">${paper.categories[0]}</span>`);
        }

        div.innerHTML = `
            <div class="card paper-card" onclick="app.viewPaper('${paper.id}')">
                <div class="card-body">
                    <h5 class="paper-title">${paper.title}</h5>
                    <p class="paper-authors">${authors}${moreAuthors}</p>
                    <p class="paper-abstract text-truncate-3">${paper.abstract}</p>
                    <div class="paper-badges">
                        ${badges.join('')}
                    </div>
                    <div class="paper-meta mt-2">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>${date}
                            <span class="ms-3">
                                <i class="fas fa-tag me-1"></i>arXiv:${paper.id}
                            </span>
                        </small>
                    </div>
                    <div class="paper-actions">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); app.viewPaper('${paper.id}')">
                            <i class="fas fa-eye me-1"></i>View Paper
                        </button>
                        ${paper.html_available ? `
                            <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); app.viewPaperHTML('${paper.id}')">
                                <i class="fas fa-code me-1"></i>View HTML
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-secondary btn-sm" onclick="event.stopPropagation(); app.toggleSavePaper('${paper.id}')">
                            <i class="fas fa-bookmark me-1"></i>Save
                        </button>
                    </div>
                </div>
            </div>
        `;

        return div;
    }

    async viewPaper(arxivId) {
        try {
            this.showLoading('Loading paper details...');
            
            const response = await fetch(`/api/paper/${arxivId}`);
            const data = await response.json();

            if (data.success) {
                this.currentPaper = data.paper;
                this.displayPaperSummary();
                this.showPaperViewer();
            } else {
                this.showError(data.error || 'Failed to load paper');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    async viewPaperHTML(arxivId) {
        try {
            this.showLoading('Loading HTML content...');
            
            const response = await fetch(`/api/paper/${arxivId}/html`);
            const data = await response.json();

            if (data.success) {
                this.currentPaper = data.processed_content;
                this.displayPaperHTML();
                this.showPaperViewer();
                
                // Re-render math after content is loaded
                setTimeout(() => {
                    if (window.MathJax) {
                        window.MathJax.typesetPromise();
                    }
                }, 100);
            } else {
                this.showError(data.error || 'Failed to load HTML content');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    displayPaperSummary() {
        const content = document.getElementById('paper-content');
        const paper = this.currentPaper;
        
        const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : 'Unknown';
        const date = paper.published ? new Date(paper.published).toLocaleDateString() : 'No date';

        content.innerHTML = `
            <div class="paper-summary">
                <h1 class="mb-3">${paper.title}</h1>
                <p class="lead text-muted mb-3">${authors}</p>
                <p class="mb-4"><small class="text-muted">Published: ${date} | arXiv:${paper.id}</small></p>
                
                <div class="alert alert-light">
                    <h5>Abstract</h5>
                    <p>${paper.abstract}</p>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <h5>Categories</h5>
                        <div class="mb-3">
                            ${paper.categories ? paper.categories.map(cat => 
                                `<span class="badge bg-secondary me-1">${cat}</span>`
                            ).join('') : 'No categories'}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h5>Links</h5>
                        <div class="mb-3">
                            ${paper.pdf_link ? `<a href="${paper.pdf_link}" target="_blank" class="btn btn-outline-primary btn-sm me-2">
                                <i class="fas fa-file-pdf me-1"></i>PDF
                            </a>` : ''}
                            ${paper.abstract_link ? `<a href="${paper.abstract_link}" target="_blank" class="btn btn-outline-secondary btn-sm me-2">
                                <i class="fas fa-external-link-alt me-1"></i>arXiv Page
                            </a>` : ''}
                            ${paper.html_available ? `<button onclick="app.viewPaperHTML('${paper.id}')" class="btn btn-success btn-sm">
                                <i class="fas fa-code me-1"></i>View HTML Version
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateTableOfContents([]);
    }

    displayPaperHTML() {
        const content = document.getElementById('paper-content');
        const paper = this.currentPaper;
        
        content.innerHTML = paper.content;
        this.updateTableOfContents(paper.sections || []);
        
        // Update save button
        this.updateSaveButton(paper.arxiv_id);
    }

    updateTableOfContents(sections) {
        const tocContainer = document.getElementById('paper-toc');
        
        if (sections.length === 0) {
            tocContainer.innerHTML = '<p class="text-muted small">No sections available</p>';
            return;
        }

        tocContainer.innerHTML = sections.map(section => `
            <div class="toc-item toc-level-${section.level}">
                <a href="#${section.id}" onclick="app.scrollToSection('${section.id}')">${section.title}</a>
            </div>
        `).join('');
    }

    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // View Management
    showWelcomeScreen() {
        this.hideAllScreens();
        document.getElementById('welcome-screen').style.display = 'block';
    }

    showPapersContainer() {
        this.hideAllScreens();
        document.getElementById('papers-container').style.display = 'block';
    }

    showPaperViewer() {
        this.hideAllScreens();
        document.getElementById('paper-viewer').style.display = 'block';
        
        // Update chat button visibility when paper viewer is shown
        this.updateChatButtonVisibility();
    }

    showPapersList() {
        this.hideAllScreens();
        document.getElementById('papers-container').style.display = 'block';
    }

    showSettingsPage() {
        this.hideAllScreens();
        document.getElementById('settings-page').style.display = 'block';
        this.loadSettingsForm();
    }

    showLoading(message = 'Loading...') {
        this.hideAllScreens();
        document.getElementById('loading-spinner').style.display = 'block';
        document.querySelector('#loading-spinner p').textContent = message;
    }

    showError(message) {
        this.hideAllScreens();
        document.getElementById('error-display').style.display = 'block';
        document.getElementById('error-message').textContent = message;
    }

    hideAllScreens() {
        const screens = [
            'welcome-screen', 'loading-spinner', 'error-display',
            'papers-container', 'paper-viewer', 'settings-page'
        ];
        
        screens.forEach(screenId => {
            document.getElementById(screenId).style.display = 'none';
        });
    }

    // Saved Papers
    async toggleSavePaper(arxivId = null) {
        const paperId = arxivId || (this.currentPaper ? this.currentPaper.arxiv_id || this.currentPaper.id : null);
        
        if (!paperId) return;

        try {
            const isSaved = this.savedPapers.includes(paperId);
            const method = isSaved ? 'DELETE' : 'POST';
            const url = isSaved ? `/api/saved-papers/${paperId}` : '/api/saved-papers';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: method === 'POST' ? JSON.stringify({ arxiv_id: paperId }) : null
            });

            const data = await response.json();

            if (data.success) {
                this.savedPapers = data.saved_papers;
                this.showToast(isSaved ? 'Paper removed from saved list' : 'Paper saved successfully');
                this.updateSaveButton(paperId);
            } else {
                this.showError(data.error || 'Failed to update saved papers');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    updateSaveButton(paperId) {
        const saveBtn = document.getElementById('save-paper-btn');
        if (saveBtn && paperId) {
            const isSaved = this.savedPapers.includes(paperId);
            saveBtn.innerHTML = isSaved ? 
                '<i class="fas fa-bookmark-check me-1"></i>Saved' :
                '<i class="fas fa-bookmark me-1"></i>Save Paper';
            saveBtn.className = isSaved ? 
                'btn btn-success' : 'btn btn-outline-primary';
        }
    }

    async showSavedPapers() {
        // Implementation for showing saved papers
        this.showToast('Saved papers feature coming soon!');
    }

    // Preferences and Settings
    async loadPreferences() {
        try {
            const response = await fetch('/api/preferences');
            const data = await response.json();
            
            if (data.success) {
                this.keywords = data.preferences.keywords || [];
                this.savedPapers = data.preferences.saved_papers || [];
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }

    async savePreferences() {
        try {
            await fetch('/api/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    keywords: this.keywords,
                    saved_papers: this.savedPapers
                })
            });
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }

    loadSettingsForm() {
        // Load current settings into form
        const maxResults = document.getElementById('max-results');
        const defaultKeywords = document.getElementById('default-keywords');
        
        if (maxResults) {
            maxResults.value = 50; // Default value
        }
        
        if (defaultKeywords) {
            defaultKeywords.innerHTML = this.keywords.map(keyword => `
                <span class="keyword-tag">${keyword}</span>
            `).join('');
        }

        // Load theme settings
        this.loadThemeSettings();
    }

    async saveSettings() {
        const maxResults = document.getElementById('max-results').value;
        
        try {
            await fetch('/api/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    max_results: parseInt(maxResults),
                    keywords: this.keywords
                })
            });
            
            this.showToast('Settings saved successfully');
        } catch (error) {
            this.showError('Failed to save settings: ' + error.message);
        }
    }

    async clearCache() {
        try {
            const response = await fetch('/api/cache/clear', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Cache cleared successfully');
            } else {
                this.showError(data.error || 'Failed to clear cache');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    // UI Helpers
    setViewMode(mode) {
        const gridBtn = document.getElementById('view-grid');
        const listBtn = document.getElementById('view-list');
        
        if (mode === 'grid') {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        }
        
        this.displayPapers();
    }

    updateSearchInfo(totalResults, searchType = 'keywords') {
        document.getElementById('results-count').textContent = totalResults;
        
        // Update search info text based on search type
        const searchInfoText = document.getElementById('search-info-text');
        const searchTypeNames = {
            'keywords': 'keyword search',
            'title': 'title search',
            'author': 'author search',
            'advanced': 'advanced search'
        };
        
        searchInfoText.innerHTML = `Found <span id="results-count">${totalResults}</span> papers using ${searchTypeNames[searchType] || 'search'}`;
        
        document.getElementById('search-info-card').style.display = 'block';
        
        // Show load more button if there are more results
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (this.currentPapers.length < totalResults) {
            loadMoreBtn.style.display = 'inline-block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    clearResults() {
        this.currentPapers = [];
        this.searchParams = null;
        document.getElementById('search-info-card').style.display = 'none';
        this.showWelcomeScreen();
    }

    toggleTableOfContents() {
        // This would toggle TOC visibility on mobile
        this.showToast('Table of contents toggled');
    }

    showToast(message, title = 'Notification') {
        const toast = document.getElementById('toast');
        const toastTitle = document.getElementById('toast-title');
        const toastBody = document.getElementById('toast-body');
        
        toastTitle.textContent = title;
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    // Theme Management
    async initializeThemes() {
        try {
            // Initialize ThemeManager
            this.themeManager = new ThemeManager();
            
            // Listen for theme changes
            document.addEventListener('themeChanged', (event) => {
                console.log('Theme changed to:', event.detail.themeId);
            });
        } catch (error) {
            console.error('Failed to initialize themes:', error);
        }
    }

    async handleThemeChange(themeId) {
        if (this.themeManager) {
            const success = await this.themeManager.loadTheme(themeId);
            if (success) {
                // Update theme preferences in backend
                await this.saveThemePreferences();
                this.showToast(`Theme changed to ${this.themeManager.getCurrentTheme().name}`);
            } else {
                this.showToast('Failed to change theme', 'Error');
            }
        }
    }

    async saveThemePreferences() {
        if (this.themeManager) {
            try {
                const themePreferences = this.themeManager.getThemePreferences();
                await fetch('/api/preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        theme_preferences: themePreferences
                    })
                });
            } catch (error) {
                console.error('Failed to save theme preferences:', error);
            }
        }
    }

    handleFontSizeChange(multiplier) {
        if (this.themeManager) {
            this.themeManager.applyFontSize(multiplier);
            this.updateFontSizeDisplay(multiplier);
            // Save preferences after a brief delay to avoid too many requests
            clearTimeout(this.fontSizeTimeout);
            this.fontSizeTimeout = setTimeout(() => {
                this.saveThemePreferences();
            }, 500);
        }
    }

    updateFontSizeDisplay(multiplier) {
        const display = document.getElementById('font-size-value');
        if (display) {
            display.textContent = Math.round(multiplier * 100) + '%';
        }
    }

    loadThemeSettings() {
        if (this.themeManager) {
            // Update theme selector
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = this.themeManager.currentTheme;
            }

            // Update font size slider and display
            const fontSizeSlider = document.getElementById('font-size-range');
            const currentSize = this.themeManager.getFontSizeMultiplier();
            if (fontSizeSlider) {
                fontSizeSlider.value = currentSize;
            }
            this.updateFontSizeDisplay(currentSize);
        }
    }

    // Chatbot Methods
    async handleAIProviderChange(provider) {
        const modelSection = document.getElementById('ai-model-section');
        const advancedSection = document.getElementById('ai-advanced-section');
        const modelSelect = document.getElementById('ai-model');

        if (provider) {
            try {
                // Load available models for the provider
                const response = await this.chatbotAPI.getAvailableModels(provider);
                if (response.success) {
                    modelSelect.innerHTML = '<option value="">Select Model...</option>';
                    response.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        modelSelect.appendChild(option);
                    });
                    
                    modelSection.style.display = 'block';
                    advancedSection.style.display = 'block';
                }
            } catch (error) {
                console.error('Failed to load models:', error);
                this.showToast('Failed to load models for ' + provider, 'Error');
            }
        } else {
            modelSection.style.display = 'none';
            advancedSection.style.display = 'none';
        }
        
        this.updateConfigureButtonState();
    }

    updateConfigureButtonState() {
        const provider = document.getElementById('ai-provider').value;
        const apiKey = document.getElementById('ai-api-key').value.trim();
        const model = document.getElementById('ai-model').value;
        const configureBtn = document.getElementById('configure-ai-btn');

        const isValid = provider && apiKey && model;
        configureBtn.disabled = !isValid;
    }

    async configureAI() {
        const provider = document.getElementById('ai-provider').value;
        const apiKey = document.getElementById('ai-api-key').value.trim();
        const model = document.getElementById('ai-model').value;
        const maxTokens = parseInt(document.getElementById('ai-max-tokens').value);
        const temperature = parseFloat(document.getElementById('ai-temperature').value);
        const statusDiv = document.getElementById('ai-status');

        if (!provider || !apiKey || !model) {
            this.showToast('Please fill in all required fields', 'Error');
            return;
        }

        try {
            statusDiv.innerHTML = '<small class="text-info"><i class="fas fa-spinner fa-spin me-1"></i>Configuring...</small>';

            const response = await this.chatbotAPI.configure({
                provider: provider,
                api_key: apiKey,
                model: model,
                max_tokens: maxTokens,
                temperature: temperature
            });

            if (response.success) {
                this.isChatbotConfigured = true;
                statusDiv.innerHTML = '<small class="text-success"><i class="fas fa-check me-1"></i>AI Configured Successfully</small>';
                this.showToast('AI chatbot configured successfully!');
                this.updateChatButtonVisibility();
                
                // Clear the API key field for security
                document.getElementById('ai-api-key').value = '';
            } else {
                statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Configuration Failed</small>';
                this.showToast(response.error || 'Failed to configure AI', 'Error');
            }
        } catch (error) {
            statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Configuration Failed</small>';
            this.showToast('Failed to configure AI: ' + error.message, 'Error');
        }
    }

    updateTemperatureDisplay(value) {
        const display = document.getElementById('temperature-value');
        if (display) {
            display.textContent = value.toFixed(1);
        }
    }

    async openChatForCurrentPaper() {
        if (!this.isChatbotConfigured) {
            this.showToast('Please configure your AI provider in settings first', 'Error');
            this.showSettingsPage();
            return;
        }

        if (!this.currentPaper) {
            this.showToast('No paper selected for chat', 'Error');
            return;
        }

        const paperId = this.currentPaper.arxiv_id || this.currentPaper.id;
        if (!paperId) {
            this.showToast('Unable to identify paper for chat', 'Error');
            return;
        }

        try {
            // Open chat for the current paper
            await this.chatbot.openChat(paperId);
        } catch (error) {
            this.showToast('Failed to open chat: ' + error.message, 'Error');
        }
    }

    updateChatButtonVisibility() {
        const chatPaperBtn = document.getElementById('chat-paper-btn');
        const floatingChatBtn = document.getElementById('chat-button');

        if (this.isChatbotConfigured) {
            // Show chat buttons when AI is configured and we have HTML content
            if (chatPaperBtn && this.currentPaper && (this.currentPaper.content || this.currentPaper.html_available)) {
                chatPaperBtn.style.display = 'inline-block';
            }
            
            if (floatingChatBtn && this.currentPaper && (this.currentPaper.content || this.currentPaper.html_available)) {
                floatingChatBtn.style.display = 'flex';
            }
        } else {
            // Hide chat buttons when AI is not configured
            if (chatPaperBtn) chatPaperBtn.style.display = 'none';
            if (floatingChatBtn) floatingChatBtn.style.display = 'none';
        }
    }
}

// Initialize the application when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ArxivReaderApp();
});
