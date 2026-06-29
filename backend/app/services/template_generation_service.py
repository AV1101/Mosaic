import asyncio
import json
import re
import urllib.error
import urllib.request
from typing import Any

from app.core.config import settings


def _build_url_and_headers() -> tuple[str, dict]:
    az_key = settings.azure_openai_api_key
    az_endpoint = settings.azure_openai_endpoint
    az_deployment = settings.azure_openai_deployment
    az_version = settings.azure_openai_api_version

    if not (az_key and az_endpoint and az_deployment and az_version):
        raise RuntimeError(
            "Azure OpenAI is not fully configured. "
            "Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, "
            "AZURE_OPENAI_DEPLOYMENT, and AZURE_OPENAI_API_VERSION."
        )

    base = az_endpoint.rstrip("/")
    url = f"{base}/openai/deployments/{az_deployment}/chat/completions?api-version={az_version}"
    return url, {"api-key": az_key, "Content-Type": "application/json"}


_SYSTEM_PROMPT_TEMPLATE = """
You are an elite AI prompt engineer for frontend code generation systems.

Your ONLY job is to write a highly detailed, structured AI prompt in plain text.
This prompt will be copied and pasted directly into GitHub Copilot (with Figma MCP enabled) or other coding AIs.

CRITICAL: Do NOT generate any code, JSX, TSX, HTML, CSS, or Tailwind classes in your output.
Do NOT output code blocks or markdown fences.
Output ONLY the plain-text prompt — nothing else.

The prompt you write must instruct the receiving AI to build a complete, pixel-perfect production landing page covering ALL of the following components:
- Header / Navigation
- Hero section
- All intermediate content sections
- Footer

For every component, the prompt must instruct the AI to:
- Use the Figma MCP tool to open the provided Figma frame URL and fetch its complete design specs
- Apply exact colors, typography, spacing, layout constraints, and component structure from the Figma frame
- Do not invent or approximate any visual property — every pixel must come from Figma

FORMAT RULES FOR THE PROMPT YOU WRITE:
- Begin with exactly: "You are a senior frontend coding AI generating production-ready {framework_header} code."
- Use ALL-CAPS section headers followed by a colon (e.g. PAGE REQUIREMENTS:, HEADER SECTION:, HERO SECTION:, etc.)
- Separate each section with a blank line
- Include a PAGE OVERVIEW section describing the full page structure
- Include a FIGMA DESIGN REFERENCE block for EACH component with its Figma frame URL
- Include an ACCESSIBILITY RULES section
- Include a {implementation_header} section
- End with a FINAL OUTPUT INSTRUCTIONS section
- The Header must, at all times, be visible on the screen even after scrolling.

For any component that has user content inputs (text fields, icons, image URLs):
- Include a CONTENT TO RENDER subsection for that specific component
- List each field exactly: T(x) for text, I(x) for icon-only, IT(x) for icon+text
- State explicitly that all provided values must appear verbatim in the output

MANDATORY RULES:
- The website/brand name must appear exactly as the brand name given
- All visual properties (colors, fonts, sizes, spacing) must come from the Figma MCP — never invented
- The output MUST cover the ENTIRE page — every component listed must be implemented
- DO NOT PASTE PICTURES FROM THE FIGMA. IMPLEMENT IT IN THE TARGET FRAMEWORK.
""".strip()

_SECTION_ACCURACY_DIRECTIVE = (
    'Compare every single section seperately to the given figma file. '
    'and then make a page, it should look exactly the same as the figma.'
)


def _normalize_framework(value: Any) -> str:
    framework = str(value or "").strip().lower()
    return framework if framework in {"react-tailwind", "html", "angular", "flutter-dart"} else "react-tailwind"


def _framework_labels(framework: str) -> tuple[str, str, str]:
    if framework == "html":
        return "HTML", "HTML IMPLEMENTATION REQUIREMENTS", "HTML"
    if framework == "angular":
        return "Angular", "ANGULAR IMPLEMENTATION REQUIREMENTS", "ANGULAR"
    if framework == "flutter-dart":
        return "Flutter + DART", "Flutter + DART IMPLEMENTATION REQUIREMENTS", "FLUTTER"
    return "React + Tailwind", "REACT + TAILWIND IMPLEMENTATION REQUIREMENTS", "REACT"


