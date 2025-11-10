/**
 * Accessibility Utilities for ArXiv Reader
 * Provides helpers for keyboard navigation, ARIA labels, and screen reader support
 */

class AccessibilityManager {
    constructor() {
        this.focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
    }

    /**
     * Setup global keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key - close modals, dialogs, etc.
            if (e.key === 'Escape') {
                this.handleEscapeKey(e);
            }

            // Tab key - manage focus trapping in modals
            if (e.key === 'Tab') {
                this.handleTabKey(e);
            }

            // Arrow keys - navigate lists
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowKeys(e);
            }
        });
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Add visible focus indicators
        document.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('focus-visible-only')) {
                e.target.classList.add('has-focus');
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('focus-visible-only')) {
                e.target.classList.remove('has-focus');
            }
        });
    }

    /**
     * Handle Escape key press
     * @param {KeyboardEvent} event
     */
    handleEscapeKey(event) {
        // Close chatbot if open
        const chatContainer = document.getElementById('chatbot-container');
        if (chatContainer && chatContainer.style.display !== 'none') {
            const closeBtn = document.getElementById('close-chat-btn');
            if (closeBtn) {
                closeBtn.click();
                event.preventDefault();
            }
        }

        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        if (modals.length > 0) {
            modals[modals.length - 1].querySelector('[data-bs-dismiss="modal"]')?.click();
            event.preventDefault();
        }
    }

    /**
     * Handle Tab key for focus trapping
     * @param {KeyboardEvent} event
     */
    handleTabKey(event) {
        const activeModal = document.querySelector('.modal.show');
        if (activeModal) {
            this.trapFocus(activeModal, event);
        }

        const chatContainer = document.getElementById('chatbot-container');
        if (chatContainer && chatContainer.style.display !== 'none') {
            this.trapFocus(chatContainer, event);
        }
    }

    /**
     * Handle arrow key navigation
     * @param {KeyboardEvent} event
     */
    handleArrowKeys(event) {
        const target = event.target;

        // Navigate through thread list
        if (target.closest('.thread-item')) {
            const threadList = target.closest('.thread-list-content');
            if (threadList) {
                this.navigateList(threadList, '.thread-item', event);
            }
        }

        // Navigate through paper cards
        if (target.closest('.paper-card')) {
            const papersList = document.getElementById('papers-list');
            if (papersList) {
                this.navigateList(papersList, '.paper-card', event);
            }
        }
    }

    /**
     * Trap focus within a container
     * @param {HTMLElement} container - Container to trap focus in
     * @param {KeyboardEvent} event - Keyboard event
     */
    trapFocus(container, event) {
        const focusableElements = Array.from(
            container.querySelectorAll(this.focusableSelectors)
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }

    /**
     * Navigate through a list with arrow keys
     * @param {HTMLElement} container - List container
     * @param {string} itemSelector - Selector for list items
     * @param {KeyboardEvent} event - Keyboard event
     */
    navigateList(container, itemSelector, event) {
        const items = Array.from(container.querySelectorAll(itemSelector));
        const currentIndex = items.findIndex(item => 
            item.contains(document.activeElement) || item === document.activeElement
        );

        if (currentIndex === -1) return;

        let nextIndex;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % items.length;
            event.preventDefault();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + items.length) % items.length;
            event.preventDefault();
        }

