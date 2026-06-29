from __future__ import annotations

from typing import Any

GENERAL_SYSTEM_PROMPT = """Write a highly comprehensive plain-text prompt for a frontend coding AI.

Output only these sections, in this order:
- USER SELECTION:
- FIGMA FILE:
- RULES:

Do not add any other sections.
Do not output code or markdown fences.
Rules for output quality:
- The RULES section must be detailed and implementation-grade, typically 2000+ tokens when enough input detail is available.
- Include concrete guidance for layout, spacing, typography, color, states, accessibility, responsive behavior, and edge cases.
- Prefer specific implementation instructions over generic advice.
"""

SIZE_DIMENSIONS = {
    "small": (92, 32),
    "medium": (100, 40),
    "large": (108, 48),
}

THEME_BACKGROUNDS = {
    "Light": "#F6F6F6",
    "Dark": "#303030",
}


class ComponentPromptCompiler:
    SYSTEM_PROMPT = """Write a highly comprehensive plain-text prompt for a frontend coding AI.

Output only these sections, in this order:
- USER SELECTION:
- FIGMA FILE:
- RULES:

Do not add any other sections.
Do not output code or markdown fences.
Rules for output quality:
- The RULES section must be detailed and implementation-grade, typically 2000+ tokens when enough input detail is available.
- Include concrete guidance for layout, spacing, typography, color, states, accessibility, responsive behavior, and edge cases.
- Prefer specific implementation instructions over generic advice.
"""

    def compile(
        self,
        component_type: str,
        config: dict[str, Any],
        color_tokens: dict[str, Any],
        typography_style: dict[str, Any],
        typography_underlined: dict[str, Any],
        figma_frame_url: str = "",
        figma_file_url_2: str = "",
        input_config: dict | None = None,
    ) -> str:
        btn_type = config.get("type", "primary")
        size = config.get("size", "medium")
        theme = config.get("theme", "Light")
        has_label = config.get("has_label", True)
        label = config.get("label", "Button") if has_label else ""
        has_icon = config.get("has_icon", False)
        icon_position = config.get("icon_position", "none")
        icon_name = config.get("icon_name", "")

        width, height = SIZE_DIMENSIONS.get(size, (100, 40))
        _ = color_tokens
        _ = typography_style
        _ = typography_underlined
        _ = input_config

        # --- Content mode ---
        if has_label and not has_icon:
            content_mode = "text only"
            content_spec = f'Label: "{label}"'
        elif has_icon and not has_label:
            content_mode = "icon only (no text)"
            content_spec = f'Icon: "{icon_name}"'
        else:
            pos_label = {"left": "icon left of text", "right": "icon right of text", "only": "icon only"}.get(icon_position, "icon left of text")
            content_mode = f"icon + text ({pos_label})"
            if icon_position == "right":
                content_spec = f'Text: "{label}", then icon "{icon_name}"'
            else:
                content_spec = f'Icon "{icon_name}", then text: "{label}"'

        figma_value = figma_frame_url if figma_frame_url else "none"
        
        # Build RULES section with optional reference/rules URL
        rules_section = "- Read the .skills/ and .vscode/ folders carefully.\n- Implement exactly one button for the selected configuration only.\n- Include all states for that one button: default, hover, pressed, and disabled.\n- Do not implement other variants, sizes, themes, or extra components.\n- Use only the provided content selections; no placeholder content.\n- If a Figma URL is provided, visuals must follow that Figma frame.\n- Output one production-ready React + TypeScript + Tailwind component."
        
        if figma_file_url_2:
            rules_section += f"\n- Rules/Reference document: {figma_file_url_2}"

        return f"""USER SELECTION:
- Component: {component_type.title()}
- Variant: {btn_type}
- Size: {size} ({width}x{height}px)
- Theme: {theme}
- Content mode: {content_mode}
- Content: {content_spec}

FIGMA FILE:
- Frame URL: {figma_value}

RULES:
{rules_section}
"""


    def compile_general(
        self,
        component_type: str,
        figma_frame_url: str = "",
        figma_file_url_2: str = "",
        input_config: dict | None = None,
    ) -> str:
        cfg = input_config or {}
        text_fields: list[str] = cfg.get("text_fields", []) or cfg.get("textFields", [])
        icon_slots: list[str] = cfg.get("icon_only_slots", []) or cfg.get("iconOnlySlots", [])
        icon_text_slots: list[str] = cfg.get("icon_text_slots", []) or cfg.get("iconTextSlots", [])
        image_urls: list[str] = cfg.get("image_urls", []) or cfg.get("imageUrls", [])
        form_fields: list[dict[str, Any]] = cfg.get("form_fields", []) or cfg.get("formFields", [])
        section_name = str(cfg.get("section_name", "") or cfg.get("sectionName", "")).strip()
        fields_per_row = cfg.get("fields_per_row", cfg.get("fieldsPerRow", 0))
        table_config: dict[str, Any] = cfg.get("table_config", {}) or cfg.get("tableConfig", {})
        top_navigation: dict[str, Any] = cfg.get("top_navigation", {}) or cfg.get("topNavigation", {})
        side_navigation: dict[str, Any] = cfg.get("side_navigation", {}) or cfg.get("sideNavigation", {})

        content_lines: list[str] = []
        for i, t in enumerate(text_fields, 1):
            if t:
                content_lines.append(f"T{i}: {t}")
        for i, ic in enumerate(icon_slots, 1):
            if ic:
                content_lines.append(f"I{i}: {ic}")
        for i, it in enumerate(icon_text_slots, 1):
            if it:
                content_lines.append(f"IT{i}: {it}")
        for i, img in enumerate(image_urls, 1):
            if img:
                content_lines.append(f"image{i}: {img}")

        has_mandatory_form_fields = False
        has_textarea_form_fields = False
        for index, field in enumerate(form_fields, 1):
            if not isinstance(field, dict):
                continue
            label = str(field.get("label", "")).strip() or f"Field {index}"
            field_type = str(field.get("type", "text")).strip() or "text"
            mandatory = bool(field.get("mandatory"))
            character_limit = field.get("character_limit", field.get("characterLimit"))
            has_mandatory_form_fields = has_mandatory_form_fields or mandatory
            is_textarea = field_type == "textarea"
            has_textarea_form_fields = has_textarea_form_fields or is_textarea
            textarea_suffix = ""
            if is_textarea and character_limit not in (None, ""):
                textarea_suffix = f" (character limit: {character_limit})"
            if mandatory:
                content_lines.append(
                    f"Form field {index}: {label} (*) [{field_type}]{textarea_suffix} (mandatory; show red asterisk next to label)"
                )
            else:
                content_lines.append(f"Form field {index}: {label} [{field_type}]{textarea_suffix} (optional)")

        if section_name:
            content_lines.append(f"Form section name: {section_name}")
        if fields_per_row:
            content_lines.append(f"Form fields per row: {fields_per_row}")

        if table_config:
            table_mode = table_config.get("mode", "light")
            table_type = table_config.get("valueType", table_config.get("value_type", "text"))
            table_rows = table_config.get("rows", 0)
            table_cols = table_config.get("cols", 0)
            table_matrix = table_config.get("matrix", [])

            content_lines.append(f"Table mode: {table_mode}")
            content_lines.append(f"Table type: {table_type}")
            if table_rows and table_cols:
                content_lines.append(f"Table size: {table_rows}x{table_cols}")

            for row_index, row in enumerate(table_matrix, 1):
                if isinstance(row, list):
                    row_values = [str(cell).strip() for cell in row]
                    if any(row_values):
                        content_lines.append(f"Row {row_index}: {' | '.join(row_values)}")

        if top_navigation:
            content_lines.append(f"Top navigation mode: {top_navigation.get('mode', 'Light')}")
            content_lines.append(f"Profile toggle: {'on' if top_navigation.get('profile_toggle') else 'off'}")
            content_lines.append(f"Notification toggle: {'on' if top_navigation.get('notification_toggle') else 'off'}")
            content_lines.append(f"Nav buttons: {top_navigation.get('navigation_alignment', 'None')}")
            content_lines.append(f"Grid: {top_navigation.get('grid', 'None')}")

        if side_navigation:
            content_lines.append(f"Side navigation mode: {side_navigation.get('mode', 'Light')}")
            content_lines.append(f"Side navigation style: {side_navigation.get('style', 'Neumorphic')}")
            content_lines.append(f"Side navigation grid spacing: {side_navigation.get('grid_spacing', 'Compact')}")
            content_lines.append(f"Side navigation type: {side_navigation.get('type', 'Fixed')}")

        selected_content = "\n".join(f"- {line}" for line in content_lines) if content_lines else "- none"
        figma_value = figma_frame_url if figma_frame_url else "none"
        
        rules_section = """- Implement only this selected component and do not add extra sections, pages, or unrelated UI.
- Treat the USER SELECTION section as hard requirements. Every listed value must be represented in output.
- Produce production-ready React + TypeScript + Tailwind output with clean structure and reusable local helpers where useful.
- Match visual intent from Figma exactly when a Frame URL is provided: spacing, hierarchy, alignment, radii, shadows, colors, and typography.
- Build mobile-first, then scale through breakpoints. Ensure content remains readable and functional at all sizes.
- Use semantic HTML and robust accessibility defaults (labels, keyboard navigation, focus-visible states, sufficient contrast, ARIA where needed).
- Include complete interaction states for interactive elements (default, hover, focus, active/pressed, disabled where applicable).
- Preserve deterministic rendering: avoid randomness and avoid placeholder text not present in USER SELECTION.
- Keep spacing and sizing systems consistent; avoid arbitrary style drift between sibling elements.
- For lists, repeated items, and dynamic values, enforce stable keys and safe rendering logic.
- Handle empty and edge-case states gracefully (missing values, long text, small viewport, no optional assets).
- If icons or images are provided, ensure sizing/aspect ratio rules are explicit and consistent with layout.
- Avoid global layout wrappers and avoid modifying unrelated app chrome unless explicitly requested.
- Keep class naming/util usage maintainable and avoid dead code, unused imports, and unreachable branches.

- Layout Implementation Checklist:
- Define outer container behavior, max width, padding, and alignment.
- Define inner stack/grid behavior, including exact gap strategy and wrapping behavior.
- Specify text block width behavior to prevent unreadable line lengths.
- Ensure responsive reflow for dense configurations without overlapping elements.

- Typography Checklist:
- Use a clear heading/body/supporting-text hierarchy.
- Preserve casing and punctuation exactly as provided by user input.
- Ensure labels and helper text are visibly distinct but harmonious.

- Form/Field Checklist (applies when form fields are provided):
- Render fields in configured order and never reorder unless explicitly instructed.
- Reflect field type differences clearly in control choice and interaction semantics.
- Respect mandatory flags and indicate required fields consistently.
- Preserve per-field labels exactly.
- Keep validation messaging clear, short, and contextual.

- Quality Bar:
- Output should be implementation-grade and exhaustive enough that an engineer can build without guessing missing details.
- Favor explicit constraints over vague recommendations.
- Keep code and structure testable and easy to review."""

        if has_mandatory_form_fields:
            rules_section += "\n- For every mandatory form field, render a red asterisk (*) next to its label."

        if form_fields:
            rules_section += "\n- Form-specific implementation details:\n"
            if section_name:
                rules_section += f"- Section title/heading must reflect this exact section name: \"{section_name}\".\n"
            if fields_per_row:
                rules_section += f"- Use exactly {fields_per_row} field slot(s) per row in desktop layout unless Figma mandates a different breakpoint-specific arrangement.\n"
            rules_section += "- Keep field ordering identical to USER SELECTION.\n"
            rules_section += "- For every mandatory form field, render a red asterisk (*) next to its label.\n"
            rules_section += "- For optional fields, do not show the mandatory asterisk.\n"

        if has_textarea_form_fields:
            rules_section += "- For textarea fields, treat each textarea as occupying the space of two standard fields (2-slot footprint) and ensure there are two continuous row slots available for placement.\n"
            rules_section += "- If a textarea has a character limit, enforce it in the UI control and expose helper text that communicates the limit to users.\n"
            rules_section += "- Keep textarea resize behavior controlled to avoid breaking adjacent layout alignment.\n"
        
        if figma_file_url_2:
            rules_section += f"\n- Rules/Reference document: {figma_file_url_2}"

        return f"""USER SELECTION:
- Component: {component_type.title()}
{selected_content}

FIGMA FILE:
- Frame URL: {figma_value}

RULES:
{rules_section}
"""


component_prompt_compiler = ComponentPromptCompiler()
