# Homepage & Onboarding Storyboards

> **Status**: Authoritative
> **Depends on**: [global-navigation.md](./global-navigation.md), [information-architecture.md](../information-architecture.md)

This document specifies all three states of the StudyPuck homepage entry point: the logged-out landing page, the first-login onboarding flow, and the returning-user dashboard.

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Logged-out hero | Text-only | Consistent with the book-like, scholarly aesthetic (cf. Bear Notes, WorkFlowy). No screenshot required before the product proves itself. |
| Features highlighted | 2: Spaced Repetition + AI Translation Drills | The two most distinct value props; keeps the page focused and uncluttered. |
| Logged-out CTA | Single "Sign In" button | Auth0 handles both sign-in and sign-up. One button is cleaner and sufficient. |
| Footer | Minimal: copyright + GitHub link | Keeps the page clean while covering the basics. |
| Onboarding delivery | Dedicated `/onboarding` route | A full page signals that setup is an intentional first step, not an afterthought. |
| Onboarding steps | Language selection only (1 step) | Minimum viable — the user can start working immediately after selecting a language. |
| Language selection UI | Cards / tiles | Visual and scannable. Works well with a small catalog; easy to extend as more languages are added. |
| Returning-user dashboard | Option B: Dashboard with actionable widgets | See rationale below. |

---

## Screen 1: Logged-Out Homepage (`/`)

### Philosophy

The logged-out homepage serves a visitor who has never used StudyPuck. It should feel like the cover of a well-designed book — clean, confident, and purposeful. It is **not** a long marketing page. One compelling sentence, two reasons to sign up, and a clear path in.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                           [ Sign In ]       │  ← top bar
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                                                                          │
│                           StudyPuck                                      │
│                                                                          │
│           Master vocabulary through spaced repetition                    │
│                    and AI translation practice.                          │
│                                                                          │
│                        [ Sign In → ]                                     │
│                                                                          │
│  ──────────────────────────────────────────────────────────────          │
│                                                                          │
│     ┌─────────────────────────────┐  ┌─────────────────────────────┐    │
│     │  📚 Spaced Repetition       │  │  🤖 AI Translation Drills   │    │
│     │                             │  │                             │    │
│     │  Cards reviewed at the      │  │  Conversation-style         │    │
│     │  optimal moment,            │  │  practice powered by AI,    │    │
│     │  scientifically timed.      │  │  tailored to your cards.    │    │
│     └─────────────────────────────┘  └─────────────────────────────┘    │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│  © 2026 StudyPuck   •   GitHub ↗                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 640px)

```
┌──────────────────────────────┐
│  ◉ StudyPuck    [ Sign In ]  │  ← top bar (compact sign-in button, right)
├──────────────────────────────┤
│                              │
│         StudyPuck            │
│                              │
│   Master vocabulary through  │
│   spaced repetition and AI   │
│   translation practice.      │
│                              │
│      [ Sign In → ]           │
│                              │
│  ──────────────────────────  │
│                              │
│  ┌──────────────────────┐    │
│  │  📚 Spaced           │    │
│  │  Repetition          │    │
│  │                      │    │
│  │  Cards reviewed at   │    │
│  │  the optimal moment, │    │
│  │  scientifically      │    │
│  │  timed.              │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │  🤖 AI Translation   │    │
│  │  Drills              │    │
│  │                      │    │
│  │  Conversation-style  │    │
│  │  practice powered    │    │
│  │  by AI.              │    │
│  └──────────────────────┘    │
│                              │
│  ────────────────────────    │
│  © 2026 StudyPuck  GitHub↗   │
└──────────────────────────────┘
```

### Element Specification

#### Top Bar (Logged-Out)

| Zone | Contents |
|---|---|
| Left | App logo/name (`◉ StudyPuck`) — clicking navigates to `/` (refreshes) |
| Right | "Sign In" button — primary brand color, medium prominence |

No sidebar. No language switcher. No avatar. The nav shell is intentionally absent for unauthenticated visitors; this reinforces that the app is a private tool, not a public browser.

#### Hero

| Property | Spec |
|---|---|
| Title | "StudyPuck" — large, typographic, matches the app's brand identity |
| Tagline | One sentence: "Master vocabulary through spaced repetition and AI translation practice." |
| Hero type | Text-only — no screenshots, no illustrations. The typography IS the design statement. |
| CTA | A single "Sign In →" button, centered below the tagline. Primary brand color. |
| Vertical position | Upper-center of the viewport — visible without scrolling on any screen size. |

#### Feature Cards

Two cards displayed side-by-side on desktop (stacked on mobile):

| Card | Title | Description |
|---|---|---|
| 1 | 📚 Spaced Repetition | Cards reviewed at the optimal moment, scientifically timed. |
| 2 | 🤖 AI Translation Drills | Conversation-style practice powered by AI, tailored to your cards. |

Cards use a subtle border and light background fill. No decorative imagery — text and icon only.

#### Footer

Minimal, visually quiet:
- `© 2026 StudyPuck`
- `GitHub ↗` — links to the public repository

