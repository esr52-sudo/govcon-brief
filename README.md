# GovCon Brief — Federal Contracting Intelligence Dashboard

AI-powered daily intelligence brief for GovCon professionals: BD directors, capture managers, proposal writers, and executives.

## Setup

### 1. Get API Keys

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `NEWSAPI_KEY` | [newsapi.org/register](https://newsapi.org/register) |
| `SAM_GOV_API_KEY` | [sam.gov/api](https://sam.gov/api) — register for free key |
| `CONGRESS_API_KEY` | [api.congress.gov/sign-up](https://api.congress.gov/sign-up/) |
| `BLOB_READ_WRITE_TOKEN` | Auto-provisioned via Vercel Dashboard > Storage > Blob |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |

### 2. Deploy to Vercel

```bash
npm install
cp .env.example .env.local
# Fill in your API keys
vercel deploy
```

### 3. Configure Environment Variables

Add all keys from `.env.example` to your Vercel project settings under Environment Variables.

### 4. Cron Automation

**Option A: Vercel Cron (Pro plan)**
Already configured in `vercel.json` — runs daily at 10:00 UTC (6:00 AM ET).

**Option B: GitHub Actions (Free)**
Add these secrets to your GitHub repository:
- `DEPLOY_URL` — your Vercel production URL (e.g., `https://govcon-brief.vercel.app`)
- `CRON_SECRET` — same value as your Vercel environment variable

The workflow in `.github/workflows/daily-brief.yml` triggers at 10:00 UTC daily.

### 5. Manual Trigger

```bash
curl -X GET "https://your-app.vercel.app/api/cron" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Data Sources

- **SAM.gov** — Contract opportunities posted in last 24 hours
- **USASpending.gov** — Contract awards from DoD, HHS, DHS, GSA, VA (last 7 days)
- **FPDS** — Recent contract actions via RSS
- **Agency RSS** — DoD, HHS, DHS, GSA news feeds
- **Congress.gov** — Appropriations bills, CRs, defense/healthcare budget legislation
- **Federal Register** — Procurement and contracting rules (no key required)
- **NewsAPI** — GovCon industry news

## Architecture

```
/api/cron      → Fetches all sources in parallel → Claude synthesis → Blob storage
/api/brief     → Reads latest.json from Blob → serves to frontend
/api/chat      → Streaming chat with 7-day brief history context
```

## Stack

- Next.js 15 (App Router)
- Vercel AI SDK v6 + Anthropic Claude
- Vercel Blob for persistent storage
- Tailwind CSS
