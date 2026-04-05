# Card Entry Storyboard

> **Status**: Authoritative  
> **Depends on**: [card-entry.md requirements](../../requirements/functionality/card-entry.md), [information-architecture.md](../information-architecture.md), [global-navigation.md](./global-navigation.md), [llm-command-interface.md](./llm-command-interface.md), [card-library-and-groups.md](./card-library-and-groups.md)

This document specifies every screen and interaction in the Card Entry feature — its layouts, interactive states, AI assistance behavior, and edge cases — across desktop and mobile breakpoints. Card Entry is the capture-and-review pipeline through which raw notes are transformed into draft cards and ultimately promoted to the active card library.

---

## Design Decisions

The following decisions were made during the UX design process. Each is captured here as the authoritative record of intent.

| # | Decision | Rationale |
|---|---|---|
| 1 | **Inbox rows: 2–3 line preview** — content text shown at up to 3 lines + timestamp below | Notes are unstructured; one line is rarely enough to distinguish them, full cards waste space |
| 2 | **Inbox sort: oldest-first by default (FIFO), user can toggle** — a sort toggle in the filter bar flips between oldest-first and newest-first | FIFO naturally clears the backlog; user should be able to work LIFO if preferred |
| 3 | **Quick-add: three entry points** — (a) inline text input at the top of the inbox view, (b) global FAB (already defined in global-navigation.md — opens Quick-Add Note drawer, Feedly motif), (c) `/add [text]` global command bar command | Each serves a distinct moment; no redundancy |
| 4 | **Note count badge: both locations** — unread/unprocessed note count shown in nav sidebar / tab bar next to Card Entry item AND as a count in the Card Entry app header | Nav badge tells you from anywhere; in-app count reinforces context |
| 5 | **Processing workspace layout: sticky note header + stacked draft card panels** — the original note text is pinned as a sticky header at the top of the context pane; linked draft card panels scroll below it | Note always in view; multiple drafts naturally stack |
| 6 | **Draft card editing: always-editable inline, auto-save on blur** — same pattern as Card Library | Consistent UX; no friction |
| 7 | **Sign-off: single "Sign off — Promote all to active" button** — clicking it promotes all linked draft cards to active status; note becomes "processed" | Simple; batch approval at end of review session |
| 8 | **Duplicate detection: inline warning on card panel + sign-off confirmation** — each draft card gets an inline warning badge/banner if a similar existing card is detected (async); if any unresolved warnings remain when user clicks Sign off, a confirmation dialog appears | Inline warning catches it during review; confirmation is a safety net |
| 9 | **AI preprocessing loading state: single loading banner** — "AI is preparing your cards…" with a spinner shown above the draft card area while async preprocessing is in-flight; no card panels shown yet | Clean; not distracting |
| 10 | **AI schema gap flagged as requirement** — the current `inboxNotes` schema has no `ai_state` field; the ability to show the AI loading state requires a backend addition (e.g., `ai_state: 'queued' \| 'processing' \| 'complete' \| 'failed'`); document this in the spec as a requirement note | Backend requirement; frontend must poll or receive push updates |
| 11 | **Draft Cards standalone view: same row format as Card Library** — same row layout (content preview, groups, date), with an added "Draft" badge replacing the active status indicator, and a "Source note" snippet below the content | Consistency; users already know the Card Library row pattern |
| 12 | **AI suggestions: inline below the relevant field** — group suggestions appear below the group picker; example sentence suggestions appear below the example sentences field; etc. | No context switching; suggestions are co-located with the field they affect |
| 13 | **AI suggestion interaction: one-click accept, ✕ dismiss, click-to-edit** — each suggestion is a chip/row; single click adds it to the field; ✕ button dismisses it; clicking the suggestion text opens it in an inline edit before accepting | Fast accept; escape hatch for modification |
| 14 | **Card status: always draft → sign-off → active** — no per-card "start as active" toggle; all cards created during processing start as draft and are only promoted at sign-off | Simpler; enforces the approval gate |
| 15 | **Inline group creation: `+ Create "[typed text]"` at bottom of dropdown** — same pattern as Card Library storyboard | Consistent; no context switch |

