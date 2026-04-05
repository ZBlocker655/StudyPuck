# Profile & Settings Storyboards

> **Status**: Authoritative
> **Depends on**: [global-navigation.md](./global-navigation.md), [information-architecture.md](../information-architecture.md)

This document specifies the design of the Settings area: the Account page, Language Management screens, and Preferences page.

---

## Structure & Navigation Recommendation

The IA already establishes the route hierarchy:

```
/settings           → redirects to /settings/account (no hub page)
/settings/account   → Account (profile info + account actions)
/settings/languages → Language management
/settings/preferences → App preferences
```

**No Settings Hub page.** "Settings" in the sidebar links directly to `/settings/account`, the most common destination. The three sections are navigated via a **tab bar** at the top of the settings content area.

**Rationale**: A hub landing page adds a navigation hop with no value when there are only three sections. Tabs make all sections immediately visible and require zero extra clicks to reach any section. A secondary sidebar would create a "sidebar within sidebar" conflict with the global nav — tabs avoid this entirely.

### Settings Tab Bar

```
┌──────────────────────────────────────────────────────┐
│  [ Account ]  [ Languages ]  [ Preferences ]         │
└──────────────────────────────────────────────────────┘
```

- Active tab: bold text + underline (or bottom border accent)
- Tab bar appears at the top of the settings content area, below the page heading
- On mobile: tabs scroll horizontally if they overflow (they won't at 3 tabs, but this is the intended behavior at scale)

---

## Screen 1: Account Page (`/settings/account`)

### Philosophy

The Account page is visited occasionally, not daily. It should be calm and well-organized — not a wall of form fields. Display name is the one thing users will edit; everything else is informational or action-oriented (sign out, delete account).

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                       Chinese ▾      [ ZB ]     │
├──────────────────┬───────────────────────────────────────────────────────────┤
│                  │                                                            │
│  ○ Home          │  Settings                                                  │
│  ○ Card Entry    │  ─────────────────────────────────────────────────────     │
│  ○ Card Review   │  [ Account ]  [ Languages ]  [ Preferences ]              │
│  ○ Trans. Drills │                                                            │
│  ○ Cards         │  ── Profile ─────────────────────────────────────────     │
│  ○ Statistics    │                                                            │
│                  │     ( ZB )   Display Name   [ Zach Blocker    ] [Save]     │
│  [ + ]           │              Email          zach@example.com               │
│  ─────────────── │              Member since   January 2026                   │
│  ▶ Settings      │              Last login     Today, 5:10 AM                 │
│                  │                                                            │
│                  │  ── Study Languages ──────────────────────────────────     │
│                  │                                                            │
│                  │     Chinese (Mandarin)  •  Spanish                        │
│                  │     [ Manage Languages → ]                                 │
│                  │                                                            │
│                  │  ── Account Actions ──────────────────────────────────     │
│                  │                                                            │
│                  │     [ Sign Out ]                                           │
│                  │                                                            │
│                  │     [ Delete Account ]  (destructive, styled in red)      │
│                  │                                                            │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────────┐
│  ◉ StudyPuck     Chinese ▾   │
├──────────────────────────────┤
│  Settings                    │
│  ─────────────────────────── │
│  [ Account ] [Languages]     │
│  [Preferences]               │
│                              │
│  ── Profile ───────────────  │
│                              │
│    ( ZB )                    │
│    Display Name              │
│    [ Zach Blocker     ][✓]   │
│    Email                     │
│    zach@example.com          │
│    Member since              │
│    January 2026              │
│    Last login                │
│    Today, 5:10 AM            │
│                              │
│  ── Study Languages ───────  │
│    Chinese (Mandarin)        │
│    Spanish                   │
│    [ Manage Languages → ]    │
│                              │
│  ── Account Actions ───────  │
│    [ Sign Out ]              │
│    [ Delete Account ]        │
│                              │
├──────────────────────────────┤
│   🏠   📥   🃏   💬   ···    │
└──────────────────────────────┘
```

### Element Specification

#### Settings Tab Bar

| Tab | Route | Active on |
|---|---|---|
| Account | `/settings/account` | This page |
| Languages | `/settings/languages` | Language management screens |
| Preferences | `/settings/preferences` | Preferences page |

#### Profile Section

| Field | Editable | Notes |
|---|---|---|
| Avatar / Initials circle | No (v1) | Same initials circle as nav — shows first letter(s) of display name |
| Display Name | Yes — inline | Text input, shows current name. Save button appears inline (or auto-saves on blur). |
| Email | No | Read-only — managed by Auth0 |
| Member since | No | Read-only — formatted date |
| Last login | No | Read-only — relative time (e.g., "Today, 5:10 AM") |

**Inline edit behavior for Display Name**:
- Field renders as a styled text input (not a plain `<p>`) — always looks editable
- A "Save" button (or checkmark on mobile) appears next to the field
- On save: brief success confirmation (e.g., field border turns green momentarily)
- On blur without save: reverts to previous value

#### Study Languages Summary

- Lists the user's configured languages by name (comma-separated or stacked)
- A `Manage Languages →` link navigates to `/settings/languages`
- This section is read-only here — it's a summary only

#### Account Actions

| Action | Behavior |
|---|---|
| Sign Out | Triggers sign-out flow, redirects to `/` (Welcome screen) |
| Delete Account | Opens the Delete Account confirmation flow (see below) |

#### Delete Account Flow

A two-step confirmation to prevent accidental deletion:

**Step 1** — Warning dialog/overlay:
```
┌─────────────────────────────────────────────────────┐
│  ⚠  Delete Account                                  │
│                                                     │
│  This will permanently delete your StudyPuck        │
│  account and ALL study data — cards, review         │
│  history, and language configurations.              │
│                                                     │
│  This cannot be undone.                             │
│                                                     │
│  To confirm, type DELETE in the box below:          │
│                                                     │
│  [ _______________________ ]                        │
│                                                     │
│  [ Cancel ]       [ Delete Account ] (disabled)     │
└─────────────────────────────────────────────────────┘
```

**Step 2** — "Delete Account" button activates only when the user has typed `DELETE` (case-insensitive). On confirm: account deleted, redirected to `/` (logged-out homepage).

---

## Screen 2: Language Management (`/settings/languages`)

### Language List

The default view of the Languages tab. Shows all configured languages.

#### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                       Chinese ▾      [ ZB ]     │
├──────────────────┬───────────────────────────────────────────────────────────┤
│  (sidebar)       │                                                            │
│  ▶ Settings      │  Settings                                                  │
│                  │  ─────────────────────────────────────────────────────     │
│                  │  [ Account ]  [ Languages ]  [ Preferences ]              │
│                  │                                                            │
│                  │  ── Your Languages ──────────────────────────────── [+ Add Language]
│                  │                                                            │
│                  │  ┌─────────────────────────────────────────────────────┐  │
│                  │  │  🇨🇳  Chinese (Mandarin)          ← ACTIVE          │  │
│                  │  │      142 cards  •  Last studied: Today              │  │
│                  │  │      [ Set Active ]  [ Remove ]                     │  │
│                  │  └─────────────────────────────────────────────────────┘  │
│                  │                                                            │
│                  │  ┌─────────────────────────────────────────────────────┐  │
│                  │  │  🇪🇸  Spanish                                       │  │
│                  │  │      38 cards  •  Last studied: 3 days ago          │  │
│                  │  │      [ Set Active ]  [ Remove ]                     │  │
│                  │  └─────────────────────────────────────────────────────┘  │
│                  │                                                            │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

#### Mobile Layout

```
┌──────────────────────────────┐
│  ◉ StudyPuck     Chinese ▾   │
├──────────────────────────────┤
│  Settings                    │
│  [ Account ] [Languages]     │
│  [Preferences]               │
│                              │
│  Your Languages  [+ Add]     │
│  ─────────────────────────── │
│                              │
│  ┌──────────────────────┐    │
│  │  🇨🇳 Chinese         │    │
│  │     (Mandarin)       │    │
│  │  ← ACTIVE            │    │
│  │  142 cards           │    │
│  │  Last studied: Today │    │
│  │  [Set Active][Remove]│    │
│  └──────────────────────┘    │
│                              │
│  ┌──────────────────────┐    │
│  │  🇪🇸 Spanish         │    │
│  │  38 cards            │    │
│  │  Last: 3 days ago    │    │
│  │  [Set Active][Remove]│    │
│  └──────────────────────┘    │
│                              │
├──────────────────────────────┤
│   🏠   📥   🃏   💬   ···    │
└──────────────────────────────┘
```

#### Language Card Specification

| Element | Spec |
|---|---|
| Flag | Flag emoji for the language |
| Language name | Full English name (e.g., "Chinese (Mandarin)") |
| Active indicator | `← ACTIVE` label + highlighted card background (matches primary brand accent) |
| Card count | "N cards" |
| Last studied | Relative time ("Today", "3 days ago", "Never") |
| Set Active | Only shown for non-active languages. Switches the active language context globally, same as the language switcher. |
| Remove | Always shown. Opens the Remove Language confirmation flow. |

### Add Language Flow

Triggered by the `+ Add Language` button.

#### Add Language Screen (modal or page — see below)

**Recommendation**: Modal overlay on desktop; full page (pushed route) on mobile. This keeps the user in the settings context and feels lightweight for a selection action.

```
Desktop modal:
┌─────────────────────────────────────────────────────┐
│  Add a Language                              [ ✕ ]  │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Which language do you want to study?               │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    🇨🇳   │  │    🇪🇸   │  │    🇫🇷   │          │
│  │ Chinese  │  │ Spanish  │  │  French  │          │
│  │(Mandarin)│  │(already  │  │          │          │
│  │          │  │ added ✓) │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────┐  ┌──────────┐                        │
│  │    🇯🇵   │  │    🇩🇪   │                        │
│  │ Japanese │  │  German  │                        │
│  │          │  │          │                        │
│  └──────────┘  └──────────┘                        │
│                                                     │
│           [ Cancel ]  [ Add Language → ]            │
│                (Add button disabled until selected) │
└─────────────────────────────────────────────────────┘
```

#### Add Language: States

| State | Behavior |
|---|---|
| Language already added | Tile shown with a `✓` checkmark and grayed/disabled treatment |
| Language not added | Selectable tile |
| Selected | Tile gets highlighted border (same as onboarding tile selection) |
| After confirm | Modal closes; user is switched to the new language context and redirected to the dashboard (`/`) for that language |

### Remove Language Flow

Triggered by `[ Remove ]` on a language card.

#### Remove Confirmation (modal)

```
┌─────────────────────────────────────────────────────┐
│  ⚠  Remove Chinese (Mandarin)?                     │
│                                                     │
│  This will permanently delete:                      │
│  • 142 flashcards                                   │
│  • All review history and SRS data                  │
│  • All Translation Drill sessions                   │
│                                                     │
│  This cannot be undone.                             │
│                                                     │
│  To confirm, type REMOVE in the box below:          │
│                                                     │
│  [ _______________________ ]                        │
│                                                     │
│  [ Cancel ]    [ Remove Language ] (disabled)       │
└─────────────────────────────────────────────────────┘
```

**Behavior**:
- "Remove Language" button activates only when user has typed `REMOVE` (case-insensitive)
- The exact data being deleted is listed explicitly — no vague "all data will be deleted"
- If the removed language was the active language, the app switches to the next available language
- If it was the only language, the user is redirected to `/onboarding`

---

## Screen 3: Preferences Page (`/settings/preferences`)

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                       Chinese ▾      [ ZB ]     │
├──────────────────┬───────────────────────────────────────────────────────────┤
│  (sidebar)       │                                                            │
│  ▶ Settings      │  Settings                                                  │
│                  │  ─────────────────────────────────────────────────────     │
│                  │  [ Account ]  [ Languages ]  [ Preferences ]              │
│                  │                                                            │
│                  │  ── Appearance ───────────────────────────────────────     │
│                  │                                                            │
│                  │     Theme       ● Light  ○ Dark  ○ System                 │
│                  │                                                            │
│                  │  ── Study ────────────────────────────────────────────     │
│                  │                                                            │
│                  │     Default session size (cards per review session)        │
│                  │     [ 20  ▾ ]   (options: 10, 20, 30, 50)                 │
│                  │                                                            │
│                  │  ── Notifications ────────────────────────────────────     │
│                  │                                                            │
│                  │     Daily study reminder         [  ●  ] ON               │
│                  │     Reminder time                [ 8:00 AM ▾ ]            │
│                  │                                                            │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────────┐
│  ◉ StudyPuck     Chinese ▾   │
├──────────────────────────────┤
│  Settings                    │
│  [ Account ] [Languages]     │
│  [Preferences]               │
│                              │
│  ── Appearance ────────────  │
│     Theme                    │
│     ● Light  ○ Dark          │
│     ○ System                 │
│                              │
│  ── Study ─────────────────  │
│     Default session size     │
│     [ 20 ▾ ]                 │
│                              │
│  ── Notifications ─────────  │
│     Daily reminder           │
│     OFF  [  ○  ]  ON         │
│                              │
│     Reminder time            │
│     [ 8:00 AM ▾ ]            │
│                              │
├──────────────────────────────┤
│   🏠   📥   🃏   💬   ···    │
└──────────────────────────────┘
```

### Element Specification

#### Appearance

| Setting | Control | Options |
|---|---|---|
| Theme | Radio group | Light / Dark / System |

"System" follows the OS preference. This setting mirrors the Dark Mode toggle in the avatar dropdown — changing one changes the other. The avatar dropdown is a quick toggle; this page shows the full three-way option.

#### Study

| Setting | Control | Default | Options |
|---|---|---|---|
| Default session size | Dropdown | 20 | 10, 20, 30, 50 |

Applied to Card Review sessions. Users can override per-session, but this sets the default.

#### Notifications

| Setting | Control | Default | Notes |
|---|---|---|---|
| Daily study reminder | Toggle switch | ON | When off, hides the reminder time selector |
| Reminder time | Dropdown or time picker | 8:00 AM | Only visible when daily reminder is ON |

Notification preferences are stored server-side so they apply across devices.

---

## Navigation Shell Integration

All settings screens use the full global nav shell from [global-navigation.md](./global-navigation.md):

| Element | State on Settings screens |
|---|---|
| Sidebar (desktop) | Settings item is the active item (`▶ Settings`) |
| Bottom tab bar (mobile) | "···" More tab active (Settings is in the More sheet) |
| Language switcher | Visible and functional — the active language context is preserved |
| Tab bar within settings | Persistent across all three settings sections |

---

## Behavior Across Breakpoints

| Element | Mobile | Desktop |
|---|---|---|
| Settings tab bar | Horizontally scrollable (wraps to 2 rows if needed on very small screens) | Inline, full row |
| Language cards | Full-width stacked | Full-width stacked (constrained to content column) |
| Add Language tiles | 2-column grid | 3-column grid |
| Delete/Remove confirmation | Full-screen modal | Centered overlay modal |
| Inline display name edit | Input + checkmark button (stacked) | Input + Save button (inline) |

---

## Accessibility Notes

- Destructive actions (Delete Account, Remove Language) are styled with a distinct red/danger color
- Type-to-confirm fields: button activates on exact match (case-insensitive); field does not show the match hint until the user starts typing
- All form controls are keyboard-navigable
- Toggle switches have both a visual state and an `aria-checked` attribute
- Language tiles in the Add Language flow have `aria-selected` and `aria-disabled` states
- Confirmation modals trap focus and dismiss on Escape key

---

## References

- [global-navigation.md](./global-navigation.md) — nav shell used across all settings screens
- [information-architecture.md](../information-architecture.md) — route inventory, settings structure
- [homepage-onboarding.md](./homepage-onboarding.md) — onboarding flow triggered when last language is removed
- [non-functional-requirements.md](../non-functional-requirements.md) — accessibility, touch targets, dark mode
- [Wireframes: profile-settings.excalidraw](./profile-settings.excalidraw)
