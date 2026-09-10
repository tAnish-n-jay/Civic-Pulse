# Citizen-Driven Civic Issue Prioritization and Public Accountability Platform

## Problem Statement

Local governance suffers from a critical gap: there is no unified, transparent platform where citizens can report civic issues, see them prioritized fairly, track resolution in real-time, and hold representatives accountable for outcomes. Existing complaint systems are opaque, siloed, and have no accountability loop — issues get filed and forgotten.

This platform solves that by combining citizen reporting, AI-powered analysis, transparent impact scoring, and a public accountability layer into one system — moving from a complaint box to a **citizen-driven governance engine**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite) |
| **Backend** | Python (FastAPI) |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Supabase Storage (photos/videos) |
| **AI** | Google Gemini 1.5 Flash API (free tier) |
| **Auth** | Supabase Auth (JWT, role-based) |
| **Deployment** | Vercel (frontend) · Render (backend) |

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | TEXT | |
| `email` | TEXT | Unique |
| `role` | ENUM | `citizen`, `authority`, `representative` |
| `department` | TEXT | Null for citizens |
| `created_at` | TIMESTAMP | |

---

### `issues`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `title` | TEXT | |
| `description` | TEXT | Citizen-written |
| `category` | TEXT | AI-assigned: pothole, sewage, streetlight, garbage, water, infrastructure |
| `severity` | INT | AI-assigned: 1–5 |
| `location_text` | TEXT | Area/landmark |
| `latitude` | FLOAT | From browser geolocation |
| `longitude` | FLOAT | From browser geolocation |
| `photo_url` | TEXT | Supabase Storage URL |
| `reported_by` | UUID (FK → users) | |
| `assigned_department` | TEXT | AI-assigned |
| `assigned_authority_id` | UUID (FK → users) | |
| `status` | ENUM | `reported`, `acknowledged`, `in_progress`, `resolved`, `closed` |
| `ai_summary` | TEXT | One-line AI impact summary |
| `ai_severity_reason` | TEXT | Why AI gave this severity |
| `upvotes` | INT | Default 0 |
| `impact_score` | FLOAT | Calculated, stored and updated |
| `created_at` | TIMESTAMP | |
| `resolved_at` | TIMESTAMP | Nullable |

---

### `upvotes`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `issue_id` | UUID (FK → issues) | |
| `user_id` | UUID (FK → users) | |
| `created_at` | TIMESTAMP | |

> Unique constraint on `(issue_id, user_id)` — one upvote per citizen per issue.

---

### `status_updates`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `issue_id` | UUID (FK → issues) | |
| `updated_by` | UUID (FK → users) | Authority/representative |
| `old_status` | TEXT | |
| `new_status` | TEXT | |
| `note` | TEXT | Update message |
| `created_at` | TIMESTAMP | |

---

### `verifications`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `issue_id` | UUID (FK → issues) | |
| `verified_by` | UUID (FK → users) | Citizen |
| `outcome` | ENUM | `resolved`, `not_resolved` |
| `comment` | TEXT | Optional |
| `created_at` | TIMESTAMP | |

---

### `authority_stats` (materialized/computed view)
| Column | Type | Notes |
|---|---|---|
| `authority_id` | UUID (FK → users) | |
| `total_assigned` | INT | |
| `total_resolved` | INT | |
| `resolution_rate` | FLOAT | % |
| `avg_resolution_days` | FLOAT | |
| `citizen_satisfaction` | FLOAT | % of verifications marked `resolved` |
| `accountability_score` | FLOAT | Final score (see formula below) |

---

## Impact Score Formula

The **Impact Score** determines issue priority in the authority queue. It is transparent and visible to citizens on every issue card.

```
Impact Score = (Severity × 20) + (Upvotes × 3) + (Recency Score × 10) + (Category Weight × 15)
```

### Component Breakdown