---

## Open Requirements

> ⚠️ **Backend requirement**: The `inboxNotes` schema currently has no `ai_state` field. Showing the AI loading state (Decision 9) and reacting to AI processing completion requires a new field:
>
> ```typescript
> ai_state: 'queued' | 'processing' | 'complete' | 'failed'
> ```
>
> The frontend must either poll the note's `ai_state` or receive a push update (e.g., via Server-Sent Events or a WebSocket subscription) to know when to transition from the loading banner to the populated draft card panels. This field must be added before the AI preprocessing feature can be implemented end-to-end.

---

## 1. Inbox View

**Route**: `/[lang]/card-entry` (or `/[lang]/card-entry/inbox`)

The inbox is the starting point of the Card Entry flow — a chronologically ordered list of all unprocessed notes for the active language.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉ StudyPuck                                  Chinese ▾          [ ZB ]        │ ← top bar
├──────────────────┬──────────────────────────────────┬───────────────────────┤
│                  │ Card Entry  [12]                  │                       │
│ ○ Home           │ ────────────────────────────────  │                       │
│ ▶ Card Entry [12]│ [ New note...           ] [ Add ] │                       │
│ ○ Card Review    │ [ Oldest first ▾ ]                │  Conversation         │
│ ○ Trans. Drills  │ ─────────────────────────────── ─ │  (LLM Chat)           │
│ ○ Cards          │ Saw a great example sentence in   │                       │
│ ○ Statistics     │ the textbook about time expres…   │                       │
│                  │ and relative clause patterns.     │                       │
│ [ + Quick Add ]  │ 2h ago  Process → | Defer | 🗑    │                       │
│ ──────────────── │ ──────────────────────────────── ─│                       │
│ ○ Settings       │ Need to review particles が vs を │                       │
│                  │ in context — very confusing.      │                       │
│                  │ 1d ago                            │                       │
│                  │ ──────────────────────────────────│                       │
│                  │ Overheard: 仕方がない — resigna…  │                       │
│                  │ tion phrase, very natural usage.  │                       │
│                  │ 3d ago                            │                       │
│                  ├──────────────────────────────────┴───────────────────────┤
│                  │ / Type a command or ask anything...                        │
└──────────────────┴─────────────────────────────────────────────────────────  ┘
```

*`[12]` = unprocessed note count badge. `▶` = active nav item. Row actions visible on hover.*

The context pane shows the inbox; the conversation pane (right) holds the LLM chat. The command bar spans the full content area at the bottom.

**Heading area:**

| Element | Detail |
|---|---|
| Heading | "Card Entry" in page-level heading size |
| Count badge | Pill badge showing the unprocessed note count (e.g., `12`). Updates in real-time as notes are processed or added. Shows `0` when inbox is empty. |

**Quick-add input (top of inbox):**

| Element | Detail |
|---|---|
| Text field | Single-line, placeholder "New note...", full-width of context pane minus submit button |
| Submit button | "Add" — clicking creates a note and adds it to the top or bottom of the inbox (per the active sort order); the field clears |
| Keyboard shortcut | Pressing Enter while focused on the field submits |

**Sort control:**

| State | Label |
|---|---|
| Default | `Oldest first ▾` |
| Toggled | `Newest first ▾` |

Clicking the dropdown toggles between the two options. The sort order persists in the user's session.

**Note rows:**

| Element | Detail |
|---|---|
| Content preview | Up to 3 lines of the note's raw content text, truncated with ellipsis if longer. Full content visible on click (opens the processing workspace). |
| Timestamp | Relative time shown below the content: "2h ago", "3d ago", "1w ago". |
| Row hover state (desktop) | "Process →" button, "Defer" button, "🗑" delete icon appear on the right side of the row. Background gets a subtle highlight. |
| Row click | Opens the Note Processing Workspace for that note. |
| Row keyboard | Rows are focusable; Enter opens the processing workspace. |

**Note state filtering:**

The inbox shows notes with `state: 'unprocessed'` by default. A future iteration may add filter tabs (Unprocessed / Deferred / All), but v1 shows only unprocessed notes. Deferred notes are hidden from the default view.

### Mobile Layout

```
┌────────────────────────────────────────┐
│ ◉ StudyPuck                Chinese ▾   │ ← top bar
├────────────────────────────────────────┤
│ Card Entry  [12]                        │
│ ──────────────────────────────────────  │
│ [ New note...                    ]      │
│                                         │
│ [ Oldest first ▾ ]                      │
│ ──────────────────────────────────────  │
│ Saw a great example sentence in         │
│ the textbook about time expres…         │
│ 2h ago                                  │
│ ──────────────────────────────────────  │
│ Need to review particles が vs を        │
│ in context — very confusing.            │
│ 1d ago                                  │
│ ──────────────────────────────────────  │
│ Overheard: 仕方がない                   │
│ 3d ago                                  │
│                                         │
├────────────────────────────────────────┤
│  🏠    📥 [12]   🃏     💬     ···      │ ← tab bar
└────────────────────────────────────────┘
                                     [+] ← FAB
