from abc import ABC, abstractmethod
import asyncio
import json
import re
import urllib.error
import urllib.request
from typing import Any
from app.services.prompt_compiler import prompt_compiler

from app.core.config import settings


_SYSTEM_PROMPT_TEMPLATE = """You are an elite AI prompt engineer for frontend code generation systems.

Your ONLY job is to write a highly detailed, structured AI prompt in plain text.
This prompt will be copied and pasted directly into coding AIs like Claude, GPT, v0, Bolt, or Lovable.

CRITICAL: Do NOT generate any code, JSX, TSX, HTML, CSS, or Tailwind classes in your output.
Do NOT output code blocks or markdown fences.
Output ONLY the plain-text prompt — nothing else.

The prompt you write must instruct the receiving AI to build a pixel-perfect production section:
- layout hierarchy and component composition
- responsiveness and mobile-first rules
- spacing system and section ordering
- typography hierarchy using the brand font
- colors using the brand tokens only (never template-specific colors)
- design language, visual density, and visual hierarchy
- accessibility requirements
- interactions and animation rules
- consistency rules across the section

FORMAT RULES FOR THE PROMPT YOU WRITE:
- Begin with exactly: "You are a senior frontend coding AI generating production-ready {framework_header} code."
- Use ALL-CAPS section headers followed by a colon (e.g. SECTION REQUIREMENTS:, CRITICAL INSTRUCTIONS:, FINAL DESIGN TOKENS:)
- Separate each section with a blank line
- Embed all token values, layout constraints, and spacing values verbatim from the provided data
- Include a MANDATORY DESIGN SYSTEM RULES section listing each brand color and font explicitly
- Include a VISUAL PRECISION RULES section
- Include a LAYOUT RULES section
- Include a TYPOGRAPHY RULES section
- Include an ACCESSIBILITY RULES section
- Include a {implementation_header} section
- End with a FINAL OUTPUT INSTRUCTIONS section

MANDATORY RULES:
- Brand colors and brand font are authoritative — do not use template-specific colors or fonts
- Preserve all layout structure and constraints verbatim
- Output ONLY the plain-text prompt — no code, no fences, no commentary"""


def _normalize_framework(value: Any) -> str:
    framework = str(value or "").strip().lower()
    return framework if framework in {"react-tailwind", "html", "angular", "flutter-dart"} else "react-tailwind"


def _framework_labels(framework: str) -> tuple[str, str]:
    if framework == "html":
        return "HTML", "HTML IMPLEMENTATION REQUIREMENTS"
    if framework == "angular":
        return "Angular", "ANGULAR IMPLEMENTATION REQUIREMENTS"
    if framework == "flutter-dart":
        return "Flutter + DART", "Flutter + DART IMPLEMENTATION REQUIREMENTS"
    return "React + Tailwind", "REACT + TAILWIND IMPLEMENTATION REQUIREMENTS"


def _build_system_prompt(framework: str) -> str:
    framework_header, implementation_header = _framework_labels(framework)
    return _SYSTEM_PROMPT_TEMPLATE.format(
        framework_header=framework_header,
        implementation_header=implementation_header,
    )


def _enforce_framework_intro(text: str, framework: str) -> str:
    framework_header, _ = _framework_labels(framework)
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


def _build_url_and_headers(model: str | None = None) -> tuple[str, dict]:
    """Return (url, headers) for Azure OpenAI Chat Completions."""
    az_key = settings.azure_openai_api_key
    az_endpoint = settings.azure_openai_endpoint
    az_version = settings.azure_openai_api_version

    # Determine which deployment to use based on model
    if model and "5.4" in str(model).lower():
        az_deployment = settings.azure_openai_deployment_gpt54
    else:
        az_deployment = settings.azure_openai_deployment

    if not (az_key and az_endpoint and az_deployment and az_version):
        raise RuntimeError(
            "Azure OpenAI is not fully configured. "
            "Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, "
            "AZURE_OPENAI_DEPLOYMENT, and AZURE_OPENAI_API_VERSION."
        )

    base = az_endpoint.rstrip("/")
    url = f"{base}/openai/deployments/{az_deployment}/chat/completions?api-version={az_version}"
    return url, {"api-key": az_key, "Content-Type": "application/json"}


class AIProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        tokens: dict,
        metadata: dict | None = None,
        model: str | None = None,
    ) -> tuple[str, dict[str, int]]:
        raise NotImplementedError


class MockProvider(AIProvider):
    async def generate(
        self,
        prompt: str,
        tokens: dict,
        metadata: dict | None = None,
        model: str | None = None,
    ) -> tuple[str, dict[str, int]]:
        output = f"""
[COMPILED PROMPT]

{prompt}

[END PROMPT]
""".strip()
        prompt_tokens = max(1, len(prompt) // 4)
        completion_tokens = max(1, len(output) // 4)
        return output, {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        }


class OpenAIProvider(AIProvider):
    async def generate(
        self,
        prompt: str,
        tokens: dict,
        metadata: dict | None = None,
        model: str | None = None,
    ) -> tuple[str, dict[str, int]]:
        return await asyncio.to_thread(
            self._generate_sync,
            prompt,
            metadata or {},
            model or settings.openai_model,
        )

    def _generate_sync(self, prompt: str, metadata: dict, model: str) -> tuple[str, dict[str, int]]:
        url, headers = _build_url_and_headers(model)
        framework = _normalize_framework(metadata.get("framework"))
        system_prompt = _build_system_prompt(framework)

        user_content = (
            "Using the following section specification, write a polished, production-ready AI prompt "
            "following the exact format rules in the system instructions.\n"
            "Output ONLY the plain-text prompt — no code, no markdown fences, no explanation.\n\n"
            f"{prompt}"
        )

        sys_tokens = len(system_prompt) // 4
        usr_tokens = len(user_content) // 4
        print(
            f"[generation] url={url} | "
            f"tokens (est) system:{sys_tokens} user:{usr_tokens} total:{sys_tokens + usr_tokens}"
        )

        payload: dict = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            # "max_tokens": 4096,
            "max_completion_tokens": 100076,
            "temperature": 0,
        }

        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=600) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"AI request failed: {detail}") from error

        usage = _normalize_usage(data.get("usage", {}), sys_tokens + usr_tokens)
        print(
            f"[generation] output tokens: {usage.get('completion_tokens', '?')} | "
            f"prompt: {usage.get('prompt_tokens', '?')} | "
            f"total: {usage.get('total_tokens', '?')}"
        )

        raw_output = data["choices"][0]["message"]["content"].strip()
        return _enforce_framework_intro(raw_output, framework), usage


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


class GenerationService:
    providers = {"mock": MockProvider(), "openai": OpenAIProvider()}

    async def generate(
        self,
        provider: str,
        prompt: str,
        tokens: dict,
        metadata: dict | None = None,
        model: str | None = None,
    ) -> tuple[str, dict[str, int]]:
        engine = self.providers.get(provider, self.providers["openai"])
        compiled_prompt = prompt_compiler.compile(
            base_prompt=prompt,
            tokens=tokens,
            metadata=metadata,
        )

        return await engine.generate(compiled_prompt, tokens, metadata=metadata, model=model)


generation_service = GenerationService()