| Component | Max Points | Logic |
|---|---|---|
| **Severity** (AI-assigned, 1–5) | 100 | `severity × 20` |
| **Upvotes** (citizen support) | Uncapped | `upvotes × 3` |
| **Recency Score** | 50 | `10 × e^(-days_old / 7)` — decays over time, fresh issues score higher |
| **Category Weight** | 75 | See table below |

### Category Weights

| Category | Weight | Reason |
|---|---|---|
| Sewage / Sanitation | 5 | Public health risk |
| Water Supply | 5 | Essential service |
| Pothole / Road | 4 | Safety + daily impact |
| Streetlight | 3 | Safety, nighttime |
| Garbage / Waste | 3 | Health + hygiene |
| Public Infrastructure | 2 | Lower urgency |

### Example
> Sewage overflow, severity 4, 12 upvotes, reported 2 days ago:
> `(4×20) + (12×3) + (10 × e^(-2/7)) + (5×15)`
> = `80 + 36 + 7.5 + 75` = **198.5**

The score is recalculated every time someone upvotes or on a daily cron job (for recency decay).

---

## Authority Accountability Score Formula

Shown on the public **Representative Accountability Page** — visible to all citizens.

```
Accountability Score = (Resolution Rate × 40) + (Satisfaction Rate × 35) + (Avg Speed Score × 25)
```

| Component | Max Points | Logic |
|---|---|---|
| **Resolution Rate** | 40 | `(resolved / assigned) × 40` |
| **Satisfaction Rate** | 35 | `(positive verifications / total verifications) × 35` |
| **Avg Speed Score** | 25 | `25 × e^(-avg_days / 14)` — faster resolution = higher score |

**Final score is out of 100.** Displayed as a grade:
- 80–100 → 🟢 Excellent
- 60–79 → 🟡 Average
- 40–59 → 🟠 Below Average
- <40 → 🔴 Poor

---

## AI Integration (Gemini 1.5 Flash)

### Feature 1 — Auto Issue Analysis (Must Have)
Triggered when a citizen submits an issue. Sends the title + description to Gemini and gets back structured JSON:

```json
{
  "category": "pothole",
  "severity": 4,
  "severity_reason": "Major road damage on a high-traffic route poses accident risk",
  "assigned_department": "Roads and Infrastructure Department",
  "impact_summary": "Large pothole on MG Road causing vehicle damage and traffic slowdown"
}
```

This populates the issue card's "AI Analysis" section — judges can see it working in real time.

### Feature 2 — Duplicate Detection (High Impact)
Before submission, send the new issue description + last 30 issues in the same area to Gemini. If similarity is detected, return a warning:
> *"A similar issue was reported 300m away 2 days ago. Want to upvote that instead?"*

Prevents spam. Shows intelligent deduplication.

### Feature 3 — Authority Response Assistant (Polish)
When an authority opens an issue, a "Draft Update" button sends the issue context to Gemini and generates a suggested status note. One-click copy into the update field.

---

## Phase-wise Implementation Plan

---

### Phase 0 — Project Setup `[~2 hours]`

**Goal:** Skeleton running, DB ready, auth working.

- [.] Init React app with Vite
- [.] Init FastAPI project with folder structure (`/routes`, `/models`, `/services`, `/ai`)
- [.] Create Supabase project → set up all tables from schema above
- [.] Configure Supabase Auth with roles (`citizen`, `authority`, `representative`)
- [.] Set up `.env` for Gemini API key, Supabase URL + keys
- [.] Basic FastAPI health check route → confirm frontend can reach backend
- [.] Set up Supabase Storage bucket for issue photos

**Deliverable:** Login page works, roles exist, DB tables are live.

---

### Phase 1 — Issue Reporting + AI Analysis `[~3 hours]`

**Goal:** Citizen can report an issue and AI instantly analyzes it.

**Backend (FastAPI):**
- `POST /issues` — accepts form data (title, description, photo, location)
- Calls Gemini API with structured prompt → parses JSON response
- Calculates initial Impact Score
- Stores everything in `issues` table

