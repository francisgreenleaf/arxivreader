// Theme Manager for ArXiv Reader
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.defaultTheme = 'light';
        this.loadedThemes = new Set();
        this.themeConfigs = {
            light: {
                id: 'light',
                name: 'Light Theme',
                description: 'Clean and bright theme for comfortable reading',
                category: ['light', 'minimal'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            dark: {
                id: 'dark',
                name: 'Dark Theme',
                description: 'Easy on the eyes for low-light environments',
                category: ['dark', 'minimal'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            academic: {
                id: 'academic',
                name: 'Academic Theme',
                description: 'Traditional serif fonts optimized for academic reading',
                category: ['light', 'professional'],
                fonts: {
                    body: '"Times New Roman", Times, "Liberation Serif", serif',
                    heading: '"Times New Roman", Times, "Liberation Serif", serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            'solarized-light': {
                id: 'solarized-light',
                name: 'Solarized Light',
                description: 'Precision-engineered color palette designed for reduced eye fatigue',
                category: ['light', 'professional'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            'solarized-dark': {
                id: 'solarized-dark',
                name: 'Solarized Dark',
                description: 'Precision-engineered dark palette designed for reduced eye fatigue',
                category: ['dark', 'professional'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            sepia: {
                id: 'sepia',
                name: 'Sepia/Vintage',
                description: 'Warm nostalgic aesthetic inspired by aged paper and vintage books',
                category: ['light', 'warm'],
                fonts: {
                    body: '"Georgia", "Times New Roman", Times, serif',
                    heading: '"Georgia", "Times New Roman", Times, serif',
                    monospace: '"Courier New", Courier, monospace'
                }
            },
            'high-contrast': {
                id: 'high-contrast',
                name: 'High Contrast',
                description: 'Maximum accessibility with WCAG AAA compliant colors',
                category: ['light', 'accessible'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            cyberpunk: {
                id: 'cyberpunk',
                name: 'Cyberpunk/Neon',
                description: 'Futuristic aesthetic with vibrant neon accents',
                category: ['dark', 'colorful'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            nord: {
                id: 'nord',
                name: 'Nord/Arctic',
                description: 'Cool, calming palette inspired by arctic landscapes',
                category: ['dark', 'professional'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            },
            nature: {
                id: 'nature',
                name: 'Nature/Forest',
                description: 'Earth tones inspired by nature, promoting calm and focus',
                category: ['light', 'warm'],
                fonts: {
                    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }
            }
        };

        // Initialize theme system
        this.init();
    }

    async init() {
        // Load saved theme preference or use default
        try {
            const savedTheme = localStorage.getItem('arxiv-reader-theme') || this.defaultTheme;
            await this.loadTheme(savedTheme);
        } catch (error) {
            console.warn('Failed to load saved theme, using default:', error);
            await this.loadTheme(this.defaultTheme);
        }
    }

    getAvailableThemes() {
        return Object.values(this.themeConfigs);
    }

    getCurrentTheme() {
        return this.themeConfigs[this.currentTheme];
    }

    async loadTheme(themeId) {
        if (!this.themeConfigs[themeId]) {
            console.warn(`Theme '${themeId}' not found, using default theme`);
            themeId = this.defaultTheme;
        }

        try {
            // Load theme CSS if not already loaded
            if (!this.loadedThemes.has(themeId)) {
                await this.loadThemeCSS(themeId);
                this.loadedThemes.add(themeId);
            }

            // Apply theme
            await this.applyTheme(themeId);
            this.currentTheme = themeId;

            // Save preference
            localStorage.setItem('arxiv-reader-theme', themeId);

            // Trigger theme change event
            this.dispatchThemeChangeEvent(themeId);

            return true;
        } catch (error) {
            console.error(`Failed to load theme '${themeId}':`, error);
            return false;
        }
    }

    async loadThemeCSS(themeId) {
        return new Promise((resolve, reject) => {
            // Skip loading CSS for light theme as it's the base
            if (themeId === 'light') {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = `/css/themes/${themeId}.css`;
            link.id = `theme-${themeId}`;

            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load CSS for theme: ${themeId}`));

            // Check if already loaded
            if (!document.getElementById(`theme-${themeId}`)) {
                document.head.appendChild(link);
            } else {
                resolve();
            }
        });
    }

    async applyTheme(themeId) {
        const themeConfig = this.themeConfigs[themeId];
        
        // Remove all existing theme classes
        const allThemeClasses = Object.keys(this.themeConfigs).map(id => `theme-${id}`);
        document.documentElement.classList.remove(...allThemeClasses);
        
        // Add new theme class
        document.documentElement.classList.add(`theme-${themeId}`);

        // Apply font preferences
        this.applyFontSettings(themeConfig.fonts);

        // Set theme attribute for CSS targeting
        document.documentElement.setAttribute('data-theme', themeId);
    }

    applyFontSettings(fonts) {
        const root = document.documentElement;
        
        // Apply font families as CSS custom properties
        root.style.setProperty('--font-family-base', fonts.body);
        root.style.setProperty('--font-family-headings', fonts.heading);
        root.style.setProperty('--font-family-monospace', fonts.monospace);
    }

    applyFontSize(multiplier = 1.0) {
        const root = document.documentElement;
        
        // Apply font size multiplier
        root.style.setProperty('--font-size-multiplier', multiplier);
        
        // Save preference
        localStorage.setItem('arxiv-reader-font-size', multiplier.toString());
    }

    getFontSizeMultiplier() {
        const saved = localStorage.getItem('arxiv-reader-font-size');
        return saved ? parseFloat(saved) : 1.0;
    }

    dispatchThemeChangeEvent(themeId) {
        const event = new CustomEvent('themeChanged', {
            detail: {
                themeId: themeId,
                themeConfig: this.themeConfigs[themeId]
            }
        });
        document.dispatchEvent(event);
    }

    // Utility method to get theme preference for API calls
    getThemePreferences() {
        return {
            selectedTheme: this.currentTheme,
            customFontSize: this.getFontSizeMultiplier(),
            availableThemes: Object.keys(this.themeConfigs)
        };
    }

    // Method to update theme preferences from API response
    updateFromPreferences(themePreferences) {
        if (themePreferences) {
            const { selectedTheme, customFontSize } = themePreferences;
            
            if (selectedTheme && selectedTheme !== this.currentTheme) {
                this.loadTheme(selectedTheme);
            }
            
            if (customFontSize) {
                this.applyFontSize(customFontSize);
            }
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
