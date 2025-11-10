/**
 * Input Validation Utilities for ArXiv Reader
 * Provides validation functions for user inputs and data sanitization
 */

class ValidationUtils {
    /**
     * Validate ArXiv ID format
     * @param {string} arxivId - ArXiv ID to validate
     * @returns {Object} - {valid: boolean, error: string|null, sanitized: string}
     */
    static validateArxivId(arxivId) {
        if (!arxivId || typeof arxivId !== 'string') {
            return { valid: false, error: 'ArXiv ID is required', sanitized: '' };
        }

        const trimmed = arxivId.trim();
        
        // ArXiv ID patterns: YYMM.NNNNN or YYMM.NNNNNvN or archive/YYMMNNN
        const patterns = [
            /^\d{4}\.\d{4,5}(v\d+)?$/, // New format: 2401.12345 or 2401.12345v1
            /^[a-z-]+\/\d{7}$/ // Old format: cs/0123456
        ];

        const isValid = patterns.some(pattern => pattern.test(trimmed));

        return {
            valid: isValid,
            error: isValid ? null : 'Invalid ArXiv ID format',
            sanitized: trimmed
        };
    }

    /**
     * Validate and sanitize search keywords
     * @param {string} keyword - Keyword to validate
     * @returns {Object} - {valid: boolean, error: string|null, sanitized: string}
     */
    static validateKeyword(keyword) {
        if (!keyword || typeof keyword !== 'string') {
            return { valid: false, error: 'Keyword cannot be empty', sanitized: '' };
        }

        const trimmed = keyword.trim();

        // Check length
        if (trimmed.length === 0) {
            return { valid: false, error: 'Keyword cannot be empty', sanitized: '' };
        }

        if (trimmed.length > 100) {
            return { valid: false, error: 'Keyword too long (max 100 characters)', sanitized: '' };
        }

        // Check for malicious patterns
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+=/i, // Event handlers
            /data:text\/html/i
        ];

        if (dangerousPatterns.some(pattern => pattern.test(trimmed))) {
            return { valid: false, error: 'Keyword contains invalid characters', sanitized: '' };
        }

        // Sanitize: remove excessive special characters but allow basic punctuation
        const sanitized = trimmed.replace(/[<>'"]/g, '');

        return {
            valid: true,
            error: null,
            sanitized: sanitized
        };
    }

    /**
     * Validate chat message
     * @param {string} message - Chat message to validate
     * @returns {Object} - {valid: boolean, error: string|null, sanitized: string}
     */
    static validateChatMessage(message) {
        if (!message || typeof message !== 'string') {
            return { valid: false, error: 'Message cannot be empty', sanitized: '' };
        }

        const trimmed = message.trim();

        // Check length
        if (trimmed.length === 0) {
            return { valid: false, error: 'Message cannot be empty', sanitized: '' };
        }

        if (trimmed.length > 10000) {
            return { valid: false, error: 'Message too long (max 10,000 characters)', sanitized: '' };
        }

        // Basic XSS prevention - escape HTML entities
        const sanitized = this.escapeHtml(trimmed);

        return {
            valid: true,
            error: null,
            sanitized: sanitized
        };
    }

    /**
     * Validate thread title
     * @param {string} title - Thread title to validate
     * @returns {Object} - {valid: boolean, error: string|null, sanitized: string}
     */
    static validateThreadTitle(title) {
        if (!title || typeof title !== 'string') {
            return { valid: false, error: 'Title cannot be empty', sanitized: '' };
        }

        const trimmed = title.trim();

        if (trimmed.length === 0) {
            return { valid: false, error: 'Title cannot be empty', sanitized: '' };
        }

        if (trimmed.length > 200) {
            return { valid: false, error: 'Title too long (max 200 characters)', sanitized: '' };
        }

        const sanitized = this.escapeHtml(trimmed);

        return {
            valid: true,
            error: null,
            sanitized: sanitized
        };
    }

    /**
     * Validate API key format
     * @param {string} apiKey - API key to validate
     * @returns {Object} - {valid: boolean, error: string|null}
     */
    static validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return { valid: false, error: 'API key is required' };
        }

        const trimmed = apiKey.trim();

        if (trimmed.length < 10) {
            return { valid: false, error: 'API key appears too short' };
        }

        if (trimmed.length > 500) {
            return { valid: false, error: 'API key appears too long' };
        }

        // Check for basic format (alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            return { valid: false, error: 'API key contains invalid characters' };
        }

        return {
            valid: true,
            error: null
        };
    }

    /**
     * Validate numeric range input
     * @param {number} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {string} fieldName - Name of field for error message
     * @returns {Object} - {valid: boolean, error: string|null, sanitized: number}
     */
    static validateNumericRange(value, min, max, fieldName = 'Value') {
        const num = Number(value);

        if (isNaN(num)) {
            return { valid: false, error: `${fieldName} must be a number`, sanitized: min };
        }

        if (num < min) {
            return { valid: false, error: `${fieldName} must be at least ${min}`, sanitized: min };
        }

        if (num > max) {
            return { valid: false, error: `${fieldName} must be at most ${max}`, sanitized: max };
        }

        return {
            valid: true,
            error: null,
            sanitized: num
        };
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {Object} - {valid: boolean, error: string|null}
     */
    static validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required' };
        }

        try {
            const urlObj = new URL(url);
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
            }
            return { valid: true, error: null };
        } catch (e) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Sanitize filename
     * @param {string} filename - Filename to sanitize
     * @returns {string} - Sanitized filename
     */
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'file';
        }

        // Remove path separators and dangerous characters
        return filename
            .replace(/[\/\\]/g, '_')
            .replace(/[<>:"|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 255); // Limit length
    }

    /**
     * Rate limiting check (simple client-side implementation)
     * @param {string} key - Unique key for this action
     * @param {number} maxRequests - Maximum requests allowed
     * @param {number} timeWindow - Time window in milliseconds
     * @returns {Object} - {allowed: boolean, resetIn: number}
     */
    static checkRateLimit(key, maxRequests, timeWindow) {
        const storageKey = `rateLimit_${key}`;
        const now = Date.now();
        
        let rateLimitData = localStorage.getItem(storageKey);
        
        if (!rateLimitData) {
            rateLimitData = { requests: [], windowStart: now };
        } else {
            try {
                rateLimitData = JSON.parse(rateLimitData);
            } catch (e) {
                rateLimitData = { requests: [], windowStart: now };
            }
        }

        // Clean up old requests outside the time window
        rateLimitData.requests = rateLimitData.requests.filter(
            timestamp => now - timestamp < timeWindow
        );

        // Check if limit exceeded
        if (rateLimitData.requests.length >= maxRequests) {
            const oldestRequest = Math.min(...rateLimitData.requests);
            const resetIn = timeWindow - (now - oldestRequest);
            return { allowed: false, resetIn: resetIn };
        }

        // Add new request
        rateLimitData.requests.push(now);
        localStorage.setItem(storageKey, JSON.stringify(rateLimitData));

        return { allowed: true, resetIn: 0 };
    }
}

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
} else {
    window.ValidationUtils = ValidationUtils;
}
