# ADR-007: Paging and Incremental Loading Strategy

**Date:** 2026-05-31  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** [GitHub Issue #170](https://github.com/ZBlocker655/StudyPuck/issues/170)

## Context and Problem Statement

StudyPuck is feature-complete at v1.0 but all list-heavy surfaces currently load the full dataset with no paging. A power user may accumulate 10,000+ cards over time. Several surfaces will become unusable at that scale without a loading strategy. This ADR defines the cross-application approach.

## Decision Drivers

* **Scale target:** a single user may have 10,000+ active cards across all languages
* **Primary usage pattern:** users filter/search first; unfiltered browsing of the full card set is uncommon but must not be broken
* **Data mutation during browsing:** cards are actively edited while browsing; offset-based pagination produces duplicates and skips when sort order shifts
* **Future navigation model:** a planned redesign will replace slide-in drawers with full card detail pages and URL-based back navigation, requiring that list state be encodable in a URL (see [Consequences](#consequences))
* **Developer velocity:** paging is infrastructure work; the strategy must not block feature delivery

---

## Decision

### 1. Pagination pattern: cursor-based

All paginated list surfaces will use **cursor-based pagination**, not offset-based (`LIMIT x OFFSET y`).

**Cursor key for card lists:** composite `(updatedAt DESC, cardId ASC)` — the `updatedAt` timestamp of the last seen item plus its `cardId` as a tiebreaker. This key is stable even when other cards are updated while the user browses.

**Why not offset-based:** if card A is edited while the user is on page 3, it moves to the top of the sort order. Every subsequent "next page" fetch with an offset sees a shifted list — cards are duplicated or silently skipped. Cursor-based avoids this entirely.

### 2. UX pattern: pending navigation redesign

The UX pattern (load-more button vs. cursor pages with URLs) is **intentionally deferred** pending the planned drawer → full-page-navigation redesign. The two decisions are tightly coupled:

* **Load-more (append):** accumulated list state cannot easily be encoded in a URL; back navigation loses scroll position
* **Cursor pages with URLs:** each "page" has a stable URL; back navigation is a literal URL redirect; natural fit for full-page navigation model

Until the navigation redesign is scoped, surfaces may use either pattern internally as long as they use cursor-based pagination at the API level.

### 3. API / backend contract

Paginated endpoints return:

```json
{
  "items": [...],
  "nextCursor": "<opaque-string or null>",
  "totalCount": 1247,
  "filteredCount": 83
}
```

* `nextCursor`: opaque string encoding the position marker; `null` means end of results
* `totalCount`: total items for the language/scope (useful for "You have 1,247 cards")
* `filteredCount`: items matching the current search/filter (useful for "83 results")
* No `prevCursor` — backward navigation is handled through browser/URL history

Cursor encoding: base64 of `{ updatedAt: ISO string, cardId: string }` (implementation detail, may change).

### 4. Per-surface recommendations

| Surface | Long-term strategy | Short-term safety cap |
|---|---|---|
| Card Library (unfiltered) | Cursor-based paging, 50 per page | Hard cap 300 — show "Showing 300 most recent cards — search or filter to find specific cards" |
| Card Library (filtered/searched) | Full list when ≤300 results; cursor paging beyond | No cap needed for typical filtered sets |
| Group Detail card list | Full list when ≤300 cards in group; cursor paging beyond | No immediate action needed |
| Add Cards to Group drawer | Server-side search required; cap 100 results; no paging | Cap at 100 now — show "Search to see more" |
| Groups list | Full list (groups are intentionally created; unlikely to exceed ~100) | No cap needed |
| Inbox notes list | Full list of unprocessed notes (naturally drains; rarely large) | No cap needed |
| Draft cards list | Full list (naturally small; drains to Cards) | No cap needed |
| Translation Drills context cards | Full list (bounded by study session; small by design) | No cap needed |
| Review history / drill history | Cursor-based paging when built | Not yet built — decide at build time |
| Statistics timelines | Cursor-based or date-range bounded when built | Not yet built — decide at build time |

### 5. Default page size

**50 items** per page for all cursor-paginated surfaces unless otherwise specified.

### 6. Search and filter interaction

* Search/filter parameters are part of the query alongside the cursor
* Changing a filter resets the cursor to the beginning of the new result set
* `filteredCount` is returned with every response so the UI can show "X results"

### 7. Sort order and ordering guarantees

* Default sort for all card lists: `updatedAt DESC, cardId ASC`
* Sort order must be **total** (no ties that could produce non-deterministic ordering) — the composite cursor key guarantees this
* If alternative sort orders are added later (e.g., alphabetical, by CEFR level), each sort order needs its own cursor key design

### 8. Interaction with bulk select and drawer navigation

* **Bulk select mode:** operates on the currently loaded set; selecting across pages is out of scope for v1 bulk operations
* **Drawer prev/next navigation scoped to the filtered set:** this feature is dependent on the navigation redesign and should be revisited alongside it
* **Command-bar / chat context snapshots:** chat context should snapshot the currently visible filtered set (not the full dataset); the `filteredCount` gives the AI useful context even when the full list is not loaded

---

## Consequences

### Positive
* Cursor-based pagination is correct and stable for mutable datasets sorted by `updatedAt`
* `filteredCount` + `totalCount` in every response gives the UI and AI useful aggregate information without extra queries
* The backend contract is defined now; frontend UX pattern can be decided later without changing the API

### Negative / risks
* The UX pattern (load-more vs. cursor pages) remains **an open decision** until the navigation redesign is scoped — this means implementations in the interim may diverge and need to be reconciled
* Cursor encoding adds a small layer of complexity vs. plain offset numbers
* `filteredCount` for large datasets requires a separate `COUNT(*)` query on every page fetch — acceptable at current scale, may need caching or estimation later

### Open follow-up issues needed
* Implementation ticket: add cursor-based paging to Card Library (unfiltered) with 300 short-term cap
* Implementation ticket: add server-side search + 100-result cap to Add Cards to Group drawer
* Design ticket: define UX pattern (load-more vs. cursor pages) as part of drawer → full-page navigation redesign

---

## Alternatives Considered

### Offset-based pagination
Rejected. For a list sorted by `updatedAt DESC`, any edit during browsing shifts the sort order and causes duplicates or skipped items on subsequent page fetches. Unacceptable for a study app where users actively edit cards while browsing.

### Infinite scroll
Deferred pending navigation redesign. Infinite scroll cannot represent its accumulated state in a URL, which conflicts with the planned full-page-navigation model where "Back to results" requires a stable URL.

### Full list with no paging
Acceptable for v1 on most surfaces. Explicitly rejected for Card Library unfiltered (10,000+ cards) and Add Cards to Group drawer (same scale). Short-term caps serve as a bridge.
