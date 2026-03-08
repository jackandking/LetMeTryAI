# Visit Statistics

## Overview
The homepage now tracks clicks on app cards and stores visit counts in the `app_visits` table.
App cards are sorted by `visit_count` descending by default ("最热" / Hottest).

## Database Schema
Table: `app_visits`
- `app_id` (VARCHAR(64), PK): The application ID (matches `id` in `apps-metadata.json`)
- `visit_count` (INT, Default 0): Total number of clicks
- `last_visited_at` (DATETIME): Timestamp of last visit

## ImplementationDetails
- **Frontend**: `main.js` sends an async POST request to `/mysql/query` on click.
- **Backend**: Uses the `INSERT ... ON DUPLICATE KEY UPDATE` SQL pattern to atomically increment counts.
- **Sorting**: `main.js` fetches stats on load and sorts apps.

## API Usage
**Increment visit:**
```sql
INSERT INTO app_visits (app_id, visit_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE visit_count = visit_count + 1
```

**Get stats:**
```sql
SELECT app_id, visit_count FROM app_visits
```