        if (nextIndex !== undefined) {
            const nextItem = items[nextIndex];
            const focusableChild = nextItem.querySelector(this.focusableSelectors);
            (focusableChild || nextItem).focus();
        }
    }

    /**
     * Add ARIA attributes to an element
     * @param {HTMLElement} element - Element to update
     * @param {Object} attributes - ARIA attributes to add
     */
    setAriaAttributes(element, attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
            element.setAttribute(ariaKey, value);
        });
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - Priority level ('polite' or 'assertive')
     */
    announce(message, priority = 'polite') {
        const announcer = this.getOrCreateAnnouncer(priority);
        announcer.textContent = message;
        
        // Clear after a delay
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }

    /**
     * Get or create live region for announcements
     * @param {string} priority - Priority level
     * @returns {HTMLElement} - Live region element
     */
    getOrCreateAnnouncer(priority) {
        const id = `aria-live-${priority}`;
        let announcer = document.getElementById(id);
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = id;
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            document.body.appendChild(announcer);
        }
        
        return announcer;
    }

    /**
     * Make element keyboard accessible
     * @param {HTMLElement} element - Element to make accessible
     * @param {Function} onClick - Click handler
     * @param {string} role - ARIA role
     */
    makeKeyboardAccessible(element, onClick, role = 'button') {
        if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
        
        if (role) {
            element.setAttribute('role', role);
        }

        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
            }
        });

        element.addEventListener('click', onClick);
    }

    /**
     * Add skip link for keyboard navigation
     * @param {string} targetId - ID of target element
     * @param {string} label - Label for skip link
     */
    addSkipLink(targetId, label = 'Skip to main content') {
        const skipLink = document.createElement('a');
        skipLink.href = `#${targetId}`;
        skipLink.className = 'skip-link';
        skipLink.textContent = label;
        skipLink.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(targetId);
            if (target) {
                target.focus();
                target.scrollIntoView();
            }
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Update page title for navigation
     * @param {string} title - New page title
     */
    updatePageTitle(title) {
        document.title = `${title} - ArXiv Reader`;
        this.announce(`Now viewing: ${title}`);
    }

    /**
     * Add loading state with ARIA
     * @param {HTMLElement} element - Element in loading state
     * @param {string} label - Loading label
     */
    setLoadingState(element, label = 'Loading') {
        element.setAttribute('aria-busy', 'true');
        element.setAttribute('aria-label', label);
    }

    /**
     * Remove loading state
     * @param {HTMLElement} element - Element to update
     */
    removeLoadingState(element) {
        element.removeAttribute('aria-busy');
    }

    /**
     * Set up accessible form field
     * @param {HTMLElement} field - Form field element
     * @param {string} labelText - Label text
     * @param {string} helpText - Help text (optional)
     * @param {boolean} required - Whether field is required
     */
    setupFormField(field, labelText, helpText = null, required = false) {
        const fieldId = field.id || `field_${Date.now()}`;
        field.id = fieldId;

        // Add label
        let label = document.querySelector(`label[for="${fieldId}"]`);
        if (!label) {
            label = document.createElement('label');
            label.setAttribute('for', fieldId);
            label.textContent = labelText;
            field.parentNode.insertBefore(label, field);
        }

        // Add required indicator
        if (required) {
            field.setAttribute('required', 'required');
            field.setAttribute('aria-required', 'true');
            if (!label.textContent.includes('*')) {
                label.innerHTML += ' <span aria-label="required">*</span>';
            }
        }

        // Add help text
        if (helpText) {
            const helpId = `${fieldId}_help`;
            let helpElement = document.getElementById(helpId);
            if (!helpElement) {
                helpElement = document.createElement('small');
                helpElement.id = helpId;
                helpElement.className = 'form-text';
                helpElement.textContent = helpText;
                field.parentNode.insertBefore(helpElement, field.nextSibling);
            }
            field.setAttribute('aria-describedby', helpId);
        }
    }

    /**
     * Set error state on form field
     * @param {HTMLElement} field - Form field
     * @param {string} errorMessage - Error message
     */
    setFieldError(field, errorMessage) {
        field.setAttribute('aria-invalid', 'true');
        
        const errorId = `${field.id}_error`;
        let errorElement = document.getElementById(errorId);
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'invalid-feedback';
            errorElement.setAttribute('role', 'alert');
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = errorMessage;
        field.setAttribute('aria-describedby', 
            [field.getAttribute('aria-describedby'), errorId]
                .filter(Boolean)
                .join(' ')
        );
        
        this.announce(errorMessage, 'assertive');
    }

    /**
     * Clear error state from form field
     * @param {HTMLElement} field - Form field
     */
    clearFieldError(field) {
        field.removeAttribute('aria-invalid');
        const errorId = `${field.id}_error`;
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Add accessible tooltips
     * @param {HTMLElement} element - Element to add tooltip to
     * @param {string} text - Tooltip text
     */
    addTooltip(element, text) {
        element.setAttribute('aria-label', text);
        element.setAttribute('title', text);
    }

    /**
     * Set up accessible modal
     * @param {HTMLElement} modal - Modal element
     * @param {string} labelId - ID of element labeling the modal
     */
    setupModal(modal, labelId) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        if (labelId) {
            modal.setAttribute('aria-labelledby', labelId);
        }
        
        // Store last focused element
        let lastFocused;
        modal.addEventListener('show', () => {
            lastFocused = document.activeElement;
        });
        
        modal.addEventListener('hidden', () => {
            if (lastFocused) {
                lastFocused.focus();
            }
        });
    }
}

// Create global instance
const accessibilityManager = new AccessibilityManager();

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
} else {
    window.AccessibilityManager = AccessibilityManager;
    window.accessibilityManager = accessibilityManager;
}