```

Mobile differences:
- Full-width content; no sidebar or conversation pane
- **Swipe-left** on a row to reveal row actions: "Process →", "Defer", "Delete" (standard iOS/Android swipe-action pattern)
- The submit button is below the text field (not inline), spanning full width: "Add to Inbox"
- The FAB (56×56px circle, bottom-right, above tab bar) triggers the Quick-Add Note drawer — per the global-navigation.md specification

### Empty Inbox State

```
┌──────────────────────────────────────────┐
│                                          │
│              📥                          │
│                                          │
│       Your inbox is empty                │
│   Use the + button or type /add          │
│   to capture a note from anywhere        │
│                                          │
└──────────────────────────────────────────┘
```

Centered illustration (inbox/tray icon), heading, and hint text. No CTA button — the quick-add input remains visible at the top of the view.

### Nav Badge

A numeric count badge appears next to the "Card Entry" item in the sidebar (desktop) and on the inbox tab icon (mobile). It shows the count of notes with `state: 'unprocessed'`. The badge disappears (or shows `0`) when there are none.

---

## 2. Quick-Add Note Drawer

Triggered from anywhere in the app by:
- The global FAB (mobile) — per [global-navigation.md](./global-navigation.md)
- The `[ + Quick Add ]` button in the sidebar (desktop) — per [global-navigation.md](./global-navigation.md)
- The `/add [text]` command bar command

> The drawer trigger and Feedly motif (right-side slide-in with dimmed backdrop) are fully specified in **global-navigation.md**. This section specifies only the drawer contents.

### Drawer Contents

```
┌──────────────────────────────────────────────────────┐
│  Add Note                                        ✕   │ ← sticky header
│  ──────────────────────────────────────────────────  │
│                                                       │
│  Language                                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  Chinese ▾                                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  Note                                                 │
│  ┌──────────────────────────────────────────────┐   │
│  │  Type or paste your note...                  │   │
│  │                                              │   │
│  │                                              │   │
│  │                                              │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  [ Add to Inbox ]            Cancel                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Heading | "Add Note" — left-aligned in the sticky header |
| Close button | `✕` in the top-right corner of the header; closes without saving |
| Language selector | Dropdown pre-filled with the current active language. Shown only if the user has more than one language configured. Single-select. |
| Note textarea | Multi-line, auto-focus on drawer open, full-width, ~4 visible rows, grows with content. Placeholder: "Type or paste your note…" |
| Submit button | "Add to Inbox" — primary button. Disabled when the textarea is empty. On click: creates the note, closes the drawer. |
| Cancel | Text link / secondary button. Closes the drawer without saving. Equivalent to clicking the backdrop or pressing Escape. |

