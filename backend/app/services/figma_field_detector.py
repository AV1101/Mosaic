"""Detect input field counts and labels from a Figma frame using OpenAI vision."""
from __future__ import annotations

import json
import os
import re
import urllib.parse
from typing import TypedDict

import httpx
from openai import AsyncOpenAI

from app.core.config import settings


class FieldCounts(TypedDict):
    text_only: int
    icon_only: int
    image_field: int
    text_icon: int
    text_only_labels: list[str]
    icon_only_labels: list[str]
    image_field_labels: list[str]
    text_icon_labels: list[str]


_ZERO: FieldCounts = {
    "text_only": 0,
    "icon_only": 0,
    "image_field": 0,
    "text_icon": 0,
    "text_only_labels": [],
    "icon_only_labels": [],
    "image_field_labels": [],
    "text_icon_labels": [],
}


def _parse_figma_url(url: str) -> tuple[str, str] | None:
    """Return (file_key, node_id_colon_format) or None."""
    m = re.search(r"/(?:file|design|proto)/([A-Za-z0-9_-]+)", url)
    if not m:
        return None
    file_key = m.group(1)

    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    node_id = params.get("node-id", [None])[0]
    if not node_id:
        return None

    # Figma API expects "123:456"; URLs may use "123-456"
    node_id = re.sub(r"(\d+)-(\d+)$", r"\1:\2", node_id)
    return file_key, node_id


async def _fetch_figma_image_url(file_key: str, node_id: str) -> str | None:
    token = settings.figma_api_key or os.environ.get("FIGMA_API_KEY")
    if not token:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://api.figma.com/v1/images/{file_key}",
                params={"ids": node_id, "format": "png", "scale": "1"},
                headers={"X-Figma-Token": token},
            )
        if resp.status_code != 200:
            return None
        images: dict = resp.json().get("images", {})
        return images.get(node_id) or next(iter(images.values()), None)
    except Exception:
        return None


_PROMPT = """Analyze this UI section design and identify all editable/content slots.

For each category, count the slots AND give each one a short label based on what you see in the design
(use the actual text visible in the frame as the label when possible, e.g. "Headline", "CTA button",
"Product image" — keep each label under 4 words).

Categories:
- text_only: areas that hold only text (headings, body copy, labels, standalone text buttons)
- icon_only: slots that hold only an icon or symbol (no accompanying text)
- image_field: image placeholder areas (hero images, thumbnails, avatars, card images)
- text_icon: slots combining an icon AND text together (icon+label nav items, feature cards with icon+copy)

Return ONLY valid JSON — no explanation, no markdown:
{
  "text_only": N,
  "text_only_labels": ["label1", "label2", ...],
  "icon_only": N,
  "icon_only_labels": ["label1", ...],
  "image_field": N,
  "image_field_labels": ["label1", ...],
  "text_icon": N,
  "text_icon_labels": ["label1", ...]
}"""


def _safe_labels(data: dict, key: str, count: int) -> list[str]:
    """Return a list of exactly `count` label strings."""
    raw = data.get(key, [])
    if not isinstance(raw, list):
        raw = []
    labels = [str(x) for x in raw[:count]]
    # Pad with empty strings if the model returned fewer than expected
    while len(labels) < count:
        labels.append("")
    return labels


async def detect_fields(figma_frame_url: str) -> FieldCounts:
    """Analyze a Figma frame via OpenAI vision. Returns zeros on any failure."""
    parsed = _parse_figma_url(figma_frame_url)
    if not parsed:
        return _ZERO

    file_key, node_id = parsed
    image_url = await _fetch_figma_image_url(file_key, node_id)
    if not image_url:
        return _ZERO

    api_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _ZERO

    try:
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": image_url}},
                        {"type": "text", "text": _PROMPT},
                    ],
                }
            ],
            max_tokens=300,
        )
        raw = (response.choices[0].message.content or "").strip()
    except Exception:
        return _ZERO

    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return _ZERO

    try:
        data = json.loads(m.group())
        text_only = max(0, int(data.get("text_only", 0)))
        icon_only = max(0, int(data.get("icon_only", 0)))
        image_field = max(0, int(data.get("image_field", 0)))
        text_icon = max(0, int(data.get("text_icon", 0)))
        return {
            "text_only": text_only,
            "icon_only": icon_only,
            "image_field": image_field,
            "text_icon": text_icon,
            "text_only_labels": _safe_labels(data, "text_only_labels", text_only),
            "icon_only_labels": _safe_labels(data, "icon_only_labels", icon_only),
            "image_field_labels": _safe_labels(data, "image_field_labels", image_field),
            "text_icon_labels": _safe_labels(data, "text_icon_labels", text_icon),
        }
    except (json.JSONDecodeError, ValueError, TypeError):
        return _ZERO
