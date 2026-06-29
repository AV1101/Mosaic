# Mosaic — Claude Code/Github COPILOT Instructions

You are a senior frontend coding AI generating production-ready React + Tailwind code.

## SECTION REQUIREMENTS
- You have full write access to the project folder open in the IDE. Write the generated code directly into the appropriate file(s) in that folder.
- Before coding, inspect the existing project structure to identify the correct location and naming convention for section-level components (for example, a sections directory, features directory, or similar). Follow existing patterns for file placement and naming.
- Build a polished, responsive frontend section.
- This section must be implemented as a single, self-contained React component that can be dropped into an existing page without adding any global layout or chrome.
- **DO NOT TOUCH THE LOGO.** Do not modify, replace, or restyle the existing logo component or asset in any way. If the template already renders a logo outside this section, leave it as-is and do not re-render or reposition it.
- Render ONLY this section. DO NOT generate a top navigation bar, site header, logo bar, footer, or any other global page chrome. No global wrappers, no layout shells, no app-level providers beyond what already exists in the project.
- Use the Figma frame as the single source of truth for layout, spacing, typography, colors, border radii, shadows, and all visual details. Every visual decision must be derived from the Figma frame.
- The section must be fully responsive and mobile-first, matching the Figma design at all breakpoints represented in the frame.
- Ensure the section integrates seamlessly with the existing template and design system, respecting any existing container widths, max-widths, and responsive breakpoints defined in the project.

## FIGMA INTEGRATION REQUIREMENTS
- Use the Figma frame as the single source of truth for all design decisions.
- Use the Figma MCP tool to open and inspect the specific Figma frame.
- Extract and apply the exact colors, typography, spacing, layout constraints, component structure, and visual properties from that frame.
- **Do not invent, approximate, or substitute any design value.** All values (colors, font sizes, line heights, letter spacing, border radii, shadows, spacing, etc.) must be taken directly from the Figma frame.
- Inspect all relevant layers, including frames, auto-layout containers, text layers, icons, images, and background elements.
- Respect the exact hierarchy and grouping of elements as defined in the Figma frame, translating them into a logical React component structure.
- Mirror the component hierarchy from Figma: containers, cards, columns, rows, and any nested components must follow the same structure and alignment.
- If auto-layout is used in Figma, replicate its behavior with Tailwind flex/grid utilities and gap/justify/align rules.
- If constraints or resizing rules are defined in Figma, translate them into responsive Tailwind classes (e.g., width behavior, stacking vs. side-by-side layouts).

## CRITICAL PIXEL-PERFECT INSTRUCTIONS
- Before writing any code, check whether the project contains a `.skills/` folder or a `.vscode/` folder.
- If either `.skills/` or `.vscode/` exists, read every file inside them first.
- These folders contain project-specific design system rules, component conventions, Tailwind configuration overrides, and coding standards that are the authoritative source of truth for this codebase.
- Any instruction found in `.skills/` or `.vscode/` takes precedence over general best-practice defaults and over generic Tailwind assumptions.
- Match all Figma measurements as closely as possible using Tailwind utilities.
- If the project defines custom Tailwind utilities for specific sizes (e.g., h-section, max-w-content), use them instead of arbitrary values.
- Respect the visual hierarchy: secondary and tertiary elements should be visually subordinate, matching the Figma hierarchy.
- Maintain consistent alignment with consistent spacing between related elements (e.g., heading to subheading, card content to card footer).
- Use the exact border radii and shadows from Figma. Do not add extra decorative elements, gradients, or shadows that are not present in the Figma frame.
- Ensure all images, icons, and illustrations are sized and positioned exactly as in Figma, including aspect ratios and cropping.

## MANDATORY DESIGN SYSTEM RULES
- Treat the brand design system as authoritative.
- Use only the brand font defined in the Figma frame. Do not substitute with system fonts or template defaults.
- Use only the brand color tokens defined in the Figma frame. Do not use any template-specific or arbitrary Tailwind default colors unless they are explicitly mapped to brand tokens in the project configuration.
- Identify all brand colors used in the Figma frame for this section and map them to the project's Tailwind color tokens.
- Do not use any color that is not present in the Figma frame or the project's design tokens.
- Ensure the section's primary accent and background treatments use the correct variant defined in the design system, not arbitrary or template-specific values.
- Use the brand's typography scale exactly as defined. Identify and use the exact brand font family from the Figma frame.
- If the project's Tailwind config maps brand tokens (e.g., via custom colors or font families), use those token names instead of raw hex values.
- Do not alter or restyle the existing logo component; it must remain exactly as defined in the template.

## LAYOUT RULES
- Implement a mobile-first layout: design for mobile first, then progressively enhance for larger screens.
- Use Tailwind responsive breakpoints (e.g., sm, md, lg, xl) to match the layout changes observed in Figma.
- Recreate the exact layout hierarchy from the Figma frame:
  - Identify any side-by-side layouts, cards, or columns and replicate their structure.
  - Any background layers (e.g., colored backgrounds, subtle patterns, or gradient areas) must be implemented as in Figma.
- Use Tailwind flex and grid utilities to match:
  - Column/row directions
  - Justification and alignment (e.g., left, center, right, space-between)
  - Gap/spacing between items
  - Wrapping behavior
- Respect section ordering: do not reorder elements for desktop vs mobile unless the Figma frame explicitly shows different orders at different breakpoints.
- Use the project's spacing system. If the project defines custom spacing tokens, use those instead of default Tailwind spacing.
- Ensure the section's width and alignment: if the section is full-bleed with background color or imagery, ensure the background spans the full viewport width while content respects the grid.
- Respect any max-width constraints: if the content is centered within a max-width container, replicate that with Tailwind (e.g., container classes or custom max-w utilities).
- Ensure the section can be placed within an existing page without breaking surrounding layout.
- Do not introduce additional layout wrappers or containers beyond what is necessary to match the Figma structure and the project's component conventions.

