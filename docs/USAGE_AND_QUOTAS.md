# Phase 15 — Usage Analytics & Quota Architecture

## 1. Overview
Phase 15 introduces a comprehensive AI operations control center providing usage metrics, execution audit logs, quota enforcement, and CSV/JSON exports.

---

## 2. Quota System & Enforcement
Location: [`apps/api/app/services/usage/quotas.py`](file:///c:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/usage/quotas.py)

### Default Limits (Per User Per Day)
- **Requests**: 200 requests / day
- **Tokens**: 150,000 tokens / day
- **Speech Seconds**: 600 seconds / day
- **Active Storage**: 100 MB

### Enforcement Rules
- Checked authoritatively before expensive AI calls.
- If daily requests or tokens exceed quota bounds, returns `HTTP 429 Too Many Requests` with `code: "quota_exceeded"` and ISO reset timestamp.

---

## 3. Telemetry & Aggregation
Location: [`apps/api/app/services/usage/aggregation.py`](file:///c:/Users/Abdul/Desktop/Chatbot/apps/api/app/services/usage/aggregation.py)

### Endpoints (`/api/v1/usage`)
- `GET /api/v1/usage/summary`: Current month requests, tokens, speech duration, storage bytes, and estimated cost.
- `GET /api/v1/usage/timeseries`: Daily timeseries requests and token metrics for charts.
- `GET /api/v1/usage/breakdown`: Usage categorized by feature type and provider.
- `GET /api/v1/usage/history`: Paginated audit log execution history.
- `GET /api/v1/usage/quotas`: Quota summary and reset timestamp.
- `GET /api/v1/usage/export`: Export usage history as CSV or JSON file.
