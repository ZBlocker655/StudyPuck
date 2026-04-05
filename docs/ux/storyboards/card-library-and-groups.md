# Card Library and Group Management Storyboard

> **Status**: Authoritative  
> **Depends on**: [card-library-and-groups.md requirements](../../requirements/functionality/card-library-and-groups.md), [information-architecture.md](../information-architecture.md), [global-navigation.md](./global-navigation.md)

This document specifies every screen and interaction in the Card Library and Group Management feature — its layouts, interactive states, drawer behaviors, and edge cases — across desktop and mobile breakpoints.

---

## Design Decisions

The following decisions were made during the UX design process. Each is captured here as the authoritative record of intent.

| # | Decision | Rationale |
|---|---|---|
| 1 | **Card Detail editing is always-editable inline with auto-save on blur** — no Save/Cancel buttons. A subtle "Saving…" / "Saved ✓" indicator appears in the drawer header. | Removes friction from the editing flow. Users should never wonder whether their edit was persisted. The indicator provides just enough feedback without demanding explicit action. |
| 2 | **Search is a live filter** — results update on every keystroke, no submit. | Instant feedback keeps the user in a scanning mindset. A submit step creates a pause that breaks the flow of exploration. |
| 3 | **Bulk select on desktop: checkboxes appear on hover**; once any checkbox is checked, a bulk action bar slides in at the top of the card list. **On mobile: long-press a row** to enter select mode; checkboxes appear on all rows; a bulk action bar appears above the tab bar. | Desktop users have hover precision; a persistent checkbox column would clutter the layout unnecessarily. Mobile has no hover, so long-press is the established pattern for initiating multi-select without ambiguity. |
| 4 | **"New Group" opens a Feedly drawer** (right-side slide-in), not a modal. | Consistent with the Feedly drawer motif used throughout the app. Drawers do not block the background page the way modals do, preserving spatial context. |
| 5 | **"Add Cards to Group" opens a search-and-add drawer** — shows only cards NOT already in the group, with live search and checkboxes, and an "Add X cards" CTA at the bottom. | Scoping the list to non-members eliminates ambiguity. The live search addresses large libraries. The CTA communicates count before committing. |
| 6 | **Inline group creation in dropdowns**: typing a new group name surfaces a `+ Create "[typed text]"` option at the bottom of the dropdown list. Selecting it immediately creates the group and adds it to the card. | Zero interruption — the user stays in the card editing drawer with no context switch. Only a name is required; description can be added later from the Groups List. |
| 7 | **Translation Drills config lives in a settings drawer** on Group Detail, with an explicit Save button. | This is a configuration action (not content editing), so an explicit save is appropriate and expected. The small drawer keeps the action contained and dismissible. |
| 8 | **Previous/Next navigation in the Card Detail drawer is scoped to the current filtered/searched set** — not the full library. | Navigating "next" should respect the user's intent. If they filtered to a group, they want to page through that group. Resetting to the full set would be disorienting. |
| 9 | **No unsaved-changes warning** — auto-save eliminates the unsaved state entirely. | There is nothing to warn about. |
| 10 | **Group name and description are inline-editable on click, auto-save on blur** — no separate edit form. | Consistent with Card Detail auto-save. Editing group metadata should be as frictionless as editing card content. |
| 11 | **Card status in Card Detail is a read-only "Active" badge** — no status toggle. | Draft status is ephemeral to Card Entry. Once a card is active, demoting it "back to draft" has no defined meaning and no workflow that consumes it. Exposing the toggle would be confusing. |

---

## 1. Card Library (`/[lang]/cards`)

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                  Chinese ▾       [ ZB ]        │  ← top bar
├──────────────────┬─────────────────────────────────────────────────────────┤
│                  │  Cards                                                    │
│  ○ Home          │  ─────────────────────────────────────────────────────── │
│  ○ Card Entry    │  [ 🔍 Search cards...   ] [ Group ▾ ] [ Type ▾ ]         │  ← filter bar
│  ○ Card Review   │  ─────────────────────────────────────────────────────── │
│  ○ Trans. Drills │  Prompt / Content            Meaning        Groups   Upd  │  ← column headers
│  ▶ Cards         │  ─────────────────────────────────────────────────────── │
│  ○ Statistics    │   你好                        Hello          Greetings  2d  │
│                  │  ─────────────────────────────────────────────────────── │
│  [ + ]           │  謝謝                        Thank you      Greetings  3d  │
│  ─────────────── │  ─────────────────────────────────────────────────────── │
│  ○ Settings      │  吃飯                        Eat a meal     Food, Daily 5d  │
│                  │  ─────────────────────────────────────────────────────── │
│                  │  ...                                                      │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

The Card Library fills the main content area to the right of the sidebar. The page heading "Cards" appears at the top, followed by the filter bar, then the card list. There is no pagination — the list scrolls vertically within the content area. The sidebar and top bar do not scroll.

**Column widths (approximate):**