---

## Screen 2: First-Login Onboarding (`/onboarding`)

### Trigger Condition

This screen is shown **once**: when a user authenticates for the first time and has **zero languages configured**. If the user already has at least one language, they bypass this route and land directly at `/` (the dashboard).

### Philosophy

The onboarding flow is a single intentional step: choose a language. It should feel like flipping to the first page of a new notebook — simple, clean, and focused. No marketing copy. No multi-step wizard. Just: "What are you studying?"

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                                  [ ZB ]     │  ← simplified top bar
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                                                                          │
│                       Welcome to StudyPuck                               │
│                   Choose a language to get started                       │
│                                                                          │
│                                                                          │
│        ┌──────────────────────┐       ┌──────────────────────┐          │
│        │                      │       │                      │          │
│        │          🇨🇳          │       │          🇪🇸          │          │
│        │                      │       │                      │          │
│        │   Chinese            │       │   Spanish            │          │
│        │   (Mandarin)         │       │                      │          │
│        │                      │       │                      │          │
│        └──────────────────────┘       └──────────────────────┘          │
│              (selected)                    (not selected)                │
│                                                                          │
│                        [ Get Started → ]                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 640px)

```
┌──────────────────────────────┐
│  ◉ StudyPuck         [ ZB ]  │  ← simplified top bar
├──────────────────────────────┤
│                              │
│     Welcome to StudyPuck     │
│   Choose a language to get   │
│         started              │
│                              │
│   ┌──────────┐ ┌──────────┐  │
│   │          │ │          │  │
│   │    🇨🇳    │ │    🇪🇸    │  │
│   │          │ │          │  │
│   │ Chinese  │ │ Spanish  │  │
│   │(Mandarin)│ │          │  │
│   └──────────┘ └──────────┘  │
│      (selected)              │
│                              │
│    [ Get Started → ]         │
│                              │
└──────────────────────────────┘
```

### Element Specification

#### Top Bar (Onboarding State)

| Zone | Contents |
|---|---|
| Left | App logo/name (`◉ StudyPuck`) |
| Right | User avatar circle (e.g., `ZB`) — user is authenticated |
| Absent | Language switcher — not yet configured; deliberately omitted to avoid confusion |

#### Headline

- **Primary**: "Welcome to StudyPuck"
- **Secondary**: "Choose a language to get started" (muted color, smaller size)

No further instructions. The UI is self-evident.

#### Language Tiles

| Property | Spec |
|---|---|
| Layout | Side-by-side on desktop and mobile (2 tiles, comfortable gap) |
| Tile contents | Flag emoji (top, large) + language name (below) |
| Unselected state | Neutral border, light background fill |
| Selected state | Colored border (primary brand color), slightly elevated background tint, subtle checkmark or visual indicator |
| Multi-select | Allowed — user may select more than one language before confirming |
| Initial state | No tile selected — "Get Started" button is **disabled** |

#### CTA Button

| State | Appearance |
|---|---|
| Disabled (no selection) | Grayed out, non-interactive |
| Enabled (≥1 selected) | Primary brand color, "Get Started →" |

#### Post-Confirmation Behavior

After the user taps "Get Started →":
1. Selected languages are saved to the user's profile
2. User is redirected to `/` (the returning-user dashboard)
3. The first selected language becomes the active language context
4. The `/onboarding` route is **never shown again** for this user

#### Future Language Support

The onboarding tile grid is designed to accommodate more languages. When the catalog grows beyond ~6 tiles, the layout switches to a 3-column grid. Beyond ~12, a search bar appears above the tile grid. This behavior is not in scope for v1 (2-language catalog).

---

## Screen 3: Returning-User Dashboard (`/`)

### Why Option B

The three options considered were:

- **Option A** (auto-resume to last context): Efficient for power users, but disorienting for users who haven't visited in a while, and offers no motivational feedback (streak, due counts).
- **Option B** (dashboard with actionable widgets): Surfaces the two most important daily tasks — *how many cards are due* and *how many inbox notes need card entry* — as first-class UI. The streak adds motivational context. Quick-access buttons let the user override to any section.
- **Option C** (minimal hub with app buttons): Clean, but surfacing equal-weight buttons for all mini-apps ignores what the user actually needs to act on. A user with 15 cards due and 8 inbox notes should see those numbers, not a blank launcher.

**Option B is chosen.** The dashboard is purposeful, not decorative. It answers "What should I do right now?" in a single glance.