**Frontend (React):**
- Report form: title, description, category (overridable), severity slider, photo upload, location (auto from browser geolocation + manual text fallback)
- On submit → loading state → show AI analysis result before confirming
- "AI thinks this is a **Pothole, Severity 4** — assigned to Roads Dept. Confirm?" → citizen confirms or overrides

**AI Prompt (Gemini):**
```
You are a civic issue classifier. Given a citizen's issue report, return ONLY valid JSON with these fields:
category, severity (1-5), severity_reason, assigned_department, impact_summary.

Issue Title: {title}
Issue Description: {description}

Return only JSON. No explanation. No markdown.
```

**Deliverable:** Submit an issue → see AI analysis → issue appears in DB with score.

---

### Phase 2 — Citizen Dashboard `[~3 hours]`

**Goal:** The most important screen — issue feed sorted by Impact Score.

**Backend (FastAPI):**
- `GET /issues` — returns all issues sorted by `impact_score` DESC
- Query params: `?category=`, `?status=`, `?area=`
- `POST /issues/{id}/upvote` — adds upvote, recalculates Impact Score, returns new score

**Frontend (React):**
- Issue cards showing: category badge, location, photo thumbnail, status pill, upvote button + count, Impact Score (prominent)
- Clicking score shows breakdown popup: "Severity: 80 + Upvotes: 36 + Recency: 7.5 + Category: 75 = **198.5**"
- Filters: category, status, area
- Real-time score update on upvote (optimistic UI)
- Issue detail page: full description, photo, AI analysis section, status timeline

**Deliverable:** Dashboard showing live sorted issues. Upvoting visibly changes score and rank.

---

### Phase 3 — Authority Panel `[~2 hours]`

**Goal:** Authority sees their queue, can update status, add notes.

**Backend (FastAPI):**
- `GET /authority/issues` — issues assigned to logged-in authority, sorted by Impact Score
- `POST /issues/{id}/status` — updates status, logs to `status_updates`
- `GET /issues/{id}/draft-update` — calls Gemini to generate suggested note (Feature 3)

**Frontend (React):**
- Separate `/authority` route (protected by role)
- Same issue cards but with "Update Status" button
- Status pipeline UI: `Reported → Acknowledged → In Progress → Resolved`
- Each update shows in a timeline on the issue detail page (visible to citizens too)
- "Draft Update" button → AI-generated suggestion → editable textarea → submit

**Deliverable:** Authority can move issues through pipeline. Citizens see status changes in real time.

---

### Phase 4 — Verification + Accountability Page `[~2 hours]`

**Goal:** Close the loop — citizens verify, accountability scores update.

**Backend (FastAPI):**
- `POST /issues/{id}/verify` — citizen submits resolved/not_resolved + comment
- `GET /accountability` — returns all authorities with their accountability scores
- `GET /accountability/{authority_id}` — detailed breakdown

**Frontend (React):**
- When issue status = `resolved` → citizen sees "Verify Resolution" button
- Simple modal: "Was this actually fixed?" → Yes / No + optional comment
- `/accountability` page — public leaderboard of all authorities/representatives
  - Cards showing: name, department, total issues, resolution rate, satisfaction rate, accountability score, grade badge
  - Sorted by accountability score
  - Clicking opens detail page with full history

**Deliverable:** Full accountability loop. Leaderboard is public and visible without login.

---

### Phase 5 — Duplicate Detection + Polish `[~2 hours]`

**Goal:** Add duplicate detection AI feature, seed data, make demo bulletproof.