| Column | Proportion | Notes |
|---|---|---|
| Prompt / Content | ~40% | Primary identifier; truncate with ellipsis at ~2 lines |
| Meaning | ~30% | Muted subtitle color; truncate at 1 line |
| Groups | ~20% | Comma-separated group tags; truncate with "+ N more" if overflow |
| Updated | ~10% | Relative date (e.g., "2d", "3w"); no time |

Column headers are plain text labels — they are **not** sortable in v1. Default sort is last modified descending; this is never surfaced to the user as a UI option.

### Mobile Layout

```
┌───────────────────────────────────┐
│  ◉ StudyPuck          Chinese ▾   │  ← top bar
├───────────────────────────────────┤
│  Cards                            │
│  ─────────────────────────────── │
│  [ 🔍 Search cards...           ] │
│  [ Group ▾ ]    [ Type ▾ ]        │
│  ─────────────────────────────── │
│  你好                             │
│  Hello  ·  Greetings         2d   │
│  ─────────────────────────────── │
│  謝謝                             │
│  Thank you  ·  Greetings     3d   │
│  ─────────────────────────────── │
│  吃飯                             │
│  Eat a meal  ·  Food, Daily  5d   │
│  ─────────────────────────────── │
│                                   │
├───────────────────────────────────┤
│   🏠     📥     🃏     💬     ···  │  ← bottom tab bar
└───────────────────────────────────┘
```

On mobile, each card row stacks vertically: the **prompt** (primary, full weight) on line 1, then **meaning · groups · relative date** on line 2 in a muted, smaller style. The search bar spans full width; the two filter dropdowns (`Group ▾` and `Type ▾`) sit side-by-side on the next line, each taking roughly half the width.

The mobile card list does **not** show column headers.

### Filter Bar

The filter bar contains three controls rendered in a single horizontal row (desktop) or two rows (mobile: search full-width on row 1, dropdowns side-by-side on row 2).

| Control | Behavior |
|---|---|
| **Search input** `🔍 Search cards...` | Live filter on every keystroke. Searches across: Prompt/Content, Meaning, Example Sentences, and Mnemonics. Minimum 1 character to trigger. Clearing the input restores the full list. |
| **Group dropdown** `Group ▾` | Multi-select. Shows all groups for the active language, sorted alphabetically. Selecting a group filters to cards in that group. Multiple selected groups show cards that belong to **any** of them (OR logic). An "All Groups" option at the top clears all group selections. |
| **Card Type dropdown** `Type ▾` | Single-select. Options: All Types (default), Vocabulary, Grammar, Phrase, Character (options may evolve with requirements). Selecting a type filters to cards of that type only. |

All three filters compose — a card must match all active filters simultaneously (AND logic across filter types, OR within multi-select group filter).

Active filters are indicated visually: the dropdown button label changes from `Group ▾` to `Group: Greetings ▾` and its border or background receives a subtle active treatment. This makes it clear at a glance that a filter is applied even if the user has scrolled away from the filter bar.

Clearing a filter: clicking the active dropdown and deselecting all values returns it to its default state.

### Card Row

**Default state (no hover):** Four data columns rendered as described above. No checkboxes visible.

**Hover state (desktop only):** A checkbox appears on the far left of the row, using the same height as the row. The row background receives a subtle highlight. The cursor becomes a pointer.

**Click behavior:** Clicking anywhere on a card row (except the checkbox) opens the Card Detail drawer for that card. The row is treated as a single large tap/click target.

**Keyboard behavior:** Rows are focusable; pressing Enter while a row is focused opens the Card Detail drawer.

**Truncation rules:**
- Prompt/Content: max 2 lines, overflow ellipsis
- Meaning: max 1 line, overflow ellipsis
- Groups: inline tags, truncate with `+N more` label if more than 2–3 groups overflow the column width
- Updated: never truncated (always short relative date)

### Bulk Select Mode

#### Desktop

1. User hovers over a card row — a checkbox appears on the row's left side.
2. User clicks the checkbox to check it.
3. A **bulk action bar** slides in at the top of the card list (just below the filter bar, above the column headers), pushing the column headers and list downward.
4. The bulk action bar remains visible as long as at least one card is selected. It contains:
   - `X cards selected` count label
   - `Delete` button
   - `Assign to Group` button (opens group picker)
   - `Send to Translation Drills` button
   - `✕ Deselect all` link on the far right
5. Hovering any other row continues to show checkboxes. The user can check additional rows by clicking their checkboxes.
6. Checking the column header checkbox (if shown) selects all cards currently visible (respects active filters).
7. Unchecking all selected rows causes the bulk action bar to slide out.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [ 3 cards selected ]  [ Delete ]  [ Assign to Group ]  [ → Trans. Drills ] │  ← bulk action bar (slides in)
│  Deselect all ✕                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ☑  你好                Hello           Greetings      2d                    │
│  ☑  謝謝                Thank you       Greetings      3d                    │
│  ☑  吃飯                Eat a meal      Food, Daily    5d                    │
│  □  好的                Okay / Alright  Daily          1w                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile

1. User **long-presses** a card row (≥ 500ms).
2. The device provides haptic feedback (if available).
3. Select mode activates: checkboxes appear on all rows simultaneously. The long-pressed card is pre-checked.
4. A **bulk action bar** appears at the bottom of the screen, sitting above the tab bar.
5. The user taps rows to add/remove them from the selection. The checkbox state toggles on each tap.
6. The bulk action bar shows:
   - `X selected` count
   - `Delete` icon/button
   - `Assign to Group` icon/button
   - `→ Drills` icon/button
7. Tapping `✕ Cancel` or pressing the hardware back button exits select mode without taking any action.

The bottom bulk action bar on mobile must not overlap the bottom tab bar — it sits in a strip above it, pushing content upward if needed.

### Empty State

**No cards exist yet (fresh language):**

```
┌────────────────────────────────────────────┐
│                                            │
│           📭                               │
│                                            │
│      No cards yet                          │
│      Start by adding your first card       │
│      in Card Entry.                        │
│                                            │
│      [ Go to Card Entry ]                  │
│                                            │
└────────────────────────────────────────────┘
```

- Message: *"No cards yet. Start by adding your first card in Card Entry."*
- CTA: `Go to Card Entry` — navigates to `/[lang]/card-entry`

**No results match current filters:**

```
│      No cards match your filters           │
│      Try adjusting your search or          │
│      clearing the active filters.          │
│                                            │
│      [ Clear Filters ]                     │
```

- Message: *"No cards match your filters. Try adjusting your search or clearing the active filters."*
- CTA: `Clear Filters` — resets all filter controls to their defaults

---

## 2. Card Detail / Edit Drawer

The Card Detail drawer is a **shared component** accessible from the Card Library, Group Detail, Card Review Session, and Translation Drills Context Panel. This section specifies its behavior when opened from the Card Library and Group Detail; other contexts may add or restrict fields as specified in their own storyboard documents.

### Layout

The drawer slides in from the right edge of the screen, overlaying the card list. It does not push or resize the card list; instead it lays over it with a semi-transparent backdrop. Clicking outside the drawer (on the backdrop) dismisses it without saving (all edits are already saved by auto-save — there is nothing to lose).

```
┌──────────────────┬─────────────────────────────────────────────────────────┐
│                  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  ○ Home          │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  ○ Card Entry    │░░░░░░░░░░░░░░░┌──────────────────────────────────────┐░│
│  ○ Card Review   │░░░░░░░░░░░░░░░│  ← →  Card 4 of 12      Saved ✓  ✕  │░│
│  ○ Trans. Drills │░░░░░░░░░░░░░░░│  ─────────────────────────────────── │░│
│  ▶ Cards         │░░░░░░░░░░░░░░░│  [Active]                            │░│
│  ○ Statistics    │░░░░░░░░░░░░░░░│                                      │░│
│                  │░░░░░░░░░░░░░░░│  Prompt / Content                    │░│
│  [ + ]           │░░░░░░░░░░░░░░░│  ┌───────────────────────────────┐  │░│
│  ─────────────── │░░░░░░░░░░░░░░░│  │  你好                         │  │░│
│  ○ Settings      │░░░░░░░░░░░░░░░│  └───────────────────────────────┘  │░│
│                  │░░░░░░░░░░░░░░░│                                      │░│
│                  │░░░░░░░░░░░░░░░│  Meaning                             │░│
│                  │░░░░░░░░░░░░░░░│  ┌───────────────────────────────┐  │░│
│                  │░░░░░░░░░░░░░░░│  │  Hello / Hi                   │  │░│
│                  │░░░░░░░░░░░░░░░│  └───────────────────────────────┘  │░│
│                  │░░░░░░░░░░░░░░░│                                      │░│
│                  │░░░░░░░░░░░░░░░│  Groups                              │░│
│                  │░░░░░░░░░░░░░░░│  ┌───────────────────────────────┐  │░│
│                  │░░░░░░░░░░░░░░░│  │ [Greetings ✕]  [+ Add group] │  │░│
│                  │░░░░░░░░░░░░░░░│  └───────────────────────────────┘  │░│
│                  │░░░░░░░░░░░░░░░│                                      │░│
│                  │░░░░░░░░░░░░░░░│  Examples        [ + Add Example ]   │░│
│                  │░░░░░░░░░░░░░░░│  ┌───────────────────────────────┐  │░│
│                  │░░░░░░░░░░░░░░░│  │ 1. 你好吗?  ✕               │  │░│
│                  │░░░░░░░░░░░░░░░│  │ 2. [type example...]         │  │░│
│                  │░░░░░░░░░░░░░░░│  └───────────────────────────────┘  │░│
│                  │░░░░░░░░░░░░░░░│                                      │░│
│                  │░░░░░░░░░░░░░░░│  [ 🗑 Delete card ]                  │░│
│                  │░░░░░░░░░░░░░░░└──────────────────────────────────────┘░│
│                  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────┴─────────────────────────────────────────────────────────┘
```