**Backdrop and close behavior:** Clicking outside the drawer (on the dimmed backdrop) closes without saving. Pressing Escape closes without saving. These behaviors are consistent with the Feedly drawer motif used throughout the app.

**On mobile:** The drawer is full-screen (covers the entire screen above the bottom safe area), with a drag handle at the top for swipe-to-dismiss. The note textarea gets keyboard focus immediately, raising the software keyboard.

**Submission:** The note is created with `state: 'unprocessed'`, `sourceType: 'manual'`, and the current `languageId`. It appears in the inbox immediately. The AI preprocessing pipeline (`ai_state` transition) begins asynchronously.

---

## 3. Note Processing Workspace

**Route**: `/[lang]/card-entry/notes/[noteId]`

The processing workspace is the primary editing environment where the user reviews AI-generated draft cards linked to a note and promotes them to active status. The workspace assumes AI preprocessing has already (or is currently) generating draft cards — it is not a blank form.

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◉ StudyPuck                                 Chinese ▾         [ ZB ]         │
├──────────────────┬──────────────────────────────────┬────────────────────────┤
│                  │ ← Back to inbox                   │                        │
│ ○ Home           │ ╔══════════════════════════════╗  │                        │
│ ▶ Card Entry [12]│ ║ Saw a great example sentence ║  │  Conversation          │
│ ○ Card Review    │ ║ in the textbook about time    ║  │  (LLM Chat)            │
│ ○ Trans. Drills  │ ║ expressions and relative      ║  │                        │
│ ○ Cards          │ ║ clauses…                      ║  │                        │
│ ○ Statistics     │ ║ Manual · 2h ago  [Defer][Del] ║  │                        │
│                  │ ╚══════════════════════════════╝  │                        │
│ [ + Quick Add ]  │  ─ draft card panel ─             │                        │
│ ──────────────── │ ┌──────────────────────────────┐  │                        │
│ ○ Settings       │ │ Content                       │  │                        │
│                  │ │ [ Relative time expression… ] │  │                        │
│                  │ │ Groups                        │  │                        │
│                  │ │ [ Grammar ✕ ] [+ Add group]  │  │                        │
│                  │ │ 💡 [Intermediate] [Time]      │  │ ← AI suggestions       │
│                  │ │ Examples  [ + Add ]           │  │                        │
│                  │ │ [三時間後に来てください ✕]   │  │                        │
│                  │ │ ⚠ Possible duplicate: [card]  │  │ ← duplicate warning    │
│                  │ └──────────────────────────────┘  │                        │
│                  │  + Add another card               │                        │
│                  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │                        │
│                  │ [Sign off — Promote all (3) →]    │ ← sticky sign-off bar  │
│                  ├──────────────────────────────────┴────────────────────────┤
│                  │ / Type a command or ask anything...                         │
└──────────────────┴─────────────────────────────────────────────────────────  ┘
```

*`╔══╗` = sticky note header. Draft card panels scroll below it.*

### Context Pane — Sticky Note Header

The note header is **sticky** — it remains visible at the top of the context pane as the user scrolls through draft card panels below it.

| Element | Detail |
|---|---|
| Breadcrumb | "← Back to inbox" link — navigates back to `/[lang]/card-entry` |
| Note content | Full note text, wrapped (not truncated). If very long, the header has a max height and becomes internally scrollable. |
| Note metadata | `sourceType` label (e.g., "Manual") and relative timestamp (e.g., "2h ago"), rendered in muted secondary color |
| Defer button | Moves the note to `state: 'deferred'`; navigates back to inbox |
| Delete note button | Danger style (red text/border). Triggers a brief inline confirmation ("Delete this note and its draft cards?") before proceeding. Deletes the note and all linked draft cards. |

### Context Pane — AI Loading State

Shown when `ai_state` is `'queued'` or `'processing'` (see Open Requirements). Displayed in the draft cards area, below the note header.

```
┌──────────────────────────────────────────────────────┐
│  ⏳ AI is preparing your cards…                       │  ← banner
│  ──────────────────────────────────────────────────  │
│  [spinner]                                           │
└──────────────────────────────────────────────────────┘
```

- A single full-width banner in a neutral/muted style with a spinner
- No card panels are rendered while loading
- When `ai_state` transitions to `'complete'`, the banner is replaced by the populated draft card panels (no page reload — reactive update)
- When `ai_state` is `'failed'`, the banner changes to an error state: "⚠ AI processing failed. You can add cards manually." with a "+ Add a card" CTA

### Context Pane — Draft Card Panels

One panel per linked draft card (`status: 'draft'`). Panels render in the order cards were created. The user scrolls through them vertically.

Each panel contains:

**Card fields (always-editable inline, auto-save on blur — same behavior as Card Library):**

| Field | Type | Detail |
|---|---|---|
| Content | Multi-line textarea | The card's primary content. Placeholder: "Card content…" |
| Groups | Multi-select token input | Selected groups shown as pills. `[+ Add group]` opens the group picker dropdown. Inline group creation: `+ Create "[typed text]"` at the bottom of dropdown — see [card-library-and-groups.md](./card-library-and-groups.md) |
| Example sentences | Ordered list of text inputs | Each item has a `✕` remove button. `[ + Add ]` button adds a new blank row. |
| Mnemonics | Ordered list of text inputs | Same add/remove pattern as example sentences. |
| LLM instructions | Collapsible textarea | Collapsed by default ("▸ LLM instructions"). Expanding reveals a textarea for per-card instructions to the AI. |

**AI suggestions (inline below the relevant field — Decision 12):**

```
Groups
┌──────────────────────────────────────┐
│ [Grammar ✕]  [+ Add group]           │
└──────────────────────────────────────┘
💡 AI suggests:  [Intermediate]  [Time expressions]  [+ more]
```

| Interaction | Behavior |
|---|---|
| Single click on a suggestion chip | Adds the suggested value to the field immediately |
| `✕` on a suggestion chip | Dismisses that suggestion (it does not reappear for this card) |
| Click on the suggestion text itself | Opens the suggestion in an inline edit field before accepting — "Edit before accepting" pattern |

Group suggestions: top 3–5 group chips below the group picker.
Example sentence suggestions: 2–3 sentence chips below the example sentences list.

**Duplicate warning banner (Decision 8):**

```
┌──────────────────────────────────────────────────────┐
│ ⚠ Possible duplicate:  "時間の経過 (passage of time)" │
│                           [View]     [Dismiss]        │
└──────────────────────────────────────────────────────┘
```

- Shown asynchronously below the card's content field when a semantically similar existing card is detected
- "View" link opens the existing card in a read-only drawer (or navigates to Card Library)
- "Dismiss" marks the warning as resolved (the banner disappears for this card)
- Unresolved warnings are tracked for sign-off validation (Decision 8)

**Panel footer:**

| Element | Detail |
|---|---|
| Delete card button | `🗑 Remove this draft card`. Removes only this draft from the note's linked cards. Does not affect other draft cards or the note itself. |

**Between panels:**

A subtle divider or spacing separates card panels. A `+ Add another card` button below the last panel creates a new blank draft card linked to this note.

### Context Pane — Sign-off Area

Pinned to the bottom of the context pane (above the command bar). Always visible, even while scrolling through card panels.

```
┌──────────────────────────────────────────────────────┐
│  [ Sign off — Promote all to active (3 cards) →  ]   │
└──────────────────────────────────────────────────────┘
```

| State | Behavior |
|---|---|
| Active (cards exist) | Button shows the count of linked draft cards. Click proceeds to sign-off. |
| Disabled | When no draft cards are linked to this note. Button is greyed out. |

**Sign-off flow:**
1. User clicks "Sign off — Promote all to active"
2. If any draft cards have **unresolved duplicate warnings**: the sign-off confirmation dialog appears (see below)
3. If no unresolved warnings: all linked draft cards are set to `status: 'active'`; the note is set to `state: 'processed'`; user is navigated back to the inbox

### Sign-off Confirmation Dialog

A modal dialog (not a drawer). Appears only when unresolved duplicate warnings exist at sign-off time.

```
┌──────────────────────────────────────────────────────┐
│  Duplicate warnings                                   │
│  ──────────────────────────────────────────────────  │
│  These draft cards have possible duplicates:          │
│                                                       │
│  ⚠ "Relative time expression…"                       │
│     Similar to: "時間の経過 (passage of time)"        │
│                                                       │
│  ⚠ "Aspect particle usage…"                          │
│     Similar to: "アスペクト助詞の使い方"              │
│                                                       │
│  [ Promote anyway ]              [ Go back ]          │
└──────────────────────────────────────────────────────┘
```

| Button | Behavior |
|---|---|
| "Promote anyway" | Proceeds with sign-off; all cards promoted; note marked processed |
| "Go back" | Closes the dialog; returns user to the processing workspace to review warnings |

The dialog uses `role="alertdialog"` with focus trapped inside. Closing via Escape is equivalent to "Go back".

### Mobile Layout

```
┌────────────────────────────────────────┐
│ ◉ StudyPuck                Chinese ▾   │
├────────────────────────────────────────┤
│ ← Back to inbox                        │
│ ╔════════════════════════════════════╗ │
│ ║ Saw a great example sentence in   ║ │ ← sticky note header
│ ║ the textbook about time express…  ║ │
│ ║ Manual · 2h ago  [Defer] [Delete] ║ │
│ ╚════════════════════════════════════╝ │
│ ┌──────────────────────────────────┐  │
│ │ Content                          │  │ ← draft card panel
│ │ [ Relative time expression…    ] │  │
│ │ Groups                           │  │
│ │ [ Grammar ✕ ] [+ Add group]     │  │
│ │ 💡 [Intermediate] [Time]         │  │
│ │ Examples  [ + Add ]              │  │
│ │ [ 三時間後に… ✕ ]               │  │
│ │ ⚠ Possible duplicate — [Dismiss] │  │
│ └──────────────────────────────────┘  │
│  + Add another card                   │
│ ╔════════════════════════════════════╗ │
│ ║ Sign off — Promote all (3) →      ║ │ ← sticky bottom
│ ╚════════════════════════════════════╝ │
├────────────────────────────────────────┤
│  🏠    📥    🃏     💬    ···          │
└────────────────────────────────────────┘
```

Mobile differences:
- No conversation pane; full-width context
- Sign-off bar is still sticky at the bottom of the context area, above the tab bar
- The sign-off confirmation modal renders as a full-screen bottom sheet on mobile

---

## 4. Draft Cards View

**Route**: `/[lang]/card-entry/drafts`

A standalone view showing all draft cards across all notes for the active language. Useful for bulk review or when the user wants to see all pending drafts at a glance.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉ StudyPuck                                  Chinese ▾          [ ZB ]        │
├──────────────────┬──────────────────────────────────┬────────────────────────┤
│                  │ Drafts  (8)                        │                        │
│ ○ Home           │ ────────────────────────────────   │                        │
│ ▶ Card Entry [12]│ [ 🔍 Search drafts...   ] [Grp ▾] │                        │
│ ○ Card Review    │ ─────────────────────────────────  │  Conversation          │
│ ○ Trans. Drills  │ Content / Source         Grp   Upd  │  (LLM Chat)           │
│ ○ Cards          │ [Draft] Relative time expr…  Gram 2h │                       │
│ ○ Statistics     │         Source: Saw a great…        │                        │
│                  │ ──────────────────────────────────  │                        │
│ [ + Quick Add ]  │ [Draft] Particle が vs を…   Gram 1d │                       │
│ ──────────────── │         Source: Need to review…     │                        │
│ ○ Settings       │ ──────────────────────────────────  │                        │
│                  │ [Draft] 仕方がない — resignat…  —  3d │                      │
│                  │         Source: Overheard: 仕方…    │                        │
│                  ├──────────────────────────────────┴────────────────────────┤
│                  │ / Type a command or ask anything...                         │
└──────────────────┴─────────────────────────────────────────────────────────  ┘
```