- [ ] Implement duplicate detection on issue submit (Gemini call with nearby issues context)
- [ ] Seed DB with 10 realistic issues across all categories with photos
- [ ] Create 2 authority accounts with different accountability scores (one good, one poor) for demo contrast
- [ ] Landing page: platform name, 3-line problem statement, "Report an Issue" CTA
- [ ] Error handling on all API calls (don't let Gemini timeout crash the UI)
- [ ] Test full demo path end-to-end: report → AI analysis → dashboard → authority update → citizen verify → accountability score updates
- [ ] Deploy frontend to Vercel, backend to Render

**Deliverable:** Demo-ready. Full story path works without bugs.

---
##Existing Solutions

1. MyGov.in is a government-run citizen engagement portal that allows users to submit suggestions and complaints to various ministries. However, it is largely top-down and communication-heavy — there is no real-time issue tracking, no prioritization mechanism, and no way for citizens to verify whether their complaint was actually resolved. It functions more like a feedback form than an accountability system.

2. BBMP Sahaaya (Bengaluru) is a ward-level complaint portal specific to the BBMP corporation. Citizens can log civic issues like garbage, roads, and water supply. But it operates as a basic ticketing system — complaints go in, a ticket number comes out, and the citizen has no visibility into what happens next. There is no scoring, no public dashboard, and no accountability for ward officers.

3. Swachhata Platform by the Ministry of Housing and Urban Affairs is limited strictly to sanitation and garbage-related complaints. It has no cross-department capability, no prioritization, and no citizen verification layer. Resolution is self-reported by authorities with no independent check.

4. CPGRAMS (Centralized Public Grievance Redress and Monitoring System) is the central government's grievance portal. It is deeply bureaucratic — complaints are routed manually through departments, response times are poor, and the entire process is invisible to the citizen after submission. There is no concept of community support, urgency scoring, or public accountability.

5. Fix My Street (UK) is the closest international equivalent. Citizens report street-level issues with photos and location, and it has a public map of reported problems. However, it has no AI layer, no impact scoring formula, no accountability scoring for representatives, and is not present in India.

How Ours Is Different

1. Every existing platform treats civic grievance as a one-way pipeline — citizen files, authority decides, citizen waits. There is no transparency in how issues are prioritized, no community voice in what gets fixed first, and critically, no independent verification that anything was actually resolved.

2. Our platform is built around three ideas none of them implement:

1) Transparent Priority Scoring. Instead of issues being handled in the order they arrive or based on internal bureaucratic judgment, every issue gets a publicly visible Impact Score calculated from severity, citizen upvotes, category weight, and recency. Citizens can see exactly why one issue ranks above another. No black box.

2) AI-Powered Classification. When a citizen submits an issue, Google Gemini instantly reads the description, assigns a category, estimates severity with a reason, identifies the responsible department, and generates a one-line impact summary. This removes manual triage entirely and ensures issues reach the right authority faster. No existing Indian civic platform does this.

3) Citizen Verification and Public Accountability. When an authority marks an issue as resolved, citizens can verify whether it was actually fixed. These verifications feed into a public Accountability Score for every authority and elected representative — covering their resolution rate, average response time, and citizen satisfaction. This score is visible to everyone, creating continuous public pressure to perform. No existing system closes this loop.

The difference is not incremental. Existing platforms are digital complaint boxes. Ours is a governance accountability engine.


## Demo Script (for judges)

1. Open landing page → explain the problem in 20 seconds
2. Login as citizen → report a new issue (type description, watch AI analyze it live)
3. Show the dashboard → explain Impact Score breakdown
4. Upvote an issue → watch it move up the queue
5. Login as authority → show sorted queue → update status to "In Progress"
6. Back as citizen → see status update in timeline
7. Mark issue resolved as authority → citizen verifies
8. Open Accountability Page → show the public leaderboard
9. Point out: "Every number here is real data. No black box. Citizens can see exactly why an issue is ranked where it is, and exactly how well their representative is performing."

---

## Key Differentiators for SIH Judges

- **Transparent Impact Score** — formula is visible on every card, not a black box
- **AI analysis is functional** — Gemini actually reads and classifies in real time
- **Full accountability loop** — not just reporting, but verification and public scoring
- **Duplicate detection** — prevents gaming and spam
- **Role-based** — three distinct experiences (citizen / authority / public) in one platform