**Drawer dimensions (desktop):** ~480px wide, full viewport height, fixed position. Scrolls internally if content exceeds viewport height.

**Drawer header (sticky at top):** Contains the Previous/Next navigation arrows, the card position indicator, the save state indicator, and the close button (`✕`). This header does not scroll away.

### Auto-Save Behavior

Fields save automatically when the user moves focus away from them (blur). There are no Save or Cancel buttons.

The **save state indicator** in the drawer header cycles through three states:

| State | Display | Trigger |
|---|---|---|
| Idle | *(no indicator shown)* | No edits made since last save |
| Saving | `Saving…` (muted, animated) | User has blurred a field; save request in flight |
| Saved | `Saved ✓` (muted green) | Save request completed successfully; fades out after ~2s |

If a save request fails (network error, server error), the indicator changes to `⚠ Save failed` in a warning color. The field retains its edited value. The user can retry by re-focusing and blurring the field again, or by simply navigating away (which re-triggers the save).

**Optimistic behavior:** The UI does not roll back field values on save failure. The value the user typed is preserved in the field; only the indicator communicates the error.

### Fields

#### Prompt / Content

- **Visual:** A multi-line text area. Single border, no label crowding.
- **Placeholder:** `Prompt or content…`
- **Behavior:** Always editable. Auto-resizes vertically as content grows (no fixed height). Saves on blur.
- **No character limit** displayed in v1.

#### Meaning

- **Visual:** A multi-line text area.
- **Placeholder:** `Meaning…`
- **Behavior:** Always editable. Auto-resizes. Saves on blur.

#### Groups (Multi-Select with Inline Creation)

- **Visual:** A token input field — selected groups appear as removable pills (e.g., `Greetings ✕`). An inline `+ Add group` trigger opens the group picker dropdown below the field.
- **Dropdown behavior:** On click/focus, a dropdown list opens showing all groups for the active language, sorted alphabetically. Already-assigned groups appear checked at the top (and can be unchecked to remove). Unassigned groups are listed below.
- **Live search within dropdown:** Typing in the field filters the dropdown list in real time.
- **Inline group creation:** If the typed text does not match any existing group, a `+ Create "[typed text]"` option appears as the last item in the dropdown. Selecting it immediately creates the group (name only; description is empty by default) and adds it to this card. The new group pill appears in the field.
- **Save behavior:** Each addition or removal of a group tag saves immediately (not on drawer blur — the change is atomic and discrete).
- **Keyboard:** Arrow keys navigate the dropdown; Enter selects; Escape closes the dropdown.

#### Example Sentences

- **Visual:** A numbered, ordered list of text inputs. Each item has a `✕` remove button on the right. A `+ Add Example` button appears below the list (or inline after the last item).
- **Placeholder for empty item:** `Type an example sentence…`
- **Behavior:** Items save on blur. Order is preserved (drag-to-reorder is deferred to a future iteration). Removing an item is immediate (no confirmation); the list re-numbers.
- **Empty state:** If no examples exist, only the `+ Add Example` button is shown.

#### Mnemonics

- **Visual:** Same pattern as Example Sentences but without ordered numbering. Each mnemonic is a text area (multi-line), not a single-line input.
- **Placeholder:** `Type a mnemonic…`
- **Behavior:** Add/remove, saves on blur. No ordering.
- **Empty state:** `+ Add Mnemonic` button.

#### LLM Instructions

- **Visual:** A multi-line text area, collapsed by default behind a disclosure toggle (`▸ LLM Instructions`). Clicking the toggle expands the field.
- **Placeholder:** `Custom instructions for the LLM when this card is in context…`
- **Behavior:** Saves on blur. The expanded/collapsed state persists only for the current drawer session (not persisted globally).
- **Rationale for disclosure:** Most users will rarely set LLM instructions; hiding it by default reduces cognitive load without removing the capability.

### Previous / Next Navigation

**Arrows in the drawer header:** `←` (previous) and `→` (next), flanking the position indicator `Card 4 of 12`.

- Navigation is scoped to the **current filtered/searched set** — the same set visible in the card list behind the drawer. If no filters are active, the full library is the set.
- "Card N of M" reflects the position within the filtered set, not the full library.
- The `←` arrow is disabled (visually muted, not interactive) on the first card in the set.
- The `→` arrow is disabled on the last card in the set.
- Navigating to the previous or next card loads that card's data in the same drawer without closing and reopening the drawer. The drawer content fades or slides to indicate transition (exact animation TBD in visual design phase).
- Any unsaved edits are auto-saved before navigation (blur fires on field focus change).

### Delete Card

A `🗑 Delete card` text button (destructive styling — red or warning color) sits at the bottom of the drawer, visually separated from the content fields by spacing.

**Interaction:**

1. User clicks `🗑 Delete card`.
2. A **confirmation dialog** appears (a small modal overlay on top of the drawer):