The Draft Cards view uses the same row/column layout as the Card Library (see [card-library-and-groups.md](./card-library-and-groups.md)) with the following modifications:

**Column layout:**

| Column | Proportion | Notes |
|---|---|---|
| Content / Source | ~45% | Primary content preview (1–2 lines); below it, a "Source: [note preview]" snippet in muted text |
| Groups | ~20% | Comma-separated group tags; same overflow behavior as Card Library |
| Updated | ~10% | Relative date |
| (Status) | — | "Draft" badge replaces the active status indicator; muted yellow/amber color (`#fff3cd` bg, `#e6a817` text) |

**Filter bar:**

| Control | Behavior |
|---|---|
| Search input | Live filter; searches card content and source note content |
| Group dropdown | Same multi-select behavior as Card Library |

**Row hover actions (desktop):**

| Action | Behavior |
|---|---|
| "Promote" | Promotes this single draft card to active status immediately (without full note sign-off) |
| "Edit" | Navigates to the Note Processing Workspace for the card's source note |
| "🗑" | Deletes this draft card; confirmation not required |

**Bulk select mode:**

Same hover-checkbox + bulk action bar pattern as Card Library (Decision 3 of card-library-and-groups.md). The bulk action bar includes:
- `X drafts selected`
- `Promote selected` — promotes all selected draft cards to active
- `Delete` — deletes all selected draft cards
- `✕ Deselect all`

