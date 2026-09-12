# AI Layer

## Tools
| Tool | Arguments | Notes |
|---|---|---|
| `add_expense` | amount, category, description, date? | Category whitelist, date validated, defaults to today |
| `add_income` | amount, source, date? | Source whitelist |
| `get_summary` | period: this_month / last_month / this_year / all | Totals + savings rate |
| `category_breakdown` | period | Amount + share % per category |
| `monthly_trend` | months (1-12) | Recent months, income vs expense, net |
| `search_transactions` | query, type?, limit? | Description/source substring match |
| `list_recent_transactions` | limit? | Newest first |

All tools return `{ok, ...}` objects instead of throwing so the agent can
recover from bad arguments within the same turn.

## Models (free tier)
- Text/agent: `llama-3.1-8b-instant` (fast, tool-calling capable).
- Vision (receipts): `meta-llama/llama-4-scout-17b-16e-instruct`, JSON mode.

## Cost controls
- Context trimmed to 12 messages; max_tokens 800; temperature 0.2.
- Tool loop capped at 5 iterations.
- Insights make exactly one extra JSON-mode call and fall back to local-only.
- Every run is recorded in `ai_events` with token counts — watch `/admin`.