```
┌─────────────────────────────────────┐
│  Delete "你好"?                      │
│                                     │
│  This card will be permanently      │
│  deleted and removed from all       │
│  groups. This cannot be undone.     │
│                                     │
│  [ Cancel ]        [ Delete Card ]  │
└─────────────────────────────────────┘
```

3. `Cancel` dismisses the dialog; the card is unchanged, the drawer remains open.
4. `Delete Card` (destructive button) deletes the card, closes the drawer, and removes the card from the list behind it. No toast or undo affordance in v1.

### Status Badge

A read-only **`Active`** badge appears near the top of the drawer, below the drawer header and above the first editable field. It is rendered as a small colored pill (e.g., green background, white text). It is purely informational — it carries no click target and no tooltip in v1.

### Mobile Behavior

On mobile, the Card Detail drawer occupies the **full screen** (100vw × 100vh), sliding in from the right edge as a full-screen page. This is the standard mobile drawer pattern.

**Mobile drawer header:**

```
┌───────────────────────────────────┐
│  ← →  Card 4 of 12    Saved ✓  ✕  │
└───────────────────────────────────┘
```

The header is sticky. The `✕` closes the drawer (navigates back to the card list). On Android, the hardware back button also closes the drawer.

All fields, auto-save behavior, inline group creation, and delete confirmation are identical to desktop.

The Groups multi-select dropdown opens as a **bottom sheet** on mobile rather than an inline dropdown, to ensure sufficient touch target size and visibility.

---

## 3. Groups List (`/[lang]/cards/groups`)

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                  Chinese ▾       [ ZB ]        │
├──────────────────┬─────────────────────────────────────────────────────────┤
│                  │  Groups                              [ + New Group ]      │
│  ○ Home          │  ─────────────────────────────────────────────────────── │
│  ○ Card Entry    │  Name            Description                  Cards       │
│  ○ Card Review   │  ─────────────────────────────────────────────────────── │
│  ○ Trans. Drills │  Daily           Common daily expressions       14   🗑   │
│  ▶ Cards         │  ─────────────────────────────────────────────────────── │
│  ○ Statistics    │  Food & Dining   Restaurants, ordering, food   22   🗑   │
│                  │  ─────────────────────────────────────────────────────── │
│  [ + ]           │  Greetings       Hello, goodbye, courtesies     8   🗑   │
│  ─────────────── │  ─────────────────────────────────────────────────────── │
│  ○ Settings      │  ...                                                      │
│                  │                                                           │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

The "Groups" page is a sub-section of the Cards mini-app. The page heading "Groups" appears at the top of the content area with a `+ New Group` button aligned to the right of the heading.

**Column widths (approximate):**

| Column | Proportion | Notes |
|---|---|---|
| Name | ~25% | Full text, never truncated |
| Description | ~55% | Truncate with ellipsis at 1 line |
| Cards | ~12% | Numeric count, right-aligned in column |
| Delete | ~8% | 🗑 icon button, visible on hover (desktop) |

Default sort: alphabetical by Name (A → Z). No user-controlled sort in v1.

### Mobile Layout

```
┌───────────────────────────────────┐
│  ◉ StudyPuck          Chinese ▾   │
├───────────────────────────────────┤
│  Groups             [ + New ]     │
│  ─────────────────────────────── │
│  Daily                     14    │
│  Common daily expressions        │
│  ─────────────────────────────── │
│  Food & Dining             22    │
│  Restaurants, ordering, food     │
│  ─────────────────────────────── │
│  Greetings                  8    │
│  Hello, goodbye, courtesies      │
│  ─────────────────────────────── │
│                                   │
├───────────────────────────────────┤
│   🏠     📥     🃏     💬     ···  │
└───────────────────────────────────┘
```

On mobile, each group row stacks: **Name + card count** on line 1, **Description** on line 2 in a muted style. The `+ New` button in the heading is abbreviated to fit. There are no column headers.

The delete action on mobile is accessible via a **swipe-left on the row**, revealing a red `Delete` button (standard iOS/Android swipe-to-delete pattern).

### Group Row

**Default state:** Name, description, card count rendered as described. No delete icon visible.

**Hover state (desktop only):** Row background highlights; `🗑` delete icon becomes visible on the right side.

**Click behavior:** Clicking anywhere on the row (except the delete icon) navigates to the Group Detail page at `/[lang]/cards/groups/:id`.

### Empty State

**No groups exist yet:**

```
│           📂                               │
│                                            │
│      No groups yet                         │
│      Groups let you organize your          │
│      cards by topic, category, or          │
│      any system that works for you.        │
│                                            │
│      [ + Create your first group ]         │
```

- Message: *"No groups yet. Groups let you organize your cards by topic, category, or any system that works for you."*
- CTA: `+ Create your first group` — opens the New Group drawer (same as the top-right button)

### New Group Drawer

Triggered by the `+ New Group` button (or `+ Create your first group` CTA in empty state). Opens as a Feedly drawer from the right edge, overlaying the Groups list.

