/**
 * Error Handler for ArXiv Reader
 * Provides centralized error handling and user-friendly error messages
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.setupGlobalHandlers();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'Global Error');
            event.preventDefault();
        });
    }

    /**
     * Handle error with context
     * @param {Error|string} error - Error object or message
     * @param {string} context - Context where error occurred
     * @param {Object} options - Additional options
     */
    handleError(error, context = 'Unknown', options = {}) {
        const errorInfo = this.parseError(error, context);
        
        // Log error
        this.logError(errorInfo);

        // Show user-friendly message unless silent
        if (!options.silent) {
            this.showErrorToUser(errorInfo, options.showDetails);
        }

        // Call custom error handler if provided
        if (options.onError && typeof options.onError === 'function') {
            options.onError(errorInfo);
        }

        return errorInfo;
    }

    /**
     * Parse error into standardized format
     * @param {Error|string} error - Error to parse
     * @param {string} context - Context information
     * @returns {Object} - Parsed error information
     */
    parseError(error, context) {
        const timestamp = new Date().toISOString();
        let message, stack, type;

        if (error instanceof Error) {
            message = error.message;
            stack = error.stack;
            type = error.name;
        } else if (typeof error === 'string') {
            message = error;
            stack = null;
            type = 'Error';
        } else {
            message = 'Unknown error occurred';
            stack = null;
            type = 'Unknown';
        }

        return {
            message,
            stack,
            type,
            context,
            timestamp,
            userMessage: this.getUserFriendlyMessage(message, context)
        };
    }

    /**
     * Convert technical error to user-friendly message
     * @param {string} message - Technical error message
     * @param {string} context - Error context
     * @returns {string} - User-friendly message
     */
    getUserFriendlyMessage(message, context) {
        // Network errors
        if (message.includes('fetch') || message.includes('network') || message.includes('NetworkError')) {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }

        // Timeout errors
        if (message.includes('timeout') || message.includes('timed out')) {
            return 'The request took too long to complete. Please try again.';
        }

        // API errors
        if (message.includes('401') || message.includes('Unauthorized')) {
            return 'Authentication failed. Please check your API key in settings.';
        }

        if (message.includes('403') || message.includes('Forbidden')) {
            return 'Access denied. Please check your permissions.';
        }

        if (message.includes('404') || message.includes('Not Found')) {
            return 'The requested resource was not found.';
        }

        if (message.includes('429') || message.includes('Too Many Requests')) {
            return 'Too many requests. Please wait a moment and try again.';
        }

        if (message.includes('500') || message.includes('Internal Server Error')) {
            return 'Server error occurred. Please try again later.';
        }

        // Validation errors
        if (message.includes('Invalid') || message.includes('invalid')) {
            return `Invalid input: ${message}`;
        }

        // Parsing errors
        if (message.includes('JSON') || message.includes('parse')) {
            return 'Failed to process server response. Please try again.';
        }

        // Storage errors
        if (message.includes('localStorage') || message.includes('storage')) {
            return 'Browser storage error. Your browser may be in private mode or storage may be full.';
        }

        // Context-specific messages
        if (context.includes('Chat')) {
            return `Chat error: ${message}. Please try reloading the page.`;
        }

        if (context.includes('Search')) {
            return `Search error: ${message}. Please try again with different keywords.`;
        }

        if (context.includes('Paper')) {
            return `Failed to load paper: ${message}`;
        }

        // Default message
        return 'An unexpected error occurred. Please try again later.';
    }

    /**
     * Log error to internal log
     * @param {Object} errorInfo - Error information
     */
    logError(errorInfo) {
        // Add to log
        this.errorLog.unshift(errorInfo);

        // Trim log if too large
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxLogSize);
        }

        // Console log for development
        console.error(`[${errorInfo.context}] ${errorInfo.message}`, errorInfo);
    }

    /**
     * Show error to user
     * @param {Object} errorInfo - Error information
     * @param {boolean} showDetails - Whether to show technical details
     */
    showErrorToUser(errorInfo, showDetails = false) {
        // Check if app instance exists and has showToast method
        if (typeof app !== 'undefined' && app.showToast) {
            const message = showDetails 
                ? `${errorInfo.userMessage}\n\nDetails: ${errorInfo.message}`
                : errorInfo.userMessage;
            
            app.showToast(message, 'Error');
        } else {
            // Fallback to alert if app not available
            alert(`Error: ${errorInfo.userMessage}`);
        }
    }

    /**
     * Wrap async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Context for error handling
     * @returns {Function} - Wrapped function
     */
    wrapAsync(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error, context);
                throw error; // Re-throw for caller to handle if needed
            }
        };
    }

    /**
     * Wrap function with try-catch
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context for error handling
     * @param {*} fallbackValue - Value to return on error
     * @returns {Function} - Wrapped function
     */
    wrapSync(fn, context, fallbackValue = null) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleError(error, context);
                return fallbackValue;
            }
        };
    }

    /**
     * Safe JSON parse with error handling
     * @param {string} jsonString - JSON string to parse
     * @param {*} fallback - Fallback value on error
     * @returns {*} - Parsed object or fallback
     */
    safeJSONParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.handleError(error, 'JSON Parse', { silent: true });
            return fallback;
        }
    }

    /**
     * Safe localStorage get
     * @param {string} key - Storage key
     * @param {*} fallback - Fallback value
     * @returns {*} - Stored value or fallback
     */
    safeLocalStorageGet(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? JSON.parse(value) : fallback;
        } catch (error) {
            this.handleError(error, 'LocalStorage Get', { silent: true });
            return fallback;
        }
    }

    /**
     * Safe localStorage set
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} - Success status
     */
    safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            this.handleError(error, 'LocalStorage Set', { silent: true });
            return false;
        }
    }

    /**
     * Get error log
     * @param {number} limit - Number of errors to return
     * @returns {Array} - Array of error objects
     */
    getErrorLog(limit = 10) {
        return this.errorLog.slice(0, limit);
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * Export error log as JSON
     * @returns {string} - JSON string of error log
     */
    exportErrorLog() {
        return JSON.stringify(this.errorLog, null, 2);
    }
}

// Create global instance
const errorHandler = new ErrorHandler();

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else {
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;
}
