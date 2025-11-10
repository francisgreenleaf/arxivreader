# Implementation Plan

[Overview]
Upgrade the chatbot user interface to modern, accessible, and best-practice standards.

This enhancement addresses usability, accessibility, responsiveness, and theme consistency, leveraging industry best practices for conversational AI products. The changes aim to create a delightful user experience across all devices and themes, introduce modern visual polish, and ensure a robust foundation for further chatbot innovation.

[Types]
Extend and formalize type definitions for message objects, theme tokens, and UI state.

- **ChatMessage**:  
  - id: string  
  - sender: "user" | "bot"  
  - content: string | Renderable[]  
  - timestamp: ISO string  
  - status?: "pending" | "error" | "sent"
  - attachments?: File[]
- **ThemeTokens**:  
  - colorBackground: string  
  - colorForeground: string  
  - colorAccent: string  
  - colorBubbleUser/Bot: string  
  - fontSizes, borderRadii, etc.

[Files]
Refactor and expand front-end and styling files for modularity, maintainability, and improved visual experience.

- **New Files**:
  - src/public/js/components/ChatBubble.js — single chat message rendering logic
  - src/public/js/components/TypingIndicator.js — animated bot "typing" feedback
  - src/public/css/chatbot-modern.css — new modular stylesheet for modern chat patterns
  - src/public/css/accessibility.css — ARIA/contrast/keyboard focus helpers
- **Existing files to modify**:
  - src/public/js/app.js — integrate new UI logic
  - src/public/js/chatbot-ui.js — refactor for new component structure and patterns
  - src/public/css/styles.css — rework layout and remove obsolete rules
  - src/public/css/themes/*.css — update for palette consistency and fine-tune variables
  - src/public/index.html — add container structure for new UI and accessibility roles
- **Files to delete/move**:
  - Legacy static assets (identified during refactor)
- **Configuration updates**:
  - Update theme variable references where necessary

[Functions]
Add modular rendering and interaction handlers for new UI elements.

- **New functions**:
  - renderChatBubble(message: ChatMessage): HTMLElement
  - renderTypingIndicator(): HTMLElement
  - scrollToLatestMessage()
  - handleThemeSwitch(theme: string)
- **Modified functions**:
  - Existing send/receive logic in app.js and chatbot-ui.js to use new types/components
  - Input handler for multiline/expanded input and keyboard shortcuts
- **Removed functions**:
  - Outdated message display logic in chatbot-ui.js/app.js; replace with modular renderers

[Classes]
Restructure for component-based rendering and reusable CSS classes.

- **New classes**:
  - ChatBubble (JS module, BEM CSS class)
  - TypingIndicator (JS module, CSS animation class)
  - ThemeManager enhancements for live theme switching and variable injection
- **Modified classes**:
  - Chatbot UI container/classes refactored for accessibility and layout
  - Theme-* CSS classes updated for new tokens and palette rules
- **Removed classes**:
  - Obsolete legacy styling/layout classes

[Dependencies]
Upgrade or introduce packages for UI consistency and accessibility.

- Add:  
  - (Optional) Lightweight icons package  
  - (Optional) ARIA helper utilities
- Remove:
  - (If present) conflicting or deprecated style/script libraries

[Testing]
Comprehensive QA across themes, devices, and accessibility requirements.

- Create/modify test plan in TESTING.md
- Cross-theme/viewport visual checks
- Accessibility (contrast, tabbing, ARIA) audits
- User acceptance: gather feedback for UI/UX iteration

[Implementation Order]
Follow this sequence to minimize conflicts:

1. Define/extend types for chat data and themes
2. Scaffold new component files and restructure style sheets
3. Refactor JS/CSS for new rendering and interaction patterns
4. Integrate accessibility enhancements and ARIA support
5. Validate cross-theme and responsive behavior
6. Perform accessibility and user testing
7. Polish, iterate, and document changes