```
┌──────────────────────────────────────────┐
│  New Group                            ✕  │  ← sticky header
│  ──────────────────────────────────────  │
│                                          │
│  Group name *                            │
│  ┌──────────────────────────────────┐   │
│  │  e.g. "Daily Conversations"      │   │
│  └──────────────────────────────────┘   │
│                                          │
│  Description (optional)                  │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [ Create Group ]                        │
│                                          │
└──────────────────────────────────────────┘
```

**Fields:**

| Field | Required | Notes |
|---|---|---|
| Group name | ✅ Yes | Plain text input. Max visible length ~60 chars. Validation: non-empty, no leading/trailing whitespace only. |
| Description | ❌ No | Multi-line text area. Placeholder: `Optional description…` |

**`Create Group` button state:**
- Disabled (grayed out, not interactive) when the Name field is empty.
- Enabled as soon as any non-whitespace character is entered in Name.

**On submit:**
1. Group is created immediately.
2. Drawer closes.
3. The new group appears in the Groups list (inserted in correct alphabetical position).
4. No success toast — the appearance of the row is the confirmation.

**Validation error (name already exists):** An inline error appears below the Name field: *"A group with this name already exists."* The drawer remains open.

**Dismissal:** Clicking outside the drawer (backdrop), clicking `✕`, or pressing Escape closes the drawer. No confirmation needed — no data has been persisted yet. If the user typed a name but did not submit, it is discarded silently.

### Delete Group

The delete icon (`🗑`) appears on hover (desktop) or via swipe-left (mobile).

**If the group has zero cards:**

A brief confirmation dialog:

```
┌─────────────────────────────────────┐
│  Delete "Greetings"?                │
│                                     │
│  Are you sure? This cannot be       │
│  undone.                            │
│                                     │
│  [ Cancel ]        [ Delete Group ] │
└─────────────────────────────────────┘
```

**If the group has one or more cards:**

A confirmation dialog that explicitly communicates the dissociation behavior:

```
┌─────────────────────────────────────┐
│  Delete "Greetings"?                │
│                                     │
│  This group has 8 cards. Deleting   │
│  the group will remove the group    │
│  tag from those cards, but the      │
│  cards themselves will not be       │
│  deleted.                           │
│                                     │
│  [ Cancel ]        [ Delete Group ] │
└─────────────────────────────────────┘
```

In both cases, `Delete Group` is a destructive button (red/warning color). `Cancel` dismisses without action.

---

## 4. Group Detail (`/[lang]/cards/groups/:id`)

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                  Chinese ▾       [ ZB ]        │
├──────────────────┬─────────────────────────────────────────────────────────┤
│                  │  ← Back to Groups                                         │
│  ○ Home          │  ─────────────────────────────────────────────────────── │
│  ○ Card Entry    │  Greetings                   [ ⚙ Trans. Drills ]  [ 🗑 ]  │  ← group header
│  ○ Card Review   │  Hello, goodbye, and courtesies                           │  ← description
│  ○ Trans. Drills │  8 cards                                                  │  ← card count
│  ▶ Cards         │  ─────────────────────────────────────────────────────── │
│  ○ Statistics    │  [ 🔍 Search cards...   ] [ Type ▾ ]  [ + Add Cards ]    │  ← filter bar
│                  │  ─────────────────────────────────────────────────────── │
│  [ + ]           │  Prompt / Content            Meaning            Updated   │
│  ─────────────── │  ─────────────────────────────────────────────────────── │
│  ○ Settings      │  你好                        Hello / Hi         2d        │
│                  │  ─────────────────────────────────────────────────────── │
│                  │  謝謝                        Thank you           3d        │
│                  │  ─────────────────────────────────────────────────────── │
│                  │  ...                                                       │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

The Group Detail page is a full-screen content page (not a drawer). It contains:
1. A `← Back to Groups` breadcrumb link at the top
2. The **group header** — editable name, editable description, card count, action buttons
3. The **filter bar** — same search + type filter as Card Library; the Group filter dropdown is omitted (you are already scoped to this group)
4. The **card list** — identical column structure to Card Library, but scoped to this group

### Mobile Layout

```
┌───────────────────────────────────┐
│  ◉ StudyPuck          Chinese ▾   │
├───────────────────────────────────┤
│  ← Back to Groups                 │
│  Greetings               [ ⚙ ]   │
│  Hello, goodbye, and courtesies   │
│  8 cards                          │
│  ─────────────────────────────── │
│  [ 🔍 Search cards...           ] │
│  [ Type ▾ ]      [ + Add Cards ]  │
│  ─────────────────────────────── │
│  你好                             │
│  Hello / Hi                  2d   │
│  ─────────────────────────────── │
│  謝謝                             │
│  Thank you                   3d   │
│  ─────────────────────────────── │
│                                   │
├───────────────────────────────────┤
│   🏠     📥     🃏     💬     ···  │
└───────────────────────────────────┘
```