On mobile: long-press to enter select mode; bulk action bar above tab bar.

### Mobile Layout

```
┌────────────────────────────────────────┐
│ ◉ StudyPuck                Chinese ▾   │
├────────────────────────────────────────┤
│ Drafts  (8)                            │
│ [ 🔍 Search drafts...              ]   │
│ [ All groups ▾ ]                       │
│ ──────────────────────────────────── ─ │
│ [Draft] Relative time expression        │
│   Source: Saw a great example…   2h    │
│ ──────────────────────────────────────  │
│ [Draft] Particle が vs を distinction   │
│   Source: Need to review particles… 1d  │
│ ──────────────────────────────────────  │
│ [Draft] 仕方がない — resignation        │
│   Source: Overheard: 仕方がない…   3d   │
│                                         │
├────────────────────────────────────────┤
│  🏠    📥 [12]   🃏     💬     ···     │
└────────────────────────────────────────┘
```

Mobile differences:
- Stacked row layout: badge + content on row 1, source snippet + date on row 2
- Swipe-left for row actions: "Promote", "Edit", "Delete"

### Empty State

```
┌──────────────────────────────────────────┐
│                                          │
│              📋                          │
│                                          │
│       No drafts pending                  │
│   Processed notes will appear here       │
│   while you review them                  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. AI Assistance States

AI assistance surfaces inline within draft card panels (described in Screen 3). This section summarizes the states for clarity.

### Within a Field's Suggestion Area

| State | Visual |
|---|---|
| **Loading** (AI in-flight for this field) | A subtle shimmer/skeleton row below the field — 1–2 skeleton lines pulsing |
| **Results available** | 2–5 suggestion chips/rows, each with a one-click accept action and a `✕` dismiss button |
| **Empty** (no suggestions) | Nothing shown — the suggestion area collapses to zero height |
| **Dismissed all** | Nothing shown — the area collapses |

### Suggestion Chip Interactions (Decision 13)

| Interaction | Behavior |
|---|---|
| Single click on chip | Adds the suggestion to the field immediately; chip disappears |
| `✕` on chip | Dismisses the suggestion; it does not return for this card |
| Click on the chip text (not the `✕`) | Opens the chip text in an inline edit field; "Accept edited" button saves the modified version to the card field; "Cancel" dismisses |

### Group Suggestions Specifically

The AI suggests the top 3–5 most relevant groups for the draft card. These appear as chips below the group picker:

```
Groups
┌────────────────────────────────────────┐
│ [Grammar ✕]  [+ Add group]             │
└────────────────────────────────────────┘
💡 AI suggests:
  [Intermediate]  ✕    [Time expressions]  ✕    [Patterns]  ✕
