# Deep-Drishti

Marine surveillance stack: **React (Vite) frontend**, **Node.js / Express / MongoDB backend**, and an optional **Python enhancement** module. This README sits at the repository root (alongside `BACKEND`, `FRONTEND`, and `ENHANCE_MOD`).

---

## Repository layout

| Folder | Purpose |
|--------|---------|
| **FRONTEND** | React UI (`npm run dev` → Vite, default `http://localhost:5173`) |
| **BACKEND** | REST API (`npm run dev` from `BACKEND` → `nodemon server/server.js`, default port from `.env`) |
| **ENHANCE_MOD** | Optional image-enhancement / Flask-style services used by Enhancement Lab flows |

---

## Prerequisites

- **Node.js** (LTS recommended)
- **MongoDB** (Atlas URI or local) — connection string in `BACKEND/.env` as `MONGODB_URI`
- **npm** in each of `BACKEND` and `FRONTEND`

---

## Configuration

### Backend (`BACKEND/.env`)

- `MONGODB_URI` — required for persistence (alerts, detections, feeds, system logs, command dispatches, settings).
- `PORT` — API listen port (commonly `5003`; match your frontend proxy or `VITE_API_URL`).
- `JWT_SECRET` — must match tokens issued at login.

### Frontend (`FRONTEND/.env`)

- `VITE_API_URL` — API base path. For local dev with the Vite proxy, use **`/api/v1`** so requests go to the same origin and `vite.config.js` proxies `/api` to your Node server.
- Optional: `VITE_DEV_API_ORIGIN` — proxy target if the API is not on `http://localhost:5003`.

After changing env files, restart the dev servers.

---

## Running locally

**Terminal 1 — API (from `BACKEND`):**

```bash
npm install
npm run dev
```

**Terminal 2 — UI (from `FRONTEND`):**

```bash
npm install
npm run dev
```

Open the Vite URL (e.g. `http://localhost:5173`), log in with a seeded user (see `BACKEND/server/seed/` or your `AUTHENTICATION_SYSTEM.md` notes).

---

## Main API surface (all under `/api/v1`)

| Area | Routes (examples) |
|------|---------------------|
| Auth | `/auth/login`, `/auth/me`, … |
| Feeds & surveillance actions | `/feeds`, `/feeds/:id/surveillance/ai-analysis`, stream/capture/mark-area, … |
| Alerts | `/alerts`, `/alerts/active`, … |
| Dashboard | `/dashboard/summary`, `/dashboard/surveillance/:feedId`, … |
| Detections | `/detections` |
| Reports | `/reports/analytics`, **`POST /reports/dispatch`** (“Send to command”) |
| Reports mirror | `GET /dashboard/reports-analytics`, **`POST /dashboard/reports-dispatch`** (same handlers) |
| System logs | `/system-logs` |
| Settings | `/settings` (station AI/threshold parameters) |
| AI enhance | `/ai-enhance` (multipart; may call external Python service) |

All protected routes expect `Authorization: Bearer <token>` unless noted otherwise in code.

---

## “Send to command” (Reports) and the database

When you click **Send to command** on the Reports page, the client calls:

- `POST /api/v1/reports/dispatch`, or  
- on 404 fallback, `POST /api/v1/dashboard/reports-dispatch`

Both use the same handler. The server **persists**:

1. **`SystemLog`** — document in the `systemlogs` collection (severity `INFO`, module `COMM-RELAY`). These rows appear in the **System Logs** UI (`GET /system-logs`).
2. **`CommandDispatch`** — document in the **`command_dispatches`** collection, linked via `systemLogId`, for an explicit audit trail of command-queue submissions.

If MongoDB write fails, the API returns **HTTP 500** and nothing is silently dropped on success path.

---

## RBAC (short)

Roles such as `captain`, `vice_captain`, `surveillance_head`, `engineer`, and `analyst` are enforced per route. Analysts are generally read-only on mutating endpoints; see `BACKEND/server/middleware/authorize.js` and route files.

---

## Model pipeline (detection → alerts → logs)

The backend **detection service** can call an external detector (e.g. Flask) or simulate results. When a threat exceeds the **station confidence threshold** (from **Settings**), it can create **alerts**, **detection** records, and **system log** lines. Surveillance actions and manual “raise alert” also feed **alerts** and **logs**.

---

## Troubleshooting

- **404 on `/api/v1/...`:** Ensure the Node app is the one in `BACKEND/server/server.js` and that routes are mounted; restart after pulling changes.
- **CORS / wrong port:** Align `PORT` in `BACKEND/.env`, `VITE_API_URL`, and Vite `server.proxy` in `FRONTEND/vite.config.js`.
- **Empty System Logs after dispatch:** Confirm `MONGODB_URI` points to the same database you browse in Compass; check Network tab for `500` on `dispatch`.

---

## License / attribution

See project coursework or team policy; update this section as required.