On mobile, the delete button (`🗑`) is hidden from the group header to conserve space. It is accessible via a `⋮` overflow menu or via the `⚙` Translation Drills button area (TBD in visual design phase). The `⚙` icon opens the Translation Drills Settings drawer.

### Group Header (Inline Editing)

The group **name** and **description** are inline-editable on click.

**Name:**
- Default display: Plain heading text (large, bold).
- On click: The heading transforms into a text input in-place. The text is pre-selected for immediate overwriting.
- On blur: Auto-saves. The input transforms back to heading display.
- Validation: Name must not be empty. If the user clears the name and blurs, the previous name is restored and a brief inline error appears: *"Group name cannot be empty."*
- Duplicate name: If the user types a name that already exists in another group and blurs, the change is rejected and the inline error: *"A group with this name already exists."* appears. The previous name is restored.

**Description:**
- Default display: Plain body text (muted color). If no description exists, a muted placeholder *"Add a description…"* is shown.
- On click: Transforms into a multi-line text input.
- On blur: Auto-saves. Empty description is valid — the placeholder re-appears.

**Card count:** Always read-only. Updates in real time as cards are added or removed.

**Action buttons in group header:**

| Button | Behavior |
|---|---|
| `⚙ Configure for Translation Drills` | Opens Translation Drills Settings drawer |
| `🗑` Delete | Opens the delete group confirmation dialog (same logic as Groups List) |

On desktop both buttons are visible. On mobile, the delete button is accessible via the overflow menu or a dedicated action further down the page — exact placement TBD in visual design phase.

### Card List

The card list on Group Detail is **identical in structure and behavior to the Card Library card list**, with the following differences:

1. **Group column is omitted** — all cards are in this group; showing the column would be redundant.
2. **Scoped filter set** — the search and type filter apply only to cards in this group.
3. **Additional bulk action** — "Remove from this group" (see below).
4. **Previous/Next navigation in Card Detail drawer** is scoped to this group's filtered set.

Clicking a row opens the same Card Detail drawer. All hover/select/bulk behaviors apply identically to those specified in Section 1.

### Add Cards to Group Drawer

Triggered by the `+ Add Cards` button in the filter bar area. Opens as a Feedly drawer from the right.

```
┌──────────────────────────────────────────────────────┐
│  Add cards to Greetings                          ✕   │  ← sticky header
│  ──────────────────────────────────────────────────  │
│  [ 🔍 Search cards...                             ]  │
│  ──────────────────────────────────────────────────  │
│  □  你好吗      Are you okay?        Daily        │
│  □  再见         Goodbye / See you   —            │
│  □  不客气       You're welcome      Politeness   │
│  □  对不起       Sorry / Excuse me   Politeness   │
│  ...                                                  │
│  ──────────────────────────────────────────────────  │
│  [ Add 2 cards ]                                      │  ← sticky footer CTA
└──────────────────────────────────────────────────────┘
```

**Behavior:**

- The drawer header shows: `Add cards to [Group Name]`
- The list shows **only cards not already in this group** for the active language. Cards already in this group are excluded entirely.
- A **live search input** at the top filters the list in real time (searches Prompt/Content and Meaning).
- Each row has a checkbox on the left. Rows are tappable; tapping toggles the checkbox.
- The **`Add X cards`** CTA button in the sticky footer is:
  - Disabled (text: `Add cards`) when no cards are checked.
  - Enabled with a count label (`Add 2 cards`, `Add 5 cards`) as cards are checked.
- Clicking `Add X cards` adds all checked cards to the group, closes the drawer, and immediately updates the card list and card count in the group header.
- Clicking `✕` or outside the drawer closes without adding any cards.

**Empty state (all cards are already in this group):**

```
│     All your cards are already    │
│     in this group.                │
│                                   │
│     [ ✕ Close ]                   │
```

**Empty state (no cards exist at all in the library):**

```
│     No cards to add.              │
│     Create cards in Card Entry    │
│     first.                        │
│                                   │
│     [ Go to Card Entry ]          │
```

### "Remove from this Group" Bulk Action

When bulk select mode is active on Group Detail, the bulk action bar includes an additional action not present in Card Library:

**Desktop bulk action bar (Group Detail):**

```
│ X cards selected │ Remove from group │ Delete │ Assign to Group │ → Drills │ Deselect all ✕ │
```

**Mobile bulk action bar (Group Detail):**

Same as Card Library bulk bar with an additional `Remove` icon/button.

**`Remove from group` behavior:** The selected cards are dissociated from this group. They are **not deleted** from the library. The cards disappear from the Group Detail list immediately. The card count in the group header updates. No confirmation dialog is required (this is a reversible dissociation — the cards can be re-added via "Add Cards to Group").

### Translation Drills Settings Drawer

Triggered by the `⚙ Configure for Translation Drills` button in the group header.

