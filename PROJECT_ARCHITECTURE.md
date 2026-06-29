# Mosaic — Complete Project Architecture

This document is the authoritative reference for every file, data flow, invariant, and design decision in the Mosaic codebase. It is written to be read cold — no prior context is assumed.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Layout](#3-repository-layout)
4. [Runtime Request Lifecycle](#4-runtime-request-lifecycle)
5. [Authentication Status](#5-authentication-status)
6. [Database Schema — All Tables](#6-database-schema--all-tables)
7. [Backend — File-by-File Reference](#7-backend--file-by-file-reference)
8. [Frontend — File-by-File Reference](#8-frontend--file-by-file-reference)
9. [Complete API Endpoint Catalogue](#9-complete-api-endpoint-catalogue)
10. [Brand System](#10-brand-system)
11. [Template System](#11-template-system)
12. [AI Generation Pipeline (Core Feature)](#12-ai-generation-pipeline-core-feature)
13. [Prompt Compiler — Structure](#13-prompt-compiler--structure)
14. [Template-to-Prompt Generation Flow](#14-template-to-prompt-generation-flow)
15. [Input Configuration System](#15-input-configuration-system)
16. [Figma Field Detection](#16-figma-field-detection)
17. [Preview Image Architecture](#17-preview-image-architecture)
18. [Image URL Flow (Generation Inputs)](#18-image-url-flow-generation-inputs)
19. [Material Icons Integration](#19-material-icons-integration)
20. [Component Library Page](#20-component-library-page)
21. [Create Flow — Page Generator Wizard](#21-create-flow--page-generator-wizard)
22. [Sidebar Navigation](#22-sidebar-navigation)
23. [Configuration and Environment Variables](#23-configuration-and-environment-variables)
24. [Key Architectural Invariants](#24-key-architectural-invariants)
25. [How To Trace Any Feature](#25-how-to-trace-any-feature)

---

## 1. System Overview

Mosaic is a full-stack AI-powered design system tool. Users browse a marketplace of page-section templates, fill in brand and content configuration, and receive a production-ready AI prompt referencing the Figma design. The external AI (GitHub Copilot with Figma MCP) fetches design specs directly from Figma and generates React + Tailwind code.

```
Browser
  │
  ▼
Next.js 15 App Router  (port 3000)
  │   app/  — server-rendered pages
  │   components/ — React components
  │   services/   — HTTP helpers
  │
  │  HTTP  GET/POST  http://localhost:8000/api/*
  ▼
FastAPI  (port 8000)
  │   backend/app/api/      — route handlers
  │   backend/app/services/ — business logic
  │   backend/app/models/   — SQLAlchemy ORM
  │
  ▼
PostgreSQL  (database: 21st)
  │   templates, brands, categories_templates,
  │   components, generations, icons, users, …
  │
  ▼                    ▼                      ▼
Azure OpenAI      Figma API             /uploads/ (static)
Chat Completions  (frame image export)  served by FastAPI StaticFiles
(prompt compile)  used by field detector
```

**Figma MCP integration:** Each `templates` row stores a full `figma_frame_url` pointing to the exact Figma frame for that (template, brand) pair. When a prompt is generated the backend embeds it as `Figma frame reference: <url>`. GitHub Copilot (connected to Figma MCP) opens that URL at code-generation time — fetching exact colors, typography, spacing, layout constraints, and component structure.

**One template, many brands:** The same logical template section (e.g. "Hero Dark") has multiple rows in `templates`, one per brand, each pointing to a different Figma frame. The marketplace shows **one card per template name** (deduplicated). The detail page shows a brand switcher.

**AI field detection:** When a new template frame is added, the backend fetches the Figma frame as a PNG image via the Figma API, sends it to OpenAI GPT-4o vision, and extracts the count and label for every input slot (text fields, icon slots, image areas). These are stored in `text_only`, `icon_only`, `image_field`, `text_icon`, and `field_labels` columns. For multi-brand templates, detection runs once (for the first brand) and the counts/labels are copied to all subsequent brand rows. This is not working right now, the template is being generated exactly as the in the Figma file.

---

## 2. Technology Stack

### Frontend
| Concern | Library / Tool | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server + client components |
| Language | TypeScript | Strict mode |
| UI runtime | React 19 | |
| Styling | Tailwind CSS 4 | Utility-first |
| Component primitives | Radix UI | Headless, accessible |
| Variant utility | class-variance-authority | CVA for component variants |
| Class merging | clsx + tailwind-merge | via `lib/utils.ts` `cn()` |
| Animations | Framer Motion | Page transitions, card hovers |
| Data fetching | TanStack React Query v5 | Client-side caching |
| Icons | Lucide React + Material Icons web font | Lucide for UI chrome, Material for user-selectable icons |
| Themes | next-themes | Light / dark / system |
| Font | Inter (Google Fonts) | Loaded in `app/layout.tsx` |

### Backend
| Concern | Library / Tool | Notes |
|---|---|---|
| Framework | FastAPI | Async, auto-OpenAPI |
| Language | Python 3.12 | |
| ORM | SQLAlchemy 2.x (async) | `mapped_column` declarative style |
| Database driver | asyncpg | Async PostgreSQL |
| Migrations | Custom `migrate*.py` scripts | Raw asyncpg DDL |
| Settings | pydantic-settings | `.env` file support |
| HTTP client | httpx (async) | Used by Figma field detector |
| AI provider — prompts | Azure OpenAI Chat Completions | `api-key` header auth |
| AI provider — vision | OpenAI GPT-4o | Field detection from Figma frame images |
| File storage | Local filesystem | `uploads/` directory |
| CORS | FastAPI CORSMiddleware | Allows localhost:3000 |

---

## 3. Repository Layout

```
Mosaic/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx                # / → redirects to /marketplace
│   ├── globals.css
│   ├── loading.tsx
│   ├── error.tsx
│   ├── login/page.tsx
│   ├── marketplace/
│   │   ├── page.tsx
│   │   ├── marketplace-client.tsx
│   │   └── [id]/page.tsx       # Template detail / preview
│   ├── generate/page.tsx
│   ├── generations/page.tsx
│   ├── create/
│   │   ├── page.tsx
│   │   └── page/page.tsx       # 3-step Page Generator wizard
│   ├── library/
│   │   ├── page.tsx
│   │   └── lib-client.tsx
│   ├── prompts/
│   │   ├── page.tsx
│   │   ├── prompts-client.tsx
│   │   └── [id]/page.tsx       # Template detail / preview
│   ├── prompt-editor/page.tsx
│   ├── settings/page.tsx
│   ├── design-websites/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx       # Template detail / preview
│
├── components/
│   ├── app-shell.tsx
│   ├── app-providers.tsx
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   ├── search-bar.tsx
│   ├── category-filter.tsx
│   ├── section-card.tsx
│   └── preview-modal.tsx       # Brand switcher + preview image + InputConfigPanel + GenerationPanel
│   ├── input-config-panel.tsx  # Text/icon/image slot inputs; supports AI-detected labels
│   ├── generation-panel.tsx    # Brand selector (or forced brand) + generate + output
│   ├── add-item-modal.tsx      # Multi-brand entry rows; single shared preview image upload
│   ├── component-preview-modal.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── skeleton.tsx
│
├── services/
│   ├── api-client.ts
│   ├── template-data.ts        # fetchTemplateSections, fetchTemplateSection, templateToSection
│   ├── template-generation.ts
│   ├── marketplace-api.ts
│   ├── components-api.ts       # componentToSection maps 
│
├── types/
│   └── section.ts              # SectionItem type
├── lib/utils.ts
├── data/sections.ts
├── public/
│
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── core/config.py       # Pydantic settings — reads .env
    │   ├── auth/
    │   ├── db/
    │   ├── models/
    │   │   ├── brand.py                # id, brand_name
    │   │   ├── template_brand_frame.py # maps to "templates" table
    │   │   ├── category.py             # CategoryTemplate → categories_templates
    │   │   ├── component.py
    │   │   ├── generation.py
    │   │   └── …
    │   ├── schemas/
    │   │   ├── brand.py        # BrandRead, BrandAddRequest, TemplateBrandFrameRead, TemplateBrandFrameAddRequest
    │   │   └── …
    │   ├── api/
    │   │   ├── brands.py
    │   │   ├── templates.py
    │   │   ├── generations.py
    │   │   ├── template_generation.py
    │   │   └── …
    │   └── services/
    │       ├── design_context_service.py   # Resolves brand + frame; serialize_frame()
    │       ├── figma_field_detector.py     # Figma API → OpenAI vision → field counts + labels
    │       ├── generation_service.py
    │       ├── prompt_compiler.py
    │       ├── template_generation_service.py
    │       ├── storage_service.py
    │       └── …
    ├── migrate_add_field_labels.py   # Adds field_labels JSONB to templates
    └── requirements.txt              # includes httpx, openai
```

---

## 4. Runtime Request Lifecycle

### Step 1 — Marketplace page load

1. Browser navigates to `/marketplace`.
2. Next.js runs `app/marketplace/page.tsx` (server component).
3. Calls `fetchTemplateSections()` → `GET http://localhost:8000/api/templates`.
4. FastAPI → `list_frames()` → `SELECT DISTINCT ON (template_name) … FROM templates ORDER BY template_name, id DESC LIMIT 24`.
5. One row per unique `template_name` is returned (the most recently added brand entry for each template).
6. Each ORM object is passed to `design_context_service.serialize_frame()`.
7. Returns `TemplateBrandFrameRead[]` (includes `figma_frame_url`, `brand_name`, `field_labels`; backward-compat aliases `name`/`category`/`type`/`slug` included).
8. `templateToSection()` maps each record to a `SectionItem`.
9. `page.tsx` passes `sections: SectionItem[]` to `<MarketplaceClient>`.

### Step 2 — Template detail / PreviewModal

1. User clicks a card → navigates to `/marketplace/{id}`.
2. `app/marketplace/[id]/page.tsx` calls `fetchTemplateSection(id)` → `GET /api/templates/{id}`.
3. Renders `<AppShell><PreviewModal section={section} /></AppShell>`.
4. `PreviewModal` (client component):
   - Fires `useQuery` → `GET /api/templates/{template_name}/frames` to load all brand frames.
   - Renders brand pill switcher above the preview image (hidden if only one brand).
   - Switching brand updates the preview image and passes `forcedBrandName` to `GenerationPanel`.
   - If template has input fields (`textOnly > 0` etc.), renders `InputConfigPanel` alongside the image.
   - AI-detected labels from `section.fieldLabels` are passed to `InputConfigPanel` as placeholder text.

### Step 3 — Generate prompt

1. User fills input fields; brand is set by the pill switcher (or dropdown if no switcher).
2. User clicks "Generate AI Prompt".
3. `GenerationPanel.generate()` sends `POST /api/generations` with `brand_name`, `template_name`, `metadata.input_config`.
4. FastAPI → `design_context_service.build_generation_context()` looks up `(template_name, brand_name)` → returns `figma_frame_url`.
5. `prompt_compiler.compile()` builds prompt embedding `Figma frame reference: <url>`.
6. Azure OpenAI returns compiled prompt string.
7. `GenerationPanel` shows it in the output textarea.
8. User copies → pastes into GitHub Copilot (with Figma MCP) → Copilot generates code.

---

## 5. Authentication Status

Authentication is **fully disabled**. The system runs as a single local user.

- **`middleware.ts`** — no redirects. All routes are public.
- **`backend/app/auth/dependencies.py`** — `get_current_user()` queries the first active user; creates `local@sectionai.dev` if none exists.
- **`backend/app/main.py`** — auth router commented out.

---

## 6. Database Schema — All Tables

All tables live in the `21st` PostgreSQL database.

### `users`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String(200) | Unique |
| name | String(200) | |
| hashed_password | String | Never validated |
| role | String(50) | `admin`, `designer`, `viewer` |
| is_active | Boolean | Default True |
| created_at | DateTime | |

---

### `brands`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| brand_name | Text | Unique |

**Design:** Brands are name-only records. No design tokens, no `created_at`. All visual identity lives in Figma.

---

### `categories_templates`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | VARCHAR(80) | Unique — e.g. `Header`, `Footer`, `Hero`, `Additional Section` |

---

### `templates` ← the central template table

Each row is one (template, brand) pair. Multiple rows share the same `template_name` — one per brand — each with its own Figma frame URL.

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| template_name | Text NOT NULL | Display name, e.g. `"Features-1"` |
| category_id | Integer FK → categories_templates.id | |
| brand_name | Text NOT NULL | Brand this frame belongs to |
| figma_frame_url | Text NOT NULL | Full Figma URL (right-click frame → Copy link) |
| preview_image_url | VARCHAR(255) | Shared across all brands of a template |
| text_only | Integer | Count of text-only input slots (AI-detected) |
| icon_only | Integer | Count of icon-only slots (AI-detected) |
| image_field | Integer | Count of image placeholder slots (AI-detected) |
| text_icon | Integer | Count of icon+text combined slots (AI-detected) |
| field_labels | JSONB | AI-detected slot labels — `{ text_fields, icon_slots, image_fields, icon_text_slots }` |

**Deduplication:** `GET /api/templates` uses `DISTINCT ON (template_name)` so each template name appears once in the marketplace. All brands are accessible via the detail page brand switcher.

**Field detection:** On `POST /templates/add`, if no sibling row for the same `template_name` has non-zero counts, the backend calls Figma API + OpenAI vision to detect and store field counts + labels. Sibling rows copy counts/labels from the first detected row — no duplicate API calls.

**Migration:** Run `python migrate_add_field_labels.py` from `backend/` to add the `field_labels` column.

---


### `components`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| slug | String(160) | Unique |
| name | String(160) | |
| description | Text | |
| category | String(100) | |
| status | String(32) | `draft`, `pending`, `published`, `rejected` |
| preview_image_url | String(500) | Nullable |
| text_only / icon_only / icon_text / image_field | Integer | Input slot counts |
| created_at / updated_at | DateTime | |

---

### `generations`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK → users | |
| provider | String | `mock` or `openai` |
| model | String | |
| prompt_input | Text | |
| output_code | Text | Compiled prompt |
| tokens_used | Integer | |
| created_at | DateTime | |

---

### `icons`
10,702 rows (6,078 base icons × up to 5 variants). Unique constraint: `(name, variant)`.

| Column | Type |
|---|---|
| id | Integer PK |
| name | String |
| variant | String — `filled`, `outlined`, `rounded`, `sharp`, `two_tone` |
| category / codepoint / tags / created_at | — |

---

### `color_tokens` / `typography`
Used by Component Library button configurator.

---

## 7. Backend — File-by-File Reference

### `backend/app/core/config.py`

Pydantic `BaseSettings`. Reads from `../.env`. Key settings:

| Field | Env var | Notes |
|---|---|---|
| `database_url` | `DATABASE_URL` | `postgresql+asyncpg://…` |
| `upload_dir` | `UPLOAD_DIR` | |
| `server_origin` | `SERVER_ORIGIN` | |
| `ai_provider` | `AI_PROVIDER` | `mock` or `openai` |
| `openai_api_key` | `OPENAI_API_KEY` | Used by figma_field_detector |
| `openai_model` | `OPENAI_MODEL` | |
| `figma_api_key` | `FIGMA_API_KEY` | Used by figma_field_detector |
| `azure_openai_*` | `AZURE_OPENAI_*` | For prompt compilation |
| `cors_origins` | `CORS_ORIGINS` | |

---

### `backend/app/models/template_brand_frame.py`

```python
class TemplateBrandFrame(Base):
    __tablename__ = "templates"

    id: int (PK)
    template_name: str
    category_id: int  (FK → categories_templates.id)
    brand_name: str
    figma_frame_url: str
    preview_image_url: str | None
    text_only: int
    icon_only: int
    image_field: int
    text_icon: int         # note: DB column is text_icon (not icon_text)
    field_labels: dict | None  (JSON)

    category: CategoryTemplate  (relationship, lazy="selectin")
```

The `category` relationship is loaded automatically on every query. `serialize_frame()` accesses `frame.category.name` to get the category name string.

---

### `backend/app/models/brand.py`

```python
class Brand(Base):
    __tablename__ = "brands"
    id: int (PK)
    brand_name: str  (unique)
```

No `created_at`. No design tokens.

---

### `backend/app/services/design_context_service.py`

Resolves brand + frame for generation. Singleton: `design_context_service`.

**`build_generation_context(session, *, brand_name, template_id, template_name, require_db_context)`**
1. `_get_brand(session, brand_name)` → queries `Brand` by `brand_name`.
2. `_get_frame(...)` → looks up `templates` by int ID, then `(template_name, brand_name)`, then `template_name` only (latest by `id DESC`).
3. Returns `{ brand: {id, name} | None, template: serialized_frame | None }`.

**`serialize_frame(frame)`** — returns:
```python
{
  "id": int,
  "template_name": str,
  "template_category": frame.category.name,   # resolved via relationship
  "brand_name": str,
  "figma_frame_url": str,
  "preview_image": frame.preview_image_url,   # key kept as "preview_image" for frontend compat
  "description": None,
  "text_only": frame.text_only,
  "icon_only": frame.icon_only,
  "icon_text": frame.text_icon,               # DB col is text_icon, key is icon_text
  "image_field": frame.image_field,
  "field_labels": frame.field_labels or {},
  # backward-compat aliases:
  "name": frame.template_name,
  "category": category_name,
  "type": category_name,
  "slug": slugified template_name,
  "figma_node_id": None,
  "tags": [],
  "prompt_template": "",
}
```

**`serialize_brand(brand)`** — returns `{ id, name: brand.brand_name }`.

---

### `backend/app/services/figma_field_detector.py`

Detects input field counts and labels from a Figma frame using OpenAI GPT-4o vision.

**`detect_fields(figma_frame_url) → FieldCounts`**

1. Parses the Figma URL to extract `file_key` and `node_id` (handles both `123:456` and `123-456` formats).
2. Calls `GET https://api.figma.com/v1/images/{file_key}?ids={node_id}&format=png` with `X-Figma-Token: {FIGMA_API_KEY}` to get a pre-signed S3 image URL.
3. Sends the image URL + structured prompt to GPT-4o vision.
4. Parses JSON response into `FieldCounts`:

```python
class FieldCounts(TypedDict):
    text_only: int
    icon_only: int
    image_field: int
    text_icon: int
    text_only_labels: list[str]      # e.g. ["Headline", "Body text", "CTA"]
    icon_only_labels: list[str]
    image_field_labels: list[str]
    text_icon_labels: list[str]
```

Returns all-zero on any failure (missing API keys, Figma error, parse error). Never raises.

---

### `backend/app/api/templates.py`

| Handler | SQL behaviour |
|---|---|
| `GET /templates` | `SELECT DISTINCT ON (template_name) … ORDER BY template_name, id DESC` — one row per template |
| `GET /templates/{template_name}/brands` | Distinct `brand_name` list for a template |
| `GET /templates/{template_name}/frames` | All rows for a template, ordered by `brand_name` |
| `GET /templates/{frame_id}` | Single row by integer PK |
| `POST /templates/add` | Resolves `category_id`, checks for duplicates, creates row, then runs `detect_fields()` or copies counts from sibling |

**Sibling copy logic in `POST /templates/add`:**
```
If any existing row for template_name has non-zero counts:
    copy counts + field_labels from that sibling (no API call)
Else:
    call detect_fields(figma_frame_url) → store counts + labels
```

---

### `backend/app/api/brands.py`

| Handler | Notes |
|---|---|
| `GET /brands` | `SELECT … ORDER BY brand_name` → `BrandRead[]` |
| `GET /brands/{brand_name}` | Single brand by `brand_name` |
| `POST /brands/add` | Body: `{ brand_name }`. 409 on duplicate. |

---

### `backend/app/services/prompt_compiler.py`

`PromptCompiler.compile(base_prompt, _tokens, metadata)` builds the structured prompt. `_tokens` is unused. Embeds `figma_frame_url` from `metadata.template.figma_frame_url` as `Figma frame reference: <url>`.

---

## 8. Frontend — File-by-File Reference

### `types/section.ts`

```typescript
export type SectionItem = {
  id: string;
  name: string;
  category: SectionCategory;
  description: string;
  tags: string[];
  previewImage: string;
  promptTemplate: string;
  figmaFrameUrl: string;
  brandName: string;
  createdAt: string;
  textOnly: number;
  iconOnly: number;
  iconText: number;
  imageField: number;
  fieldLabels: {
    text_fields?: string[];
    icon_slots?: string[];
    image_fields?: string[];
    icon_text_slots?: string[];
  };
};
```

---

### `services/template-data.ts`

`TemplateRecord` (API response shape) → `templateToSection()` → `SectionItem`.

Key mappings:
- `template.figma_frame_url` → `figmaFrameUrl`
- `template.brand_name` → `brandName`
- `template.icon_text` → `iconText`
- `template.field_labels` → `fieldLabels`
- `template.preview_image` → `previewImage`

---

### `services/components-api.ts`

`componentToSection()` maps `ComponentItem` → `SectionItem` with zero-value stubs for template-specific fields (`figmaFrameUrl: ""`, `brandName: ""`, `fieldLabels: {}`, all counts `0`).

---

### `components/add-item-modal.tsx`

**Props:**
```typescript
{
  isOpen, onClose, title,
  typeOptions?: string[],
  categoriesEndpoint?: string,   // DB-driven category dropdown
  submitEndpoint: string,
  onSuccess: () => void,
  showBrandEntries?: boolean,    // activates multi-brand row UI
}
```

**When `showBrandEntries=true` (template marketplace):**
- One shared preview image upload at the top (same image stored for all brand entries).
- Dynamic list of brand entry rows — each row: [brand dropdown from `/brands`] + [Figma URL input] + [remove button].
- "Add brand" button adds more rows.
- On submit: fires one `POST /templates/add` per valid entry, each with the same `preview_image_url`.
- Form is valid when name, category, image, and at least one complete brand entry are filled.

**Brand dropdown** fetches `GET /brands` → `{ id, brand_name }[]` → option `value={b.brand_name}`.

---

### `components/preview-modal.tsx`

**Brand switcher:**
- On mount fires `useQuery` → `GET /api/templates/{encodeURIComponent(section.name)}/frames`.
- If multiple brands returned, renders pill tabs above the preview image.
- `activeBrandName` state — defaults to `section.brandName`.
- Switching pills: updates preview image (`activeFrame.preview_image`), passes `forcedBrandName` to `GenerationPanel`.

**Layout:** 3/5 width preview card (with brand switcher pills + 16:9 image) + 2/5 `InputConfigPanel` card (same height, internally scrollable) — side by side. `GenerationPanel` below.

---

### `components/generation-panel.tsx`

**Props:**
```typescript
{
  initialPrompt?: string;
  templateName?: string;
  imageField?: number;
  inputConfig?: InputConfigValues;
  forcedBrandName?: string;        // set by PreviewModal brand switcher
}
```

**When `forcedBrandName` is set:**
- Brand API call is skipped (`enabled: !forcedBrandName`).
- Dropdown replaced with a locked label: `"BrandName (from preview)"`.
- `selectedBrand` synced to `forcedBrandName` via `useEffect`.

**Brand dropdown** (when not forced): fetches `GET /brands` → `{ id, brand_name }[]` → renders `brand.brand_name`.

---

### `components/input-config-panel.tsx`

**Props:**
```typescript
{
  textOnly: number;
  iconOnly: number;
  iconText: number;
  onChange: (values: InputConfigValues) => void;
  labels?: {
    text_fields?: string[];
    icon_slots?: string[];
    image_fields?: string[];
    icon_text_slots?: string[];
  };
}
```

When `labels` are provided (from AI field detection), each slot uses the detected label as both the field label and the input placeholder. Fallback: `T1`, `I1`, `IT1` etc.

---

## 9. Complete API Endpoint Catalogue

### Brands

| Method | Path | Description |
|---|---|---|
| GET | `/api/brands` | List all brands ordered by `brand_name`. Returns `BrandRead[]`. |
| GET | `/api/brands/{brand_name}` | Get brand by name. Returns `BrandRead`. |
| POST | `/api/brands/add` | Create brand. Body: `{ brand_name }`. Returns `BrandRead`. 409 on duplicate. |

**`BrandRead`:** `{ id: int, brand_name: str }`

---

### Templates

| Method | Path | Description |
|---|---|---|
| GET | `/api/templates` | List templates — **one per unique `template_name`** (DISTINCT ON). Query params: `category`, `brand`, `limit`, `offset`. |
| GET | `/api/templates/categories` | Category names from `categories_templates`. Returns `string[]`. |
| GET | `/api/templates/{template_name}/brands` | Distinct brand names for a template. Returns `string[]`. |
| GET | `/api/templates/{template_name}/frames` | All brand frames for a template, ordered by `brand_name`. Returns `TemplateBrandFrameRead[]`. |
| GET | `/api/templates/{frame_id}` | Single frame by integer PK. Returns `TemplateBrandFrameRead`. |
| POST | `/api/templates/add` | Add a frame. Runs AI field detection. Returns `TemplateBrandFrameRead`. 409 on duplicate `(template_name, brand_name)`. |

**`TemplateBrandFrameRead`:**
```
{ id, template_name, template_category, brand_name, figma_frame_url,
  preview_image, description, text_only, icon_only, icon_text, image_field,
  field_labels,
  + backward-compat aliases: name, category, type, slug, tags, prompt_template }
```

**`TemplateBrandFrameAddRequest`:**
```
{ template_name, template_category, brand_name, figma_frame_url, preview_image_url? }
```

---

### Generations

| Method | Path | Description |
|---|---|---|
| GET | `/api/generations` | List this user's generations. |
| POST | `/api/generations` | Compile a generation prompt. Body: `GenerationRequest`. |

---

### Template Generation

| Method | Path | Description |
|---|---|---|
| POST | `/api/template-generation` | Generate page-level AI prompt (Create → Page wizard). |

---

### Components, Icons, Categories, Uploads, Users, Health

Unchanged from previous versions — see §6 for schema details.

---

## 10. Brand System

### Brand data model

```
brands
├── id
└── brand_name   (the only stored brand property)
```

Brands are name-only records. All visual identity lives in Figma.

### Brand dropdown flow (GenerationPanel)

```
GenerationPanel mounts (when forcedBrandName is not set)
  → useQuery ["brands"] → GET /api/brands
  → SELECT id, brand_name FROM brands ORDER BY brand_name
  → BrandRead[] { id, brand_name }
  → Render <select> options → Auto-select brands[0].brand_name
```

### Brand switcher flow (PreviewModal)

```
PreviewModal mounts with section.name = "Features-1"
  → useQuery ["template-frames", "Features-1"]
  → GET /api/templates/Features-1/frames
  → Returns all rows for template_name = "Features-1"
  → If length > 1: render brand pills above preview image
  → Click pill → setActiveBrandName → update preview image + forcedBrandName
```

---

## 11. Template System

### Template storage (actual DB columns)

| Field | Purpose |
|---|---|
| `template_name` | Section display name; groups all brands |
| `category_id` | FK to `categories_templates.id` |
| `brand_name` | Which brand this frame belongs to |
| `figma_frame_url` | Full Figma URL — the design spec pointer |
| `preview_image_url` | Shared thumbnail (same for all brands of a template) |
| `text_only`, `icon_only`, `image_field`, `text_icon` | AI-detected input slot counts |
| `field_labels` | AI-detected labels per slot `{ text_fields[], icon_slots[], image_fields[], icon_text_slots[] }` |

### One template, multiple brands

```
template_name = "Features-1"
  ├── brand_name = "Ibuclin Baby",  figma_frame_url = "https://figma.com/…"
  ├── brand_name = "Dr Reddys",     figma_frame_url = "https://figma.com/…"
  └── brand_name = "Crocin",        figma_frame_url = "https://figma.com/…"

Marketplace card: one card (DISTINCT ON)
Detail page: three brand pills → switching changes preview + generation target
```

### `serialize_frame()` output shape

```python
{
  "id": int,
  "template_name": str,
  "template_category": str,       # from frame.category.name (relationship)
  "brand_name": str,
  "figma_frame_url": str,
  "preview_image": str | None,    # from preview_image_url column
  "description": None,            # column doesn't exist in DB; always None
  "text_only": int,
  "icon_only": int,
  "icon_text": int,               # mapped from DB column text_icon
  "image_field": int,
  "field_labels": dict,           # { text_fields, icon_slots, image_fields, icon_text_slots }
  "name": str,                    # = template_name (backward compat)
  "category": str,                # = template_category (backward compat)
  "type": str,                    # = template_category (backward compat)
  "slug": str,                    # slugified template_name
  "figma_node_id": None,
  "tags": [],
  "prompt_template": "",
}
```

---

## 12. AI Generation Pipeline (Core Feature)

```
User clicks "Generate AI Prompt"
         │
         ▼
GenerationPanel.generate()
  POST /api/generations {
    prompt, brand_name, template_name,
    tokens: {},
    metadata.input_config: { text_fields, icon_only_slots, icon_text_slots, image_urls }
  }
         │
         ▼
generations.py → generate()
  1. design_context_service.build_generation_context(session, brand_name, template_name)
     ├── _get_brand() → Brand { id, brand_name }
     └── _get_frame(template_name, brand_name) → TemplateBrandFrame { …, figma_frame_url }
  2. generation_service.generate(provider, prompt, {}, compiled_metadata, model)
         │
         ▼
GenerationService.generate()
  1. prompt_compiler.compile(base_prompt, {}, metadata)
     → SECTION REQUIREMENTS (brand name, base instruction)
     → FIGMA DESIGN REFERENCE ("Figma frame reference: {figma_frame_url}")
     → CONTENT TO RENDER (user inputs, if any)
     → ACCESSIBILITY RULES
     → OUTPUT REQUIREMENTS
  2. Azure OpenAI → compiled prompt string
         │
         ▼
  3. Save Generation row
  4. Return GenerationRead
         │
         ▼
GenerationPanel shows prompt in output textarea
User copies → pastes into GitHub Copilot (Figma MCP enabled)
Copilot opens Figma URL → generates pixel-perfect React + Tailwind code
```

---

## 13. Prompt Compiler — Structure

`PromptCompiler.compile(base_prompt, _tokens, metadata)` assembles up to 7 sections:

### 1. `SECTION REQUIREMENTS`
Brand name + base instruction.

### 2. `FIGMA DESIGN REFERENCE` *(only if `figma_frame_url` is set)*
```
FIGMA DESIGN REFERENCE:
Figma frame reference: {figma_frame_url}
Use the Figma MCP tool to open and inspect this Figma frame. Extract and apply the exact colors,
typography, spacing, layout constraints, component structure, and visual properties from that frame.
Every design decision must come directly from the Figma frame. Do not invent, approximate, or
substitute any design value.
```

### 3. `CONTENT TO RENDER` *(only if input_config has values)*
User-provided T(x)/I(x)/IT(x) fields and image URLs.

### 4. `ICON vs BADGE RESOLUTION RULE` *(only if icon slots present)*

### 5. `ACCESSIBILITY RULES`

### 6. `OUTPUT REQUIREMENTS`
React + Tailwind, single default export.

### 7. `OPTIONAL PROMPT FRAGMENTS`

---

## 14. Template-to-Prompt Generation Flow

The **Create → Page Generator** wizard (`app/create/page/page.tsx`) produces a page-level AI prompt.(Not being used for now, but still exists in directory.)

```
Step 3: "Generate AI Prompt"
  POST /api/template-generation {
    provider, model,
    payload: {
      template_name, brand_name,
      structure: { header, hero, sections[], footer },
      component_input_configs: { "<id>": { text_fields, … }, … }
    }
  }
         │
         ▼
template_generation.py router
  1. Fetches each frame by ID from templates table (figma_frame_url included)
  2. template_generation_service.generate_template_prompt(payload)
         │
         ▼
TemplateGenerationService._generate_sync(payload)
  For each component: template_name, brand_name, Figma frame reference: {figma_frame_url}
  Azure OpenAI → plain-text page prompt
  → { compiled_prompt: string }
```

---

## 15. Input Configuration System

Input slots inject user content into templates. Counts come from AI field detection on add.

| Slot Type | DB column | Model attr | Frontend key | Form label |
|---|---|---|---|---|
| Text fields | `text_only` | `text_only` | `textOnly` | AI label or `T1`, `T2` … |
| Icon-only slots | `icon_only` | `icon_only` | `iconOnly` | AI label or `I1`, `I2` … |
| Icon+text slots | `text_icon` | `text_icon` | `iconText` | AI label or `IT1`, `IT2` … |
| Image URL fields | `image_field` | `image_field` | `imageField` | `image1`, `image2` … |

**Note:** The DB column for icon+text is `text_icon`; it is mapped to `icon_text` in the serialized output and `iconText` in the frontend.

---

## 16. Figma Field Detection

When `POST /api/templates/add` is called:

```
1. Create templates row (all counts = 0, field_labels = null)

2. Check for sibling:
   SELECT … FROM templates
   WHERE template_name = ? AND id != <new_id>
   AND (text_only > 0 OR icon_only > 0 OR image_field > 0 OR text_icon > 0)
   LIMIT 1

   If sibling found:
     Copy sibling.text_only/icon_only/image_field/text_icon/field_labels
     → No API calls (same design, different brand)

   If no sibling:
     figma_field_detector.detect_fields(figma_frame_url):
       a. Parse URL → file_key + node_id
       b. GET https://api.figma.com/v1/images/{file_key}?ids={node_id}&format=png
          Headers: X-Figma-Token: {FIGMA_API_KEY}
          → Pre-signed S3 image URL
       c. GPT-4o vision:
          Image: <S3 URL>
          Prompt: count text_only/icon_only/image_field/text_icon slots
                  + return label for each slot (from actual Figma text)
          Response: JSON { text_only, text_only_labels, icon_only, … }

3. UPDATE templates SET text_only=?, … field_labels=? WHERE id=?

4. Return serialized frame (counts + labels populated)
```

**`field_labels` structure stored in DB:**
```json
{
  "text_fields": ["Tagline", "Main heading", "Body text"],
  "icon_slots": ["Search"],
  "image_fields": ["Hero image"],
  "icon_text_slots": ["Feature 1", "Feature 2"]
}
```

**`InputConfigPanel` label usage:**
- `labels.text_fields[i]` → label and placeholder for text slot `i`
- `labels.icon_slots[i]` → label for icon slot `i`
- `labels.icon_text_slots[i]` → label and text placeholder for icon+text slot `i`
- Falls back to `T{i+1}` / `I{i+1}` / `IT{i+1}` if label is absent

---

## 17. Preview Image Architecture

Preview images are URL strings in `templates.preview_image_url`. One image is shared across all brands of a template (uploaded once in the add modal, stored in all brand rows).

Upload flow: `POST /api/upload` → `uploads/{uuid}.{ext}` → served by FastAPI StaticFiles. All preview images use **16:9 aspect ratio** with `object-contain` and `bg-white`.

---

## 18. Image URL Flow (Generation Inputs)

User pastes public image URLs in `GenerationPanel` image fields → `metadata.input_config.image_urls` → `CONTENT TO RENDER` block → AI uses as `<img src>`.

---

## 19. Material Icons Integration

10,702 rows in `icons` table. `GET /api/icons?search=…` groups by name. `InputConfigPanel` icon combobox queries this endpoint (debounced 300ms). Icons referenced by name in `CONTENT TO RENDER`.

---

## 20. Add-Item Flow

### `AddItemModal` props

| Prop | Type | Purpose |
|---|---|---|
| `showBrandEntries` | boolean | Activates multi-brand row UI (templates only) |
| `categoriesEndpoint` | string | e.g. `/categories/templates` |
| `submitEndpoint` | string | e.g. `/templates/add` |

### Per-context configuration

| Page | `categoriesEndpoint` | `submitEndpoint` | `showBrandEntries` |
|---|---|---|---|
| Marketplace | `/categories/templates` | `/templates/add` | `true` |
| Library | `/categories/components` | `/components/add` | `false` |

### Template add form fields

- **Name** (required) — `template_name`
- **Category** (required) — dropdown from `GET /api/categories/templates`
- **Preview Image** (required) — single upload, shared across all brand entries
- **Description** (optional)
- **Brands** (required) — dynamic list:
  - Each row: brand dropdown (from `GET /brands`) + Figma URL input + remove button
  - "Add brand" appends a new row
  - Remove button disabled when only one row remains

### Submit behaviour

For each valid brand entry (brand + Figma URL both filled):
```
POST /templates/add {
  template_name, template_category,
  brand_name,
  figma_frame_url,
  preview_image_url,   ← same for all entries
  description
}
```

First entry triggers AI field detection. Subsequent entries with the same `template_name` copy the counts from the first entry automatically.

---

## 21. Component Library Page

Unchanged. `/library` fetches from `components` table. `ComponentPreviewModal` for Button category shows live button configurator using `color_tokens` and `typography` tables.

---

## 22. Create Flow — Page Generator Wizard

### Step 1 — Brand & Theme
Brand dropdown from `GET /api/brands` → `{ id, brand_name }[]`.

### Step 2 — Compose Template
Four sub-selectors sourced from `templates` table. Each component's `figma_frame_url` passes through to the generation payload.

### Step 3 — Review & Generate
`POST /api/template-generation`. Backend fetches each frame's `figma_frame_url` and builds a Figma-MCP-aware page prompt.

---

## 23. Sidebar Navigation

| Label | href | Icon |
|---|---|---|
| Brand Websites | `/marketplace` | Image |
| Create | `/create/page` | PlusCircle |
| My Generations | `/generations` | History |
| Settings | `/settings` | Settings |

Expanded: `w-[18rem]`. Collapsed: `w-[6rem]` (icons only).

---

## 24. Configuration and Environment Variables

### `.env` (project root — read by both backend and frontend)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Frontend → backend base URL (default `http://localhost:8000`) |
| `DATABASE_URL` | `postgresql+asyncpg://…` — SQLAlchemy async connection |
| `SYNC_DATABASE_URL` | `postgresql://…` — used by migration scripts directly |
| `JWT_SECRET_KEY` | Unused (auth disabled) |
| `UPLOAD_DIR` | Local directory for uploaded images |
| `AI_PROVIDER` | `mock` or `openai` |
| `OPENAI_API_KEY` | GPT-4o vision — used by Figma field detector |
| `OPENAI_MODEL` | Model name for prompt compilation |
| `FIGMA_API_KEY` | Figma personal access token — used by field detector to export frame images |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI — prompt compilation |
| `AZURE_OPENAI_ENDPOINT` | e.g. `https://your-resource.openai.azure.com` |
| `AZURE_OPENAI_DEPLOYMENT` | Azure deployment name |
| `AZURE_OPENAI_API_VERSION` | e.g. `2024-08-01-preview` |

### Required packages (backend)
```
pip install httpx openai   # in addition to requirements.txt
```

### Migrations to run

```bash
cd backend
python migrate_add_field_labels.py   # adds field_labels JSONB to templates
```

---

## 25. Key Architectural Invariants

1. **Figma is the single source of truth for visual design.** No colors, fonts, or spacing values are stored in the database. All visual properties come from Figma via GitHub Copilot + Figma MCP.

2. **`figma_frame_url` is the design spec pointer.** A frame without a URL produces a prompt without a `FIGMA DESIGN REFERENCE` block. Always set it.

3. **One card per template in the marketplace.** `GET /api/templates` uses `DISTINCT ON (template_name)`. All brands are accessible from the detail page brand switcher.

4. **Brand switching changes generation target, not the preview image.** All brands of a template share the same `preview_image_url`. Switching brand in the preview modal changes which `figma_frame_url` is used for generation.

5. **AI field detection runs once per template name.** The first brand entry triggers the Figma API + OpenAI call. All subsequent brand entries for the same template copy the counts and labels — no duplicate API calls.

6. **DB column is `text_icon`; all code above it uses `icon_text`.** `serialize_frame()` maps `frame.text_icon → "icon_text"`. Frontend uses `iconText`. Keep this consistent.

7. **`brands.brand_name` is the join key everywhere.** `template_brand_frames.brand_name` matches `brands.brand_name` by string (no FK). `BrandRead` returns `{ id, brand_name }`. All dropdowns use `b.brand_name` as option value.

8. **`input_config` is the only way to inject user content.** If absent, the AI invents content.

9. **Section only — no page chrome.** Output must be a single default-exported React component without `<nav>`, `<header>`, or `<footer>` wrappers.

10. **Auth is disabled but `get_current_user()` still runs.** It always returns or creates `local@sectionai.dev`. Do not remove it from endpoints.

11. **Upload MIME type is validated server-side.** Only `image/png` and `image/jpeg` are accepted.

---

## 26. How To Trace Any Feature

### Frontend tracing path
```
1. app/{route}/page.tsx
2. components/ — UI components
3. services/ — API calls (apiFetch, useQuery)
4. Match API path → backend/app/api/ router
5. Router → backend/app/models/ (ORM)
6. Router → backend/app/services/ (business logic)
7. backend/app/schemas/ (Pydantic response shapes)
```

### Backend tracing path
```
1. backend/app/api/ — find router by URL prefix
2. Router calls design_context_service and/or domain service
3. design_context_service resolves Brand { brand_name } + TemplateBrandFrame { figma_frame_url }
4. generation_service → prompt_compiler.compile() → embeds figma_frame_url
5. Azure OpenAI returns compiled prompt
```

### Data tracing: figma_frame_url → generated code
```
templates.figma_frame_url
  → design_context_service.serialize_frame()
  → template["figma_frame_url"] in compiled_metadata
  → prompt_compiler._build_figma_reference(figma_frame_url)
  → "Figma frame reference: https://…" in compiled prompt
  → User pastes into GitHub Copilot (Figma MCP enabled)
  → Copilot opens Figma URL → fetches design spec
  → Generates pixel-perfect React + Tailwind code
```

### Data tracing: field detection → input placeholder
```
POST /templates/add { figma_frame_url }
  → figma_field_detector.detect_fields()
  → Figma API exports frame as PNG
  → GPT-4o vision → { text_only: 3, text_only_labels: ["Tagline", "Heading", "Body"] }
  → templates.field_labels = { text_fields: ["Tagline", "Heading", "Body"] }
  → serialize_frame() → field_labels in API response
  → templateToSection() → section.fieldLabels
  → PreviewModal passes section.fieldLabels to InputConfigPanel
  → InputConfigPanel renders "Tagline", "Heading", "Body" as placeholders
```

### Data tracing: user text input → generated code
```
User types in InputConfigPanel (placeholder: "Tagline")
  → textFields state → PreviewModal.inputConfig
  → GenerationPanel.generate() → POST /api/generations
  → metadata.input_config.text_fields = ["Fever: Body protection"]
  → prompt_compiler._build_content_fields()
  → T1: "Fever: Body protection" in CONTENT TO RENDER
  → Azure OpenAI embeds it in compiled prompt
  → User pastes into Copilot → rendered in JSX output
```