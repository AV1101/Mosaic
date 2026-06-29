import re
from typing import Any


class PromptCompiler:
    def compile(
        self,
        base_prompt: str,
        tokens: dict[str, Any] = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        metadata = metadata or {}
        input_config = metadata.get("input_config")
        brand_name = metadata.get("brand_name") or "Your Brand"
        brand_tokens = metadata.get("brand_tokens") or {}
        template = metadata.get("template") or {}
        framework = self._normalize_framework_value(metadata.get("framework"))
        normalized_base_prompt = self._normalize_base_prompt_for_framework(base_prompt, framework)
        normalized_base_prompt = self._strip_framework_intro_lines(normalized_base_prompt)
        figma_frame_url = (
            template.get("figma_frame_url")
            or metadata.get("figma_frame_url")
            or template.get("figma_node_id")
            or metadata.get("figma_node_id")
        )

        prompt_parts = [
            self._build_framework_intro(framework),
            self._build_section_requirements(normalized_base_prompt, brand_name),
            self._build_figma_reference(figma_frame_url, bool(brand_tokens)),
            self._build_brand_token_rules(brand_tokens),
            self._build_content_fields(input_config),
            self._build_icon_badge_rule(input_config),
            self._build_accessibility_rules(),
            self._build_output_requirements(framework),
        ]

        fragments = metadata.get("prompt_fragments") or []
        if fragments:
            prompt_parts.append(self._build_prompt_fragments(fragments))

        return "\n\n".join(part for part in prompt_parts if part).strip()

    @staticmethod
    def _normalize_framework_value(value: Any) -> str:
        normalized = str(value or "").strip().lower()
        aliases = {
            "react": "react-tailwind",
            "react-tailwind": "react-tailwind",
            "react + tailwind": "react-tailwind",
            "html": "html",
            "angular": "angular",
            "flutter": "flutter-dart",
            "flutter-dart": "flutter-dart",
            "flutter + dart": "flutter-dart",
            "flutter+dart": "flutter-dart",
        }
        return aliases.get(normalized, "react-tailwind")

    @staticmethod
    def _framework_header(framework: str) -> str:
        if framework == "html":
            return "HTML"
        if framework == "angular":
            return "Angular"
        if framework == "flutter-dart":
            return "Flutter + DART"
        return "React + Tailwind"

    @classmethod
    def _normalize_base_prompt_for_framework(cls, base_prompt: str, framework: str) -> str:
        """Rewrite hardcoded framework lead-in so it matches the selected framework."""
        if not base_prompt:
            return base_prompt

        header = cls._framework_header(framework)
        canonical_intro = f"You are a senior frontend coding AI generating production-ready {header} code."
        pattern = re.compile(
            r"You are a senior frontend coding AI generating production-ready .*? code\.?",
            re.IGNORECASE,
        )
        return pattern.sub(canonical_intro, base_prompt, count=1)

    @staticmethod
    def _strip_framework_intro_lines(base_prompt: str) -> str:
        if not base_prompt:
            return base_prompt
        pattern = re.compile(
            r"^\s*You are a senior frontend coding AI generating production-ready .*? code\.?\s*$",
            re.IGNORECASE,
        )
        lines = [line for line in base_prompt.splitlines() if not pattern.match(line)]
        return "\n".join(lines).strip()

    @classmethod
    def _build_framework_intro(cls, framework: str) -> str:
        return f"You are a senior frontend coding AI generating production-ready {cls._framework_header(framework)} code."

    @staticmethod
    def _build_section_requirements(base_prompt: str, brand_name: str) -> str:
        return f"""SECTION REQUIREMENTS:
- You have full write access to the project folder open in the IDE. Write the generated code directly into the appropriate file(s) in that folder. Once all steps are complete, run the project and show a live preview of the rendered output.
- Build a polished, responsive frontend section for: {brand_name}.
- DO NOT TOUCH THE LOGO, let it be as is in the template.
- Render ONLY this section. Do NOT generate a top navigation bar, site header, logo bar, or footer. No global page chrome whatsoever.
- Use the following base instruction as the core creative direction.

{base_prompt.strip()}"""

    @staticmethod
    def _build_figma_reference(figma_frame_url: str | None, tokens_authoritative: bool) -> str:
        if not figma_frame_url:
            return ""
        if tokens_authoritative:
            return f"""FIGMA STRUCTURE REFERENCE:
Figma frame reference: {figma_frame_url}
Use the Figma MCP tool to open and inspect this Figma frame for component structure, layout geometry, spacing rhythm, and element hierarchy.
Do not copy color palette or typography from Figma when brand tokens are provided. Brand tokens are the source of truth for colors and type."""
        return f"""FIGMA DESIGN REFERENCE:
Figma frame reference: {figma_frame_url}
Use the Figma MCP tool to open and inspect this Figma frame. Extract and apply the exact colors, typography, spacing, layout constraints, component structure, and visual properties from that frame. Every design decision — colors, fonts, sizes, border radii, shadows, padding, margins — must come directly from the Figma frame. Do not invent, approximate, or substitute any design value."""

    @staticmethod
    def _build_brand_token_rules(brand_tokens: dict[str, Any]) -> str:
        if not brand_tokens:
            return ""

        return f"""BRAND TOKENS (AUTHORITATIVE):
Use the following brand tokens exactly. These tokens override any color or typography values seen in Figma.
Color and typography decisions must come from this token set only.

{brand_tokens}

TOKEN APPLICATION RULES:
- Colors: use only token-defined colors for backgrounds, text, borders, and accents.
- Typography: use only token-defined font families, font sizes, font weights, and line heights.
- If a token category is missing, keep the Figma structure but choose the closest existing token value instead of inventing a new one."""

    @staticmethod
    def _build_content_fields(input_config: dict[str, Any] | None) -> str:
        if not input_config:
            return ""

        text_fields: list[str] = input_config.get("text_fields") or []
        icon_only_slots: list[dict] = input_config.get("icon_only_slots") or []
        icon_text_slots: list[dict] = input_config.get("icon_text_slots") or []
        image_urls: list[str] = input_config.get("image_urls") or []

        non_empty_text = [(i, val) for i, val in enumerate(text_fields, 1) if val and val.strip()]
        has_content = any([non_empty_text, icon_only_slots, icon_text_slots, image_urls])
        if not has_content:
            return ""

        lines = [
            "CONTENT TO RENDER:",
            "Use EXACTLY the user-provided values below. Do not invent, substitute, or omit any text, icon, or image.",
            "Every slot listed here must appear in the generated output at the matching position.",
            "Naming: T(x) = text field x, I(x) = icon-only field x, IT(x) = icon+text field x.",
        ]

        if non_empty_text:
            lines.append("\nText Fields — T(x) maps to text position x in the template:")
            for i, val in non_empty_text:
                lines.append(f"  T{i}: \"{val}\"")

        if icon_only_slots:
            lines.append("\nIcon Slots — I(x) maps to icon position x (render the named Material Design icon):")
            for i, slot in enumerate(icon_only_slots, 1):
                name = slot.get("iconName") or ""
                variant = slot.get("variant") or ""
                if name:
                    lines.append(f"  I{i}: {name} ({variant})" if variant else f"  I{i}: {name}")
                else:
                    lines.append(f"  I{i}: (no icon selected — leave position empty)")

        if icon_text_slots:
            lines.append("\nIcon + Text Slots — IT(x) maps to combined icon+text position x. The icon is optional (toggled by user):")
            for i, slot in enumerate(icon_text_slots, 1):
                name = slot.get("iconName") or ""
                variant = slot.get("variant") or ""
                text = slot.get("text") or ""
                include = slot.get("includeIcon", True)
                if include and name:
                    icon_part = f"{name} ({variant})" if variant else name
                elif not include:
                    icon_part = "(icon toggled off — render text only, no icon)"
                else:
                    icon_part = "(no icon selected)"
                text_part = f'"{text}"' if text else "(empty)"
                lines.append(f"  IT{i}: icon={icon_part}, text={text_part}")

        if image_urls:
            lines.append("\nImage Fields (use these URLs as <img> src values in order):")
            for i, url in enumerate(image_urls, 1):
                lines.append(f"  image{i}: {url}")

        return "\n".join(lines)

    @staticmethod
    def _build_icon_badge_rule(input_config: dict[str, Any] | None) -> str:
        if not input_config:
            return ""
        icon_only_slots: list = input_config.get("icon_only_slots") or []
        icon_text_slots: list = input_config.get("icon_text_slots") or []
        if not icon_only_slots and not icon_text_slots:
            return ""
        return """ICON vs BADGE RESOLUTION RULE:
If the Figma design contains badge/circle containers, those define the SIZE and POSITION of the container ONLY.
The CONTENT TO RENDER section above provides icon inputs for these slots. Render the specified Material Design icons inside the badge geometry. Do not render numbered badge text when icon inputs are provided."""

    @staticmethod
    def _build_accessibility_rules() -> str:
        return """ACCESSIBILITY RULES:
- Use semantic HTML elements within this section (section, article, h2, ul, li, p, etc.). Do not add <nav> or <header> unless they are explicitly part of this section's own internal structure.
- Ensure text and interactive contrast ratios meet WCAG AA.
- Include visible focus states for all interactive controls.
- Provide descriptive labels for buttons, links, forms, and images.
- Avoid color-only meaning and non-descriptive icon-only controls.
- Support keyboard navigation for every interactive element."""

    @staticmethod
    def _build_output_requirements(framework: str = "") -> str:
        if framework == "html":
            return """OUTPUT REQUIREMENTS:
- Return complete, production-ready HTML and CSS code for this section only.
- Use vanilla HTML5 with <style> tags for CSS (no external stylesheets, no inline styles on elements).
- Render ONLY the section described. Do not wrap it in a full page structure, do not add a top nav, site header, or footer.
- Place every piece of content from the CONTENT TO RENDER section into the output exactly as specified.
- Do not output any markdown, code fences, explanation text, or commentary — return only the HTML code.
- PIXEL-PERFECT GENERATION: Before writing any code, check whether the project contains a `.skills/` folder or a `.vscode/` folder. If either exists, read every file inside them first. These folders contain project-specific design system rules, component conventions, and coding standards that are the authoritative source of truth for this codebase. Your output must conform exactly to those rules."""
        elif framework == "angular":
            return """OUTPUT REQUIREMENTS:
- Return complete, production-ready Angular component code for this section only.
- Create a TypeScript Angular component with @Component decorator and template.
- Use Angular directives (*ngIf, *ngFor, etc.) for conditional rendering and loops.
- Use component styles (styles or styleUrls in @Component) for all CSS — no inline styles.
- Render ONLY the section described. Do not wrap it in a full page, do not add a top nav, site header, or footer.
- Place every piece of content from the CONTENT TO RENDER section into the output exactly as specified.
- Do not output any markdown, code fences, explanation text, or commentary — return only the TypeScript/HTML component code.
- PIXEL-PERFECT GENERATION: Before writing any code, check whether the project contains a `.skills/` folder or a `.vscode/` folder. If either exists, read every file inside them first. These folders contain project-specific design system rules, component conventions, and coding standards that are the authoritative source of truth for this codebase. Your output must conform exactly to those rules."""
        elif framework == "flutter-dart":
            return """OUTPUT REQUIREMENTS:
- Return complete, production-ready Flutter + Dart widget code for this section only.
- Create a Dart Flutter widget (StatelessWidget or StatefulWidget) with a valid build(BuildContext context) method.
- Use idiomatic Flutter conditional rendering and iteration (if in widget collections, map/List.generate, etc.) for dynamic UI.
- Use Flutter styling primitives (Theme, TextStyle, BoxDecoration, EdgeInsets, SizedBox) and avoid HTML/CSS/Angular syntax.
- Render ONLY the section described. Do not wrap it in a full app, do not add global app bars, site headers, or footers.
- Place every piece of content from the CONTENT TO RENDER section into the output exactly as specified.
- Do not output any markdown, code fences, explanation text, or commentary — return only valid Dart/Flutter code.
- PIXEL-PERFECT GENERATION: Before writing any code, check whether the project contains a `.skills/` folder or a `.vscode/` folder. If either exists, read every file inside them first. These folders contain project-specific design system rules, component conventions, and coding standards that are the authoritative source of truth for this codebase. Your output must conform exactly to those rules."""
        else:
            # Default to React + Tailwind
            return """OUTPUT REQUIREMENTS:
- Return complete, production-ready React + Tailwind CSS code for this section only.
- Export a single default React component.
- Use Tailwind utility classes exclusively for all styling — no inline style objects, no CSS modules.
- Render ONLY the section described. Do not wrap it in a full page, do not add a top nav, site header, or footer.
- Place every piece of content from the CONTENT TO RENDER section into the output exactly as specified.
- Do not output any markdown, code fences, explanation text, or commentary — return only the JSX/TSX.
- PIXEL-PERFECT GENERATION: Before writing any code, check whether the project contains a `.skills/` folder or a `.vscode/` folder. If either exists, read every file inside them first. These folders contain project-specific design system rules, component conventions, Tailwind configuration overrides, and coding standards that are the authoritative source of truth for this codebase. Any instruction found in `.skills/` or `.vscode/` takes precedence over general best-practice defaults. Your output must conform exactly to those rules to produce pixel-perfect results."""

    @staticmethod
    def _build_prompt_fragments(fragments: list[str]) -> str:
        lines = "\n".join(f"- {fragment.strip()}" for fragment in fragments if fragment)
        return f"OPTIONAL PROMPT FRAGMENTS:\n{lines}" if lines else ""


prompt_compiler = PromptCompiler()