```
┌──────────────────────────────────────────────────────┐
│  Translation Drills Settings                     ✕   │  ← sticky header
│  ──────────────────────────────────────────────────  │
│                                                       │
│  Include as draw pile                                 │
│  Use cards from this group as a source for     [  ●] │
│  Translation Drills sessions.                         │
│                                                       │
│  Pile size limit                                      │
│  Max cards drawn per session (blank = no limit)       │
│  ┌────────────────────────────────────────────────┐  │
│  │  20                                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  [ Save ]                                             │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| Include as draw pile | Toggle | When on, this group's cards are eligible to be drawn in Translation Drills sessions. Default: off. |
| Pile size limit | Number input | Optional. Integer ≥ 1. Blank means no limit. Shown only when "Include as draw pile" is on. |

**`Save` button:**
- Always visible and enabled once the drawer is open (this is a settings action; explicit save is intentional and expected).
- On save: settings are persisted, drawer closes.
- No auto-save — changes do not take effect until Save is clicked.

**Unsaved state:** If the user clicks `✕` or outside the drawer with unsaved changes, the changes are discarded silently (no warning). Since this is a non-destructive configuration, silent discard is acceptable.

**Mobile:** Same drawer rendered full-screen, same fields and behavior.

### Delete Group

Same dialog and logic as specified in the Groups List section (Section 3). The dialog is triggered from the `🗑` button in the group header or the mobile overflow menu.

After deletion:
1. The dialog closes.
2. The user is navigated back to the Groups List at `/[lang]/cards/groups`.
3. The deleted group no longer appears in the list.

---

## 5. Inline Group Creation

This pattern surfaces in any multi-select group field across the application — including the Groups field in the Card Detail drawer and the group multi-select in Card Entry note processing.

### Dropdown Behavior

```
┌──────────────────────────────────────────┐
│  [Greetings ✕]                           │  ← token input with existing tags
│  ┌──────────────────────────────────┐   │
│  │  daily con|                      │   │  ← user is typing
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Daily Conversations             │   │  ← matching existing group
│  │  Daily Phrases                   │   │  ← matching existing group
│  │  ─────────────────────────────── │   │
│  │  + Create "daily con"            │   │  ← inline creation option
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

**Trigger conditions:**
- The `+ Create "[typed text]"` item appears when the typed text does not exactly match any existing group name (case-insensitive comparison).
- It always appears as the **last item** in the dropdown, visually separated from the matching items by a thin divider.
- It updates in real time as the user types.

**Selection behavior:**
1. User selects `+ Create "[typed text]"` (click or keyboard Enter).
2. The group is created immediately in the backend with the typed name and an empty description.
3. The new group is added to the current card as a tag (pill appears in the token field).
4. The dropdown closes.
5. The auto-save fires (the groups field saves the association).

**No confirmation step.** The creation is immediate and optimistic.

**Error handling:** If group creation fails (e.g., duplicate name race condition), the new pill is removed from the token field and a brief inline error appears: *"Could not create group. A group with this name may already exist."*

**Keyboard navigation within dropdown:**

| Key | Action |
|---|---|
| `↑` / `↓` | Move selection up/down through dropdown items |
| `Enter` | Select highlighted item (existing group or create new) |
| `Escape` | Close dropdown without selecting |
| `Tab` | Close dropdown, move focus to next field |
| `Backspace` (when input is empty) | Removes the last token (last assigned group) |

---

## Wireframes

Detailed wireframes for this storyboard are maintained in:

> **[card-library-and-groups.excalidraw](./card-library-and-groups.excalidraw)**

The Excalidraw file contains high-fidelity frame-by-frame wireframes for:
- Card Library — desktop and mobile
- Card Detail drawer — desktop open state, mobile full-screen state
- Bulk select mode — desktop and mobile
- Groups List — desktop and mobile
- New Group drawer
- Group Detail — desktop and mobile
- Add Cards to Group drawer
- Translation Drills Settings drawer
- Inline group creation dropdown

---

## Accessibility Notes

- All interactive rows are focusable and triggerable via keyboard (Tab/Enter)
- Drawers trap focus when open; Escape closes all drawers
- Bulk action bar announces selection count to screen readers via `aria-live="polite"`
- Long-press (mobile select mode) also has an accessible alternative: a triple-tap or dedicated "Select" accessibility action
- All form fields have visible labels (not placeholder-only)
- Confirmation dialogs use `role="alertdialog"` with focus trapped inside
- Inline-editable headings (Group name) use `role="textbox"` with `aria-label="Group name"` when in edit mode
- Disabled states on buttons communicate via `aria-disabled="true"` and visual treatment together (not color alone)
- Touch targets for all interactive elements: minimum 44×44px
- Save state indicator (`Saving…` / `Saved ✓`) uses `aria-live="polite"` so screen readers announce state changes without interrupting the user

---

## References

- [information-architecture.md](../information-architecture.md) — screen inventory, URL structure
- [global-navigation.md](./global-navigation.md) — sidebar, top bar, bottom tab bar, Feedly drawer motif
- [card-library-and-groups.md requirements](../../requirements/functionality/card-library-and-groups.md) — full feature requirements
- [Wireframes: card-library-and-groups.excalidraw](./card-library-and-groups.excalidraw)