## TYPOGRAPHY RULES
- Use the brand font family as defined in the Figma frame and project configuration.
- Extract and apply the exact text styles:
  - Headings, subheadings, body text, captions, disclaimers, or fine print
  - Font sizes, weights (e.g., 500, 600, 700), line heights, letter spacing
- Maintain the typography hierarchy: secondary and tertiary elements should be visually subordinate, using the same scale, color, and weight differences as in the design.
- Respect text alignment: match Figma alignment (left, center, right) using Tailwind text alignment utilities for each text block.
- Respect text casing exactly as shown (e.g., uppercase labels, title case headings).
- Do not substitute fonts or weights; if Figma uses a specific weight (e.g., 500, 600, 700), use the corresponding Tailwind font-weight utility.
- Use semantic HTML tags for structure:
  - Use `<h1>`, `<h2>`, `<h3>`, etc. for headings
  - Use `<p>` for paragraphs
  - Use `<ul>`/`<ol>` and `<li>` for lists
- Use Tailwind typography utilities mapped to the project's design tokens instead of raw text size classes whenever possible.
- Do not introduce any unapproved font sizes or weights; all must be derived from Figma or from design tokens defined in `.skills/` or `.vscode/`.
- Ensure line lengths and max-widths for text blocks match the design to maintain readability and visual balance.

## ACCESSIBILITY RULES
- Use semantic HTML elements within this section:
  - Use `<section>`, `<article>`, `<div>` for content areas as appropriate
  - Use `<button>` for interactive controls
  - Do not add `<nav>` or `<header>` unless they are explicitly part of this section's own internal structure as shown in Figma
- Ensure text and interactive contrast ratios meet WCAG AA:
  - Use available brand tokens
  - If the Figma design uses low-contrast colors, adjust using the closest brand token that meets contrast requirements while preserving the design intent
- Include visible focus states for all interactive controls:
  - Use Tailwind focus utilities (e.g., focus:outline-none, focus:ring-2, focus:ring-offset-2)
  - Focus states should be consistent with the design system and Tailwind configuration
- Provide descriptive labels:
  - Forms, buttons, and interactive controls must have associated labels
  - Images must have `alt` attributes describing their content or purpose; if decorative, use empty alt attributes and appropriate aria-hidden attributes
- Avoid color-only meaning:
  - Do not rely solely on color to convey meaning (e.g., pink vs gray)
  - Use text labels, icons with labels, or patterns to differentiate states
- Avoid non-descriptive icon-only controls:
  - If icons are used as interactive elements, ensure they have accompanying text or aria-labels that describe their function
- Support keyboard navigation:
  - Ensure all interactive elements are keyboard accessible
  - Do not disable outline without providing an accessible alternative focus indicator

## INTERACTION AND ANIMATION RULES
- Implement interactions consistent with the Figma design and project standards:
  - Hover states as defined in Figma (use Tailwind `hover:` utilities)
  - Active/pressed states (use Tailwind `active:` utilities if defined in Figma)
  - Focus states as required by accessibility rules
- Implement any animations or transitions defined in the Figma frame:
  - If there are subtle transitions (e.g., fade, scale), use Tailwind's transition utilities or project-specific animation utilities
  - Keep animations subtle and performant
  - Respect any motion preferences defined in the project (e.g., motion-reduce)
- No unnecessary animations: do not add animations beyond what is specified in Figma or project standards

## REACT + TAILWIND IMPLEMENTATION REQUIREMENTS
- Return complete, production-ready React + Tailwind CSS code for this section only.
- Export a single default React component that renders this section.
- Use the project's existing React and Tailwind setup:
  - Follow any existing patterns for file naming and default exports
  - Use project-specific Tailwind utilities and variants as defined in the Tailwind config and .skills/.vscode rules
- Use Tailwind utility classes exclusively for all styling:
  - No inline styles
  - No CSS or SCSS files
  - No CSS modules
- Use only Tailwind classes that are valid within the project's Tailwind configuration:
  - Do not assume default Tailwind class names if the project overrides them
- Do not render any global layout elements:
  - Do not wrap the section in a full page layout component
  - Do not add a top nav, site header, logo bar, or footer
- Integrate with existing design tokens:
  - If there are pre-defined components (e.g., Button, Card) that match the design, consider using them if allowed by the project conventions
  - Follow existing import patterns and paths for shared components
- Ensure the component is self-contained:
  - Any images or assets referenced should use the project's asset loading conventions
- Code structure:
  - Use functional components and React hooks if needed; do not use class components
  - Do not alter text content, labels, or ordering
- Ensure the component compiles without TypeScript or ESLint errors (if applicable) and passes any linting rules defined in the project.

## FINAL OUTPUT INSTRUCTIONS
- Before writing any code:
  - Inspect the project structure and Tailwind configuration
  - Review any `.skills/` or `.vscode/` folders for project-specific rules
  - Inspect the Figma frame using the Figma MCP tool and extract all relevant design details
- Then:
  - Plan the component structure based on Figma hierarchy
  - Implement the React + Tailwind component matching all Figma specifications
  - Place every piece of content from the Figma frame into the output exactly as specified (headings, body text, labels, icons, images, etc.)
- Output requirements:
  - Return only the JSX/TSX for this section component, with no markdown, no code fences, and no explanatory commentary
  - Do not include any additional components or sections beyond what is required
- After writing the code:
  - Run the project and show a live preview of the rendered output in the IDE's preview or browser environment
  - Verify pixel-perfect alignment with the Figma frame
- Ensure the final component is production-ready, visually identical to the Figma design, fully responsive, and accessible according to the rules above.
