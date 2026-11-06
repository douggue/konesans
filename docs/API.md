# Konesans server API (Nakama)

All calls are Nakama RPCs: `POST {BASE}/v2/rpc/{id}` with a JSON **string** body (Nakama wraps payloads: send `JSON.stringify(JSON.stringify(payload))`, or use `?unwrap` to send the raw JSON object).
We always use `?unwrap`, so the body is the plain JSON payload and the response body is the plain JSON result.

- `BASE` = `https://api.<server>` (Caddy proxies to Nakama :7350).
- Errors: HTTP 4xx/5xx with `{ "code": number, "message": string, "error": object }`. Show `message` (validation problems are joined with " · "). 401 = session expired → refresh; 403 = not an admin.

## Authentication

### Admin login
`POST {BASE}/v2/account/authenticate/email?create=false`
Header: `Authorization: Basic base64(SERVER_KEY + ":")`
Body: `{ "email": "...", "password": "..." }` → `{ "token": "...", "refresh_token": "..." }`.
Then every admin RPC uses `Authorization: Bearer <token>`.
Refresh: `POST {BASE}/v2/account/session/refresh` (Basic server key) body `{ "token": refresh_token }`.
Tokens expire after 2 h; refresh tokens after 30 days.

`SERVER_KEY` is public-ish (it only allows creating/logging in sessions). Admin power comes from the account's email being in the server's admin list (`KONESANS_ADMINS` env). Non-admins get `403 permission denied` on every `admin_*` RPC.

### App (kids' devices) public content
No login needed; the app sends the runtime HTTP key (read-only content):
`POST {BASE}/v2/rpc/content_manifest?http_key=HTTP_KEY&unwrap` body `{}`
`POST {BASE}/v2/rpc/content_pack?http_key=HTTP_KEY&unwrap` body `{ "category": "istwa" }`

## Data shapes

```ts
type Lang2 = { ht: string; fr: string };
interface AdminQuestion {          // compact shape, same as content/bank/*.json
  id: string; category: string; d: 1|2|3; ages: ('6-8'|'9-11'|'12-14')[];
  ht: string; fr: string; opts: string[]; optsFr: string[]; a: number;
  ex: string; exFr: string; topic?: string; note?: string;
  status: 'review'|'approved'|'draft';
  updatedAt?: string; updatedBy?: string;   // set by server
}
interface Category {
  id: string;            // 'istwa' (lowercase, a-z0-9-)
  name: Lang2;           // { ht: 'Istwa', fr: 'Histoire' }
  icon: string;          // icon name from the app's icon set, e.g. 'istwa'
  color: string;         // '#1F47B5'
  order: number;
  enabled: boolean;      // hidden in the app when false
  isNew: boolean;        // shows the "Nouvo" badge
  ages: ('6-8'|'9-11'|'12-14')[];
}
interface AppConfig {
  announcement: { on: boolean; ht: string; fr: string; color: 'blue'|'yellow'|'red'|'green' };
  maintenance: { on: boolean; ht: string; fr: string };
  features: { duels: boolean; courses: boolean; coding: boolean; math: boolean; peyi: boolean };
  serveReview: boolean;  // also serve questions still waiting for proofreading
  dailyCount: number;    // questions in the daily challenge (5..20)
  minAppVersion: string; // '1.0.0'
}
interface Manifest {
  version: number;               // increments on every publish
  publishedAt: string;
  config: AppConfig;
  categories: Category[];
  strings: Record<string, [string, string]>; // UI text overrides: key -> [ht, fr]
  packs: { category: string; count: number; hash: string }[];
}
```

## Public RPCs (http_key)
| id | body | result |
|---|---|---|
| `content_manifest` | – | `Manifest` (the last *published* one; `{version:0}` before the first publish) |
| `content_pack` | `{category}` | `{ category, version, questions: Question[] }` (app `Question` shape, already filtered to approved (+review if `serveReview`)) |

## Admin RPCs (Bearer token, admin only)
| id | body | result |
|---|---|---|
| `admin_me` | – | `{ email, userId, admins: string[] }` |
| `admin_stats` | – | `{ questions: {total, review, approved, draft, byCategory: Record<cat,{total,review,approved,draft}>}, players: {total, last7d}, reports: {open}, published: {version, publishedAt}, draftChanges: number }` |
| `admin_questions` | `{category}` | `{ questions: AdminQuestion[] }` (all statuses) |
| `admin_question_save` | `{question: AdminQuestion}` | `{ question }` (validated; new id allowed) |
| `admin_question_delete` | `{id}` | `{ ok: true }` |
| `admin_question_status` | `{ids: string[], status}` | `{ updated: number }` |
| `admin_next_id` | `{category}` | `{ id }` (e.g. `ist-321`) |
| `admin_import` | `{questions: AdminQuestion[], overwrite?: boolean}` | `{ added, updated, skipped }` (max 150 per call: Nakama caps request bodies) |
| `admin_categories` | – | `{ categories: Category[] }` |
| `admin_categories_save` | `{categories: Category[]}` | `{ categories }` |
| `admin_config` | – | `{ config: AppConfig }` |
| `admin_config_save` | `{config: AppConfig}` | `{ config }` |
| `admin_strings` | – | `{ defaults: Record<key,[ht,fr]>, overrides: Record<key,[ht,fr]> }` |
| `admin_strings_save` | `{overrides}` | `{ overrides }` |
| `admin_publish` | – | `{ version, publishedAt, packs }` |
| `admin_reports` | – | `{ reports: {reporterId, targetId, reason, matchId, at, resolved?}[] }` |
| `admin_report_resolve` | `{index}` | `{ ok: true }` |
| `admin_change_password` | `{current, next}` | `{ ok: true }` (next ≥ 8 chars; 403 if current is wrong) |
| `admin_audit` | – | `{ entries: {at, by, action, target}[] }` (last 200) |

Edits are live in the admin immediately but reach kids' phones only after **Publish** (`admin_publish`). The app checks the manifest on start and when coming back online.