The two primary widgets — **Cards Due for Review** and **Notes in Inbox** — are the two daily action drivers. Streak is secondary. Quick-access links remain available to navigate deliberately.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                       Chinese ▾      [ ZB ]     │  ← top bar
├──────────────────┬───────────────────────────────────────────────────────────┤
│                  │                                                            │
│  ▶ Home          │   ┌────────────────────────┐   ┌────────────────────────┐ │
│  ○ Card Entry    │   │  Cards Due for Review  │   │    Notes in Inbox      │ │
│  ○ Card Review   │   │                        │   │                        │ │
│  ○ Trans. Drills │   │           12           │   │           4            │ │
│  ○ Cards         │   │                        │   │                        │ │
│  ○ Statistics    │   │   [ Review Now → ]     │   │  [ Enter Cards → ]     │ │
│                  │   └────────────────────────┘   └────────────────────────┘ │
│  [ + ]           │                                                            │
│  ─────────────── │   🔥  14-day study streak                                  │
│  ○ Settings      │                                                            │
│                  │   Quick access:  [ Card Entry ]  [ Card Review ]           │
│                  │                  [ Translation Drills ]                    │
│                  │                                                            │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 640px)

```
┌──────────────────────────────┐
│  ◉ StudyPuck     Chinese ▾   │  ← top bar
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │  Cards Due           │    │
│  │  for Review          │    │
│  │                      │    │
│  │         12           │    │
│  │                      │    │
│  │  [ Review Now → ]    │    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │  Notes in Inbox      │    │
│  │                      │    │
│  │          4           │    │
│  │                      │    │
│  │  [ Enter Cards → ]   │    │
│  └──────────────────────┘    │
│                              │
│  🔥  14-day study streak     │
│                              │
│                    ( + )     │  ← FAB (floating)
├──────────────────────────────┤
│   🏠    📥    🃏    💬   ···  │  ← bottom tab bar
└──────────────────────────────┘
```

### Element Specification

#### Action Widget: Cards Due for Review

| Property | Spec |
|---|---|
| Accent color | Blue (primary brand color — matches Card Review mini-app) |
| Count | Live count of cards in the review queue for the active language |
| CTA | "Review Now →" — navigates to `/card-review` |
| Empty state | "No cards due today. Come back tomorrow!" with a checkmark icon |

#### Action Widget: Notes in Inbox

| Property | Spec |
|---|---|
| Accent color | Green (distinct from blue — communicates a different action type) |
| Count | Live count of unprocessed inbox notes for the active language |
| CTA | "Enter Cards →" — navigates to `/card-entry` |
| Empty state | "Inbox is clear." with a checkmark icon |

#### Widgets: Layout Behavior

- **Desktop**: Side by side in a two-column layout
- **Mobile**: Stacked vertically, full width
- Both widgets are **per-language**: counts reflect the currently active language context. Switching language via the language switcher refreshes these counts.

#### Study Streak

- Displayed below the action widgets
- Format: `🔥 N-day study streak`
- Secondary visual weight — motivational context, not a primary action
- At zero (day 1 or broken streak): "Start your streak today" in muted text

#### Quick-Access Buttons

Below the streak, three equal-weight buttons:
- Card Entry
- Card Review
- Translation Drills

These exist for deliberate navigation — e.g., the user wants to drill translations even though their inbox is empty. They are visually secondary (outlined/ghost style) to the two primary action widgets.

#### No Personal Greeting

No "Good morning, Zach" or date display. The user is here to study, not to be welcomed. The data is the welcome.

---

## Navigation Shell Integration

All authenticated screens (onboarding and dashboard) incorporate the global navigation shell defined in [global-navigation.md](./global-navigation.md). Key integration notes:

| Screen | Nav Shell State |
|---|---|
| Logged-out homepage | No nav shell — top bar shows only logo + Sign In button |
| Onboarding (`/onboarding`) | Top bar: logo + avatar. **No language switcher** (none configured yet). No sidebar (desktop). No bottom tab bar (mobile). |
| Dashboard (`/`) | Full nav shell: top bar + sidebar (desktop) or top bar + bottom tab bar (mobile). Home is the active nav item. |

The absence of the language switcher during onboarding is intentional. It avoids a confusing affordance (a button that does nothing before a language exists).

---

## Behavior Across Breakpoints

| Element | Mobile (< 640px) | Desktop (> 1024px) |
|---|---|---|
| Logged-out hero | Stacked, centered text | Centered text, more breathing room |
| Feature cards | Stacked vertically, full width | Side-by-side, half-width each |
| Onboarding tiles | Side-by-side (2 tiles, compact) | Side-by-side (2 tiles, more spacious) |
| Dashboard action widgets | Stacked vertically, full width | Side-by-side, equal width |
| Dashboard streak + quick access | Below widgets, full width | Below widgets, left-aligned to content area |

---

## Accessibility Notes

- Sign In button and Get Started button: minimum 44×44px touch target
- Language tiles: fully keyboard-navigable (Tab/Space to select, Enter to confirm)
- Action widgets: count numbers must meet WCAG AA contrast against their background tints
- All CTAs use descriptive accessible labels (no "click here")
- Empty states must be readable by screen readers

---

## References

- [global-navigation.md](./global-navigation.md) — nav shell used in onboarding and dashboard screens
- [information-architecture.md](../information-architecture.md) — route inventory, language switching behavior, mini-app structure
- [non-functional-requirements.md](../non-functional-requirements.md) — accessibility, touch targets, responsive breakpoints
- [Wireframes: homepage-onboarding.excalidraw](./homepage-onboarding.excalidraw)