```

Accepted group suggestions are subject to the same inline group creation flow if the group does not yet exist (see Section 6).

---

## 6. Inline Group Creation

The inline group creation pattern (`+ Create "[typed text]"` at the bottom of the group picker dropdown) is fully specified in:

> **[card-library-and-groups.md — Section 5: Inline Group Creation](./card-library-and-groups.md)**

This pattern applies identically in the Card Entry processing workspace. Reference that document for the dropdown wireframe, selection behavior, error handling, and keyboard navigation.

---

## Wireframes

Detailed wireframes for this storyboard are maintained in:

> **[card-entry.excalidraw](./card-entry.excalidraw)**

The Excalidraw file contains frame-by-frame wireframes for:
- Inbox — Desktop
- Inbox — Mobile
- Quick-Add Note Drawer
- Processing Workspace — AI loading state
- Processing Workspace — Draft cards state
- Sign-off confirmation dialog
- Draft Cards View
- Empty Inbox state

---

## Accessibility Notes

- All note rows are focusable; Enter opens the processing workspace; row actions are keyboard-accessible via Tab within a focused row
- The processing workspace sticky note header does not trap focus — the user can Tab past it into the draft card panels
- Draft card panels use semantic fieldset/legend structure so each card is announced as a discrete group to screen readers
- Auto-save state indicator ("Saving…" / "Saved ✓") uses `aria-live="polite"` — same pattern as Card Library
- Duplicate warning banners use `role="alert"` so they are announced when they appear
- The sign-off confirmation dialog uses `role="alertdialog"` with focus trapped inside; Escape closes the dialog (equivalent to "Go back")
- AI suggestion chips have accessible labels: `aria-label="Add suggestion: [text]"` for accept, `aria-label="Dismiss suggestion: [text]"` for dismiss
- The AI loading banner uses `aria-live="polite"` to announce when cards become available
- Count badges on nav items and in headings use `aria-label` to announce the count meaningfully (e.g., `aria-label="12 unprocessed notes"`)
- Swipe-left row actions (mobile) have an accessible alternative: a "…" overflow button that opens an action sheet
- Sign-off button `aria-label` includes the card count: "Sign off and promote 3 cards to active"
- Touch targets: all interactive elements meet 44×44px minimum
- The "Draft" badge uses both color and text to communicate status — not color alone

---

## References

- [information-architecture.md](../information-architecture.md) — screen inventory, URL structure, language context
- [global-navigation.md](./global-navigation.md) — sidebar, top bar, bottom tab bar, FAB, Feedly drawer motif
- [llm-command-interface.md](./llm-command-interface.md) — two-pane layout, command bar, conversation pane
- [card-library-and-groups.md](./card-library-and-groups.md) — Card Library row format (Draft Cards view), inline group creation, auto-save pattern
- [card-entry.md requirements](../../requirements/functionality/card-entry.md) — full feature requirements
- [Wireframes: card-entry.excalidraw](./card-entry.excalidraw)
