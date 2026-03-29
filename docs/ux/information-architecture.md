# Information Architecture: Screen Inventory, Sitemap, and Navigation Model

## Overview

This document maps every screen in StudyPuck, how they relate to each other, and how users navigate between them. It is the foundational UX document from which all storyboards are derived.

StudyPuck is organized around **four primary mini-applications** (Card Entry, Card Review, Translation Drills, Cards) plus a Home dashboard, Statistics, and Settings. Each mini-app operates on the same shared card database but maintains its own state and SRS metadata.

---

## Design Motifs

### The Feedly Drawer

A recurring UX pattern throughout StudyPuck is the **slide-in focus drawer** (inspired by Feedly's article reader):

- Triggered by clicking an item (a note, a card, a context panel trigger)
- Slides in from the right
- Does **not** block the sidebar navigation
- A visible backdrop with **click-outside to dismiss** instantly collapses it
- Keeps the user oriented in the list/screen behind it

This motif is used for:
- **Quick-add note** (global `+` button)
- **Note processing workspace** (from Card Entry inbox)
- **Card detail / edit** (from Card Library, Card Review session)
- **Translation context panel** (from Translation Drills)

---

## Complete Screen Inventory

### Authentication / Unauthenticated

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Welcome / Sign-In | `/` | Auth-aware root route. Logged-out users see a simple welcome page with StudyPuck branding and a sign-in button. Authenticated users are shown the dashboard directly (no redirect needed). Deep-linked authenticated URLs redirect here after sign-in, then forward to the original destination. | Auth-aware |
| Auth Callback | `/auth/callback` | Handled by Auth.js/Auth0. Redirects after authentication to deep-linked destination or `/` (which then shows the dashboard). | System |
| 404 | `/404` (and any unmatched route) | Standard not-found page with a link back home. | Anyone |

### Onboarding

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| First-Run Wizard | `/onboarding` | Shown only when a user has no language configured. Step 1: pick a language from the system-supported list. On confirmation: land on `/` (dashboard). No further steps for now (tutorial planned for future). | Authenticated users with no configured language |

### Home / Dashboard

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Home / Dashboard | `/` | Default landing page. Route is auth-aware: logged-out users see the Welcome/Sign-In screen; logged-in users see their dashboard. Shows at-a-glance status counts per mini-app for the active language: inbox items waiting to process, draft cards awaiting promotion, cards due for review, translation drill session state. Counts are informational — the user decides what to do. Each count is a navigable link. | Auth-aware (single route) |

### Card Entry

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Card Entry Inbox | `/card-entry` | Chronological list of unprocessed inbox notes for the active language. Provides a button to add a new note (opens the Quick-Add drawer). Clicking a note opens the Note Processing drawer. Shows count of unprocessed vs. deferred items. | Authenticated |
| Draft Cards Review | `/card-entry/drafts` | Lists all draft cards for the active language. User can review, edit, and promote draft cards to active status individually or in bulk. Shows the originating note context for each draft. | Authenticated |
| *(Drawer)* Quick-Add Note | — (overlay) | Slide-in drawer triggered by the global `+` button in the nav. Minimal text input for capturing a rough note (word, phrase, sentence, anything). Submits to the active language's inbox. Click-outside or explicit dismiss closes it. | Authenticated |
| *(Drawer)* Note Processing Workspace | — (overlay) | Slide-in drawer opened by clicking a note in the Card Entry Inbox. Displays the original note content. Provides tools to create one or more structured cards from the note. Supports AI-assisted field population. Created cards start as draft or active per user choice. Links between note and resulting cards are maintained. Actions: process → create cards, defer, delete. | Authenticated |

### Card Review

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Card Review Home | `/card-review` | Dashboard for the Card Review mini-app. Shows recent stats (cards reviewed, streak, etc.) embedded on-screen. Group selector to choose which groups to draw from. Subset size control (e.g., "Review 10 cards" / "Review all due"). Primary CTA: "Start Reviewing". | Authenticated |
| Card Review Session | `/card-review/session` | Active review session screen. Presents one card at a time with full content (prompt, examples, mnemonics). After each card, user rates familiarity and can take actions: pin to Translation Drills context, snooze, disable. Shows session progress. Navigation: next/previous card. Exit returns to Card Review Home. | Authenticated |
| *(Drawer)* Card Detail | — (overlay) | Slide-in drawer from Card Review session for viewing/editing a card's full content. Does not interrupt session flow. | Authenticated |

### Translation Drills

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Translation Drills | `/translation-drills` | Full-width conversational interface. No setup screen — drops directly into the last active session context. Sticky area at the top shows the current translation challenge. Prominent "New Challenge" button to request the next sentence. Conversation thread below for follow-up questions and feedback. Context panel trigger (drawer) to manage active cards. Session state persists across logins. | Authenticated |
| *(Drawer)* Translation Context Panel | — (overlay) | Slide-in drawer triggered from within Translation Drills. Shows all currently active cards organized by draw-pile group. Per-card actions: snooze, dismiss (with SRS scheduling), disable. Also allows drawing additional cards from configured groups. | Authenticated |

### Cards (Library & Groups)

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Card Library | `/cards` | Browse and search all cards (active and draft) for the active language. Filter by group, status (active/draft), or free-text search. Click a card to open the Card Detail drawer for viewing or editing. | Authenticated |
| Groups List | `/cards/groups` | Lists all user-defined groups for the active language. Each group shows a card count and a summary. Click a group to go to Group Detail. | Authenticated |
| Group Detail | `/cards/groups/:id` | Shows all cards belonging to a specific group. Same card browsing capabilities as Card Library, scoped to this group. Can edit group name/description. Can add cards to this group. | Authenticated |
| *(Drawer)* Card Detail / Edit | — (overlay) | Slide-in drawer accessible from Card Library, Group Detail, and Card Review Session. Displays full card content. Allows editing card fields: prompt, status, groups, example sentences, mnemonics, LLM instructions. | Authenticated |

### Statistics

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Statistics | `/stats` | Global statistics view aggregated across all mini-apps and (optionally) all languages. Anki-style daily activity charts. Per-mini-app breakdowns (cards reviewed, sentences translated, etc.). Language selector to drill into per-language stats. Mini-apps also embed relevant statistics contextually on their own screens (e.g., Card Review Home shows Card Review-specific stats). | Authenticated |

### Settings

| Screen | URL | Purpose | Who can see it |
|--------|-----|---------|----------------|
| Settings Hub | `/settings` | Settings landing page with section links: Account, Preferences, Languages. | Authenticated |
| Account | `/settings/account` | Profile info (display name, avatar), authentication details, connected accounts. | Authenticated |
| Preferences | `/settings/preferences` | Global app preferences: default session sizes, notification preferences, display options, and other cross-language configuration. | Authenticated |
| Languages | `/settings/languages` | Manage configured languages. Add new languages from the system-supported list. View/configure per-language settings (fonts, input modes, etc. — initially minimal, expanded in future versions). | Authenticated |

---

## Navigation Model

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                    🌐 Language ▾  👤 │  ← top-right bar
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                        │
│  🏠 Home │                                                        │
│          │                                                        │
│  📥 Card │                   MAIN CONTENT AREA                   │
│    Entry │                                                        │
│          │                                                        │
│  🃏 Card │                                                        │
│  Review  │                                                        │
│          │                                                        │
│  💬 Trans│                                                        │
│    Drills│                                                        │
│          │                                                        │
│  📚 Cards│                                                        │
│          │                                                        │
│  📊 Stats│                                                        │
│          │                                                        │
│  ───     │                                                        │
│  ⚙ Sett- │                                                        │
│   ings   │                                                        │
└──────────┴──────────────────────────────────────────────────────┘
```

- **Left sidebar**: Always expanded with icon + text label. Width: narrow (LingQ-style, ~200px). Not collapsible in v1.
- **Top-right**: Language switcher (dropdown/selector) + user avatar (opens to account/sign-out).
- **Main content**: Fills remaining space.
- **Settings**: Separated visually at the bottom of the sidebar.

### Mobile Layout

```
┌────────────────────────┐
│  StudyPuck   🌐 Lang ▾ │  ← mobile top bar (app name + language switcher)
├────────────────────────┤
│                        │
│     MAIN CONTENT       │
│                        │
│                        │
├────────────────────────┤
│ 🏠  📥  🃏  💬  ···   │  ← bottom navigation bar
└────────────────────────┘
```

- **Bottom navigation bar** with 5 items:
  - Home
  - Card Entry
  - Card Review
  - Translation Drills
  - **More** (→ Cards, Stats, Settings)
- **Mobile top bar**: App name/logo + language switcher.
- The global `+` quick-add button is accessible from the bottom bar's "More" or as a floating action button on appropriate screens.

### Global `+` Quick-Add Button

- Visible in the navigation on **all authenticated screens**.
- **Desktop**: In the sidebar, below the main nav items.
- **Mobile**: Floating action button (FAB) on Card Entry and Home screens; available via "More" otherwise.
- Opens the **Quick-Add Note drawer** (Feedly motif).

---

## URL / Routing Structure

```
/                          → Auth-aware root: Welcome (logged out) OR Dashboard (logged in)
/onboarding                → First-run language setup

/card-entry                → Inbox view
/card-entry/drafts         → Draft cards review

/card-review               → Card Review dashboard
/card-review/session       → Active review session

/translation-drills        → Translation session (conversation + context)

/cards                     → Card Library (browse/search all cards)
/cards/groups              → Groups list
/cards/groups/:id          → Group detail (cards in group)

/stats                     → Global statistics

/settings                  → Settings hub
/settings/account          → Account settings
/settings/preferences      → App preferences
/settings/languages        → Language management

/404                       → Not found
```

**Deep linking**: All authenticated URLs are bookmarkable. After sign-in, users are redirected to their originally requested URL. If no URL is bookmarked, they land on `/` (the auth-aware root, which shows the dashboard when logged in).

---

## Language Switching

### Where the switcher lives

- **Desktop**: Top-right area, persistent on every screen.
- **Mobile**: Top bar, persistent on every screen.

### What happens when you switch

1. The active language context changes globally.
2. The user **stays on the same screen** — the current screen reloads/refreshes its content for the newly selected language.
   - Example: switching from Spanish to French while in Translation Drills keeps you in Translation Drills, now in the French context with French cards and conversation.
3. The language indicator in the nav updates immediately.
4. Each language retains its own persistent state (inbox, active session, card context) — returning to Spanish later picks up where you left off.

### Edge cases

- If the current screen has no content yet for the new language (e.g., empty inbox, no cards), the screen shows an empty state with a CTA to add content.
- Language-specific onboarding is not triggered when switching; only when a language is first *added* from Settings.

---

## Entry / Exit Patterns for Mini-Apps

### Entering a mini-app

| Mini-App | Entry Points |
|----------|-------------|
| Card Entry | Left nav → "Card Entry", or clicking inbox count on Home dashboard, or the global `+` button (quick-add drawer) |
| Card Review | Left nav → "Card Review", or clicking cards-due count on Home dashboard |
| Translation Drills | Left nav → "Translation Drills" |
| Cards | Left nav → "Cards" (lands on Card Library by default) |

### Exiting a mini-app

- The left nav (desktop) or bottom bar (mobile) is always visible — users navigate away from any mini-app without a special "exit" action.
- **Card Review Session**: An explicit "End Session" / close button returns to Card Review Home. Back navigation also exits the session (state is preserved).
- **Drawers** (Feedly motif): Click outside the drawer, or press Escape, to dismiss and return to the underlying screen.

### Can you switch mini-apps without going back to home?

**Yes.** The sidebar/bottom bar is always visible and accessible. A user can move directly from Card Review to Translation Drills without visiting Home.

---

## First-Run Onboarding Flow

> *A brand-new user has just logged in for the first time. Walk through every step until they reach their first working screen.*

1. **Auth0 / Auth.js** handles the authentication flow (sign-up form, email confirmation, OAuth).
2. On first successful login, the system detects no configured language → redirects to `/onboarding`.
3. **Onboarding Wizard** (single screen):
   - Brief welcome message: "Welcome to StudyPuck! Let's set up your first language."
   - A selection UI showing supported languages (e.g., Spanish, French, Mandarin, etc.).
   - User selects one language, taps/clicks "Get Started".
4. Language is saved. User redirected to `/` (dashboard).
5. **Home Dashboard** — all counters are at zero. Empty-state messages in each section guide the user toward their first action (e.g., "No inbox items — tap + to add your first word").

The wizard is intentionally minimal (v1). Tutorial/guided tours are out of scope for now but the architecture should support them as a future overlay layer.

---

## Screens Missing from Initial Requirements (Added Here)

| Screen | Rationale |
|--------|-----------|
| Card Library (`/cards`) | Requirements covered card *content and structure* but lacked a screen for browsing and searching all cards. Essential for maintenance and context. |
| Groups List + Group Detail (`/cards/groups`, `/cards/groups/:id`) | Groups are central to card organization and Translation Drills draw piles. A dedicated management surface is needed. |
| Settings Hub sections (`/settings/account`, `/settings/preferences`, `/settings/languages`) | Requirements implied settings concerns across multiple areas; consolidated into a single hub with clear sections. |

---

## Summary: Navigation Items

| Nav Item | Route | Desktop Sidebar | Mobile Bottom Bar |
|----------|-------|----------------|-------------------|
| Home | `/` | ✅ | ✅ |
| Card Entry | `/card-entry` | ✅ | ✅ |
| Card Review | `/card-review` | ✅ | ✅ |
| Translation Drills | `/translation-drills` | ✅ | ✅ |
| Cards | `/cards` | ✅ | Via "More" |
| Statistics | `/stats` | ✅ | Via "More" |
| Settings | `/settings` | ✅ (bottom) | Via "More" |
| Language Switcher | — | Top-right | Top bar |
| User Avatar | — | Top-right | Top bar |
| Global `+` Quick-Add | — | In sidebar | FAB / Via "More" |