def _enforce_framework_intro(text: str, framework: str) -> str:
    framework_header, _, _ = _framework_labels(framework)
    canonical_intro = (
        f"You are a senior frontend coding AI generating production-ready {framework_header} code."
    )
    intro_pattern = re.compile(
        r"^\s*You are a senior frontend coding AI generating production-ready .*? code\.?\s*",
        re.IGNORECASE,
    )
    if intro_pattern.match(text or ""):
        return intro_pattern.sub(canonical_intro + "\n\n", text, count=1)
    return f"{canonical_intro}\n\n{text.lstrip()}"


class TemplateGenerationService:
    async def generate_template_prompt(self, payload: dict) -> tuple[str, dict[str, int]]:
        return await asyncio.to_thread(self._generate_sync, payload)

    def _generate_sync(self, payload: dict) -> tuple[str, dict[str, int]]:
        url, headers = _build_url_and_headers()
        framework = _normalize_framework(payload.get("framework"))
        framework_header, implementation_header, code_ref = _framework_labels(framework)
        system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
            framework_header=framework_header,
            implementation_header=implementation_header,
        )

        structure = payload.get("structure", {})
        all_templates = payload.get("all_templates") or {}
        component_input_configs = payload.get("component_input_configs") or {}

        header_template = all_templates.get("header") or {}
        subheader_template = all_templates.get("subheader") or {}
        hero_template = all_templates.get("hero") or {}
        section_templates = all_templates.get("sections") or []
        footer_template = all_templates.get("footer") or {}
        ordered_templates = all_templates.get("ordered") or []

        section_ids = structure.get("sections") or []
        page_order_ids = structure.get("page_order") or []

        header_block = self._format_component_block(
            "HEADER", header_template, str(structure.get("header") or ""), component_input_configs
        )
        subheader_block = self._format_component_block(
            "SUB HEADER", subheader_template, str(structure.get("subheader") or ""), component_input_configs
        )
        hero_block = self._format_component_block(
            "HERO", hero_template, str(structure.get("hero") or ""), component_input_configs
        )
        footer_block = self._format_component_block(
            "FOOTER", footer_template, str(structure.get("footer") or ""), component_input_configs
        )

        section_blocks = []
        for idx, (tmpl, sid) in enumerate(zip(section_templates, section_ids), 1):
            section_blocks.append(
                self._format_component_block(f"SECTION {idx}", tmpl, str(sid), component_input_configs)
            )

        sections_text = (
            "\n\n".join(section_blocks) if section_blocks else "No additional sections selected."
        )

        if ordered_templates:
            page_structure_summary = [
                f"  {idx}. {tmpl.get('name', 'Selected')}"
                for idx, tmpl in enumerate(ordered_templates, 1)
            ]
            ordered_blocks = [
                self._format_component_block(
                    f"COMPONENT {idx}",
                    tmpl,
                    str(page_order_ids[idx - 1]) if idx - 1 < len(page_order_ids) else "",
                    component_input_configs,
                )
                for idx, tmpl in enumerate(ordered_templates, 1)
            ]
            ordered_components_text = "\n\n---\n\n".join(ordered_blocks)
        else:
            page_structure_summary = []
            if header_template:
                page_structure_summary.append(f"  1. Header: {header_template.get('name', 'Selected')}")
            if subheader_template:
                page_structure_summary.append(f"  {len(page_structure_summary) + 1}. Sub Header: {subheader_template.get('name', 'Selected')}")
            if hero_template:
                page_structure_summary.append(f"  {len(page_structure_summary) + 1}. Hero: {hero_template.get('name', 'Selected')}")
            for i, tmpl in enumerate(section_templates, 1):
                page_structure_summary.append(f"  {len(page_structure_summary) + 1}. Section {i}: {tmpl.get('name', 'Selected')}")
            if footer_template:
                page_structure_summary.append(f"  {len(page_structure_summary) + 1}. Footer: {footer_template.get('name', 'Selected')}")
            ordered_components_text = f"""{header_block}

---

{subheader_block}

---

{hero_block}

---

ADDITIONAL SECTIONS:
{sections_text}

---

{footer_block}"""

        user_prompt = f"""Brand Name: {payload.get("brand_name") or payload.get("industry")}
Template Name: {payload.get("template_name")}
    Target Framework: {framework_header}

PAGE OVERVIEW — implement every component below in order:
{chr(10).join(page_structure_summary) if page_structure_summary else "  (no components selected)"}

---

{ordered_components_text}

---

Generate a premium AI prompt that covers the COMPLETE PAGE — all components listed above must be implemented.
The prompt must be self-contained and ready to paste into GitHub Copilot (with Figma MCP) or any AI coding tool.
For each component, the prompt must instruct the AI to fetch the Figma design spec via Figma MCP using the provided Node ID.
All implementation details and final code instructions must target {framework_header} (not other frameworks).
""".strip()

        sys_tokens = len(system_prompt) // 4
        usr_tokens = len(user_prompt) // 4
        print(
            f"[template-generation] url={url} | "
            f"tokens (est) system:{sys_tokens} user:{usr_tokens} total:{sys_tokens + usr_tokens}"
        )

        request_payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_completion_tokens": 32000,
            "temperature": 0,
        }

        request = urllib.request.Request(
            url,
            data=json.dumps(request_payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=600) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Azure OpenAI HTTP {exc.code}: {detail}") from exc

        usage = _normalize_usage(data.get("usage", {}), sys_tokens + usr_tokens)
        print(
            f"[template-generation] output tokens: {usage.get('completion_tokens', '?')} | "
            f"prompt: {usage.get('prompt_tokens', '?')} | "
            f"total: {usage.get('total_tokens', '?')}"
        )

        compiled = data["choices"][0]["message"]["content"].strip()
        compiled = _enforce_framework_intro(compiled, framework)
        if _SECTION_ACCURACY_DIRECTIVE.lower() not in compiled.lower():
            compiled = f"{compiled}\n\nFINAL ACCURACY DIRECTIVE:\n{_SECTION_ACCURACY_DIRECTIVE}"
        compiled += f"\n\nFINAL FRAMEWORK DIRECTIVE:\nImplement the full page in {code_ref} only."
        return compiled, usage

    def _format_component_block(
        self, label: str, template: dict, component_id: str, component_input_configs: dict
    ) -> str:
        if not template:
            return f"{label} SECTION:\n  Not selected."

        figma_frame_url = template.get("figma_frame_url") or template.get("figma_node_id") or ""

        lines = [
            f"{label} SECTION:",
            f"  Name: {template.get('template_name') or template.get('name', 'Unknown')}",
            f"  Category: {template.get('template_category') or template.get('category', '')}",
            f"  Brand: {template.get('brand_name', '')}",
        ]

        if figma_frame_url:
            lines.append(f"  Figma frame reference: {figma_frame_url}")
            lines.append("  Design Source: Use Figma MCP to open the Figma frame at the URL above and fetch its exact design specs")

        config = component_input_configs.get(component_id) or {}
        text_fields = config.get("text_fields") or []
        icon_only_slots = config.get("icon_only_slots") or []
        icon_text_slots = config.get("icon_text_slots") or []
        image_urls = config.get("image_urls") or []
        has_input = any([text_fields, icon_only_slots, icon_text_slots, image_urls])

        if has_input:
            lines.append("  Content Inputs (use verbatim in CONTENT TO RENDER for this component):")
            for i, val in enumerate(text_fields, 1):
                if val and str(val).strip():
                    lines.append(f"    T{i}: \"{val}\"")
            for i, slot in enumerate(icon_only_slots, 1):
                name = slot.get("iconName") or ""
                variant = slot.get("variant") or ""
                lines.append(f"    I{i}: {name} ({variant})" if variant else f"    I{i}: {name or '(none)'}")
            for i, slot in enumerate(icon_text_slots, 1):
                name = slot.get("iconName") or ""
                variant = slot.get("variant") or ""
                text = slot.get("text") or ""
                include = slot.get("includeIcon", True)
                icon_part = f"{name} ({variant})" if (include and name) else ("(icon off)" if not include else "(none)")
                lines.append(f"    IT{i}: icon={icon_part}, text=\"{text}\"")
            for i, img_url in enumerate(image_urls, 1):
                lines.append(f"    image{i}: {img_url}")

        return "\n".join(lines)


def _as_int(value: Any, default: int = 0) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed >= 0 else default


def _normalize_usage(raw_usage: dict[str, Any] | None, prompt_fallback: int = 0) -> dict[str, int]:
    usage = raw_usage or {}
    prompt_tokens = _as_int(usage.get("prompt_tokens"), prompt_fallback)
    completion_tokens = _as_int(usage.get("completion_tokens"), 0)
    total_tokens = _as_int(usage.get("total_tokens"), prompt_tokens + completion_tokens)
    if total_tokens < prompt_tokens + completion_tokens:
        total_tokens = prompt_tokens + completion_tokens
    return {
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
    }


template_generation_service = TemplateGenerationService()
