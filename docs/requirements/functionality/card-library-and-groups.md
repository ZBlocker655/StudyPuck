# Card Library and Group Management

## Overview

The Card Library and Group Management screens form the **reference and maintenance surface** of StudyPuck. Users reach them infrequently — primarily to find and fix a specific card, audit their collection, or manage group organization. The design should be efficient and unsurprising rather than prominent.

These screens operate on the shared card database and are scoped to the **active language** at all times. Switching languages via the global language switcher reloads the current screen in the new language context.

---

## Card Library (`/cards`)

### Purpose

Browse, search, and maintain all active cards for the current language.

### Card Scope

- Displays **active cards only** — draft and deleted cards do not appear here
- Draft cards are managed in Card Entry (`/card-entry/drafts`)
- Deleted cards use soft delete (status = `deleted`) and are excluded from all active surfaces

### Default Sort

Last modified descending (most recently edited cards appear first). No user-controlled sort in v1.

### Card Row Format

Each card is displayed as a compact row containing:

| Field | Notes |
|-------|-------|
| **Prompt / Content** | Truncated with ellipsis at a fixed character limit |
| **Meaning** | Displayed as a muted subtitle; truncated with ellipsis |
| **Group tags** | All assigned groups shown as tags; truncated if many (e.g. "Group A, Group B +3 more") |
| **Updated date** | Last modified timestamp |

Status is not shown (all displayed cards are active).

### Filters

All filters are scoped to the current language and to active cards only.

| Filter | Behavior |
|--------|----------|
| **Free-text search** | Full-text search across `content`, `meaning`, `examples`, and `mnemonics` fields |
| **Filter by group** | Shows only cards belonging to the selected group |
| **Filter by card type** | Shows only cards of the selected type (e.g. word, complex prompt) |

Vector/semantic search is out of scope for v1 (deferred to a future enhancement).

### Navigation

Clicking a card row opens the **Card Detail drawer** (Feedly slide-in motif).

### Single-Card Actions

All single-card actions are accessible from within the Card Detail drawer:

- **Edit** — modify any editable field (see Card Detail Drawer section)
- **Delete** — soft-delete the card (sets status to `deleted`; see issue #80)
- **Assign to group** — add the card to one or more groups (additive; existing group memberships are preserved)
- **Send to Translation Drills** — pins the card to the Translation Drills context, identical to the same action available in Card Review Session

### Bulk Actions

Users may select multiple cards for bulk operations:

| Action | Behavior |
|--------|----------|
| **Bulk delete** | Soft-deletes all selected cards |
| **Bulk assign to group** | Additively adds all selected cards to a chosen group |
| **Bulk send to Translation Drills** | Pins all selected cards to the Translation Drills context |

---

## Card Detail Drawer

The Card Detail drawer is a **shared component** accessible from multiple surfaces:

- Card Library (clicking a card row)
- Group Detail (clicking a card row)
- Card Review Session
- Translation Drills Context Panel

### Editable Fields

| Field | Notes |
|-------|-------|
| **Prompt / Content** | The main study prompt |
| **Meaning** | Definition or translation |
| **Groups** | Group membership (multi-select) |
| **Example sentences** | Zero or more; ordered list |
| **Mnemonics** | Zero or more personal memory aids |
| **LLM instructions** | Optional AI guidance for Translation Drills |

### Actions Available from the Drawer

- Edit any of the above fields
- Delete (soft delete)
- Assign to group (additive)
- Send to Translation Drills

### Live Update Behavior

Edits made in the Card Detail drawer are **immediately reflected** in any active Card Review session or Translation Drills session. There is no "save and reload" delay — the current session sees the updated content at once.

---

## Groups List (`/cards/groups`)

### Purpose

Browse and manage all user-defined groups for the current language.

### Default Sort

Alphabetical by group name. No user-controlled sort in v1.

### Group Row Format

| Field | Notes |
|-------|-------|
| **Group name** | Full name (groups are expected to have short names) |
| **Description** | Truncated with ellipsis at a fixed character limit |
| **Card count** | Count of active cards belonging to this group |

### Actions

| Action | Behavior |
|--------|----------|
| **Click row** | Navigates to Group Detail (`/cards/groups/:id`) |
| **Delete** | Removes the group. If the group has member cards, a confirmation modal is shown warning that cards will be dissociated from the group. Cards themselves are **never deleted** when a group is deleted (groups and cards are a many-to-many relationship). If the group is empty, no confirmation is required. |

### Creating a Group

New groups can be created:
- From the Groups list screen (explicit "New Group" action)
- Inline during Card Entry note processing (typing a new group name during card creation)

A group requires at minimum a **name**. Description is optional.

---

## Group Detail (`/cards/groups/:id`)

### Purpose

View and manage the cards belonging to a specific group, edit group metadata, and configure how the group is used in Translation Drills.

### Group Metadata (Editable)

- **Group name** — renameable from this screen (not from the Groups list)
- **Description** — optional free-text description

### Card List

The card list in Group Detail behaves **identically to the Card Library**, scoped to cards belonging to this group:

- Same row format (prompt, meaning, group tags, updated date)
- Same filters (free-text search, filter by group, filter by card type)
- Same default sort (last modified descending)
- Same single-card actions (edit, delete, assign to group, send to Translation Drills)
- Same bulk actions (bulk delete, bulk assign to group, bulk send to Translation Drills)

**Additional bulk action available only in Group Detail:**

| Action | Behavior |
|--------|----------|
| **Remove from this group** | Dissociates selected cards from this group (does not delete cards) |

### Translation Drills Configuration

Group Detail provides a contextual entry point into Translation Drills draw pile settings for this group. The configuration is owned by Translation Drills and is surfaced here for discoverability — keeping Translation Drills concerns isolated while avoiding the need for users to hunt inside Translation Drills to find group-level settings.

The specific UI affordance (button label, dialog design) is left to UX/storyboarding. The underlying data is stored in `translation_drill_draw_piles` and includes:

- **Enabled** — whether this group is active as a Translation Drills draw pile
- **Pile size limit** — maximum number of cards drawn from this group at a time

---

## Cross-Application Integration

### Sending Cards to Translation Drills

Cards can be pinned to the Translation Drills context from:
- Card Detail drawer (single card) — accessible from Card Library, Group Detail, Card Review Session, and Translation Drills Context Panel
- Card Library bulk action
- Group Detail bulk action

This is the same "pin to Translation Drills" action available in Card Review Session, providing a consistent gesture across the application.

### Opening Card Detail from Other Mini-Apps

| Surface | Integration |
|---------|-------------|
| **Card Review Session** | Card Detail drawer accessible during a session for viewing and editing |
| **Translation Drills Context Panel** | Each card in the context panel has a link to open its Card Detail drawer |

### Effect of Edits on Active Sessions

Card edits are immediately reflected in any active session. A user who edits a mnemonic or example sentence while mid-session in Card Review or Translation Drills will see the updated content without needing to restart the session.

---

## Out of Scope (v1)

- Vector/semantic search in the Card Library (deferred)
- Viewing or restoring deleted cards
- User-controlled sort order
- Group hierarchy or nesting (groups are flat)
- Navigation from a card directly to its SRS schedule in Card Review
