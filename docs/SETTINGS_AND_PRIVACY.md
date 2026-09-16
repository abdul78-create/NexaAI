# Phase 15 — Settings & Privacy Architecture

## 1. Overview
The Settings Studio at `/app/settings` provides users with control over account profile details, appearance themes, AI default models, auto-preprocessing flags, and data exports.

---

## 2. UserPreferences Model & Endpoints
Location: [`apps/api/app/db/models/preferences.py`](file:///c:/Users/Abdul/Desktop/Chatbot/apps/api/app/db/models/preferences.py)

### Fields
- `theme`: `dark | light | system`
- `accent_color`: `indigo | emerald | violet | cyan | amber`
- `default_model`: default model identifier (e.g. `nexa-standard`, `gpt-4o`)
- `default_language`: ISO 639-1 language code (e.g. `en`)
- `auto_ocr_enabled`: boolean flag for automatic image OCR fallback
- `auto_rag_enabled`: boolean flag for automatic document chunk retrieval
- `show_provider_disclosures`: boolean flag for provider badges

### Endpoints (`/api/v1/settings`)
- `GET /api/v1/settings/preferences`: Get caller's preferences.
- `PATCH /api/v1/settings/preferences`: Update preferences settings.
- `GET /api/v1/settings/profile`: Get profile data.
- `PATCH /api/v1/settings/profile`: Update display name.
