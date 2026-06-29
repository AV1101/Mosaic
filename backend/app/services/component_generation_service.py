import asyncio
import json
import urllib.error
import urllib.request
from typing import Any

from app.core.config import settings
from app.services.component_prompt_compiler import component_prompt_compiler


def _build_url_and_headers(model: str | None = None) -> tuple[str, dict]:
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


class ComponentGenerationService:
    async def generate_component_prompt(self, payload: dict) -> tuple[str, dict[str, int]]:
        return await asyncio.to_thread(self._generate_sync, payload)

    def _generate_sync(self, payload: dict) -> tuple[str, dict[str, int]]:
        component_type = payload.get("component_type", "button")
        model = payload.get("model", "GPT-4o")
        url, headers = _build_url_and_headers(model)
        config = payload.get("config", {})
        color_tokens = payload.get("color_tokens", {})
        typography_style = payload.get("typography_style", {})
        typography_underlined = payload.get("typography_underlined", {})
        figma_frame_url = payload.get("figma_frame_url", "")
        figma_file_url_2 = payload.get("figma_file_url_2", "")
        input_config = payload.get("input_config", {})

        if component_type.lower() == "button":
            system_prompt = component_prompt_compiler.SYSTEM_PROMPT
            user_prompt = component_prompt_compiler.compile(
                component_type=component_type,
                config=config,
                color_tokens=color_tokens,
                typography_style=typography_style,
                typography_underlined=typography_underlined,
                figma_frame_url=figma_frame_url,
                figma_file_url_2=figma_file_url_2,
                input_config=input_config,
            )
        else:
            from app.services.component_prompt_compiler import GENERAL_SYSTEM_PROMPT
            system_prompt = GENERAL_SYSTEM_PROMPT
            user_prompt = component_prompt_compiler.compile_general(
                component_type=component_type,
                figma_frame_url=figma_frame_url,
                figma_file_url_2=figma_file_url_2,
                input_config=input_config,
            )

        sys_tokens = len(system_prompt) // 4
        usr_tokens = len(user_prompt) // 4
        print(
            f"[component-generation] url={url} | "
            f"tokens (est) system:{sys_tokens} user:{usr_tokens} total:{sys_tokens + usr_tokens}"
        )

        request_payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_completion_tokens": 4096,
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
            f"[component-generation] output tokens: {usage.get('completion_tokens', '?')} | "
            f"prompt: {usage.get('prompt_tokens', '?')} | "
            f"total: {usage.get('total_tokens', '?')}"
        )

        return data["choices"][0]["message"]["content"].strip(), usage


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


component_generation_service = ComponentGenerationService()
