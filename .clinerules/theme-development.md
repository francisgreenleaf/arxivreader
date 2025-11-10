## Brief overview
Guidelines for developing and maintaining visual themes in the ArXiv Reader project. These rules ensure consistency and proper implementation when working with CSS themes.

## Theme editing workflow
- Always examine all related theme files and assets before making changes to ensure color palette consistency
- Review the main styles.css file alongside theme-specific files (dark.css, light.css, academic.css)
- Check for CSS class overrides that may affect theme display (e.g., Bootstrap utility classes like `bg-light`)
- Test theme changes across all major UI components: sidebar, navigation, cards, forms, buttons, and content areas

## Color palette consistency
- Maintain a cohesive color scheme throughout all theme variables
- Ensure background colors are properly darkened/lightened relative to each other
- Verify that text colors have adequate contrast against their backgrounds
- Update both CSS custom properties and specific selector overrides when changing colors

## Dark theme best practices
- Use true dark colors (near-black) for backgrounds, not gray tones
- Add `!important` flags when overriding Bootstrap utility classes
- Test scrollbar styling to match the theme
- Ensure loading overlays and modals use appropriate opacity for readability
