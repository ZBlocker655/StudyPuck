# Global Navigation Shell

> **Status**: Authoritative  
> **Depends on**: [information-architecture.md](../information-architecture.md)

This document specifies every persistent navigation element in StudyPuck — its placement, visual treatment, and interaction behavior — across desktop and mobile breakpoints.

---

## Design Principle

> *"Navigation elements should not crowd out the current context but should always be accessible."*

The navigation shell is a thin, always-present guide rail. It orients the user at a glance without competing with the content that fills the screen. On desktop this is a narrow sidebar; on mobile it is a bottom tab bar. In both cases the amount of chrome is intentionally minimal.

---

## Desktop Layout

### Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                              Chinese ▾        [ ZB ]      │  ← full-width top bar
├──────────────────┬─────────────────────────────────────────────────────┤
│                  │                                                      │
│  ▶ Home          │                                                      │
│  ○ Card Entry    │                MAIN CONTENT AREA                    │
│  ○ Card Review   │                                                      │
│  ○ Trans. Drills │                                                      │
│  ○ Cards         │                                                      │
│  ○ Statistics    │                                                      │
│                  │                                                      │
│  [ + ]           │                                                      │
│  ─────────────── │                                                      │
│  ○ Settings      │                                                      │
└──────────────────┴─────────────────────────────────────────────────────┘
```

*`▶` indicates the active item — see Active State below. `[ZB]` = initials avatar.*

### Top Bar (Desktop)

A full-width header bar spanning the entire window width, above both the sidebar and the content area.

| Zone | Contents |
|---|---|
| Left | App logo/name (`◉ StudyPuck`) |
| Right | Language switcher (`Chinese ▾`) + User avatar circle (`[ZB]`) |

**App logo/name**: Clicking it navigates to `/` (Home/Dashboard). Visual treatment matches the app's typographic identity (see visual design phase).

This mirrors the mobile top bar layout — logo left, language + account right — giving the app a consistent header pattern across all breakpoints.

### Sidebar

| Property | Value |
|---|---|
| Width | ~200px (fixed, not collapsible in v1) |
| Position | Left edge, below the top bar, full remaining height |
| Contents | Nav items → global "+" → divider → Settings |
| Scroll | Sidebar does not scroll; content area scrolls independently |

**Nav item order** (top to bottom):
1. Home
2. Card Entry
3. Card Review
4. Translation Drills
5. Cards
6. Statistics
7. *(visual divider)*
8. Global "+" Quick-Add button
9. *(visual divider)*
10. Settings

Each item shows an icon + text label. Icons are simple, consistent weight — not decorative, but recognizable.

### Active State

The active nav item (the current mini-app) is indicated by:
- **Bold colored text** — uses the primary brand color
- **Highlighted row background** — a soft fill behind the entire row

Both signals fire together. The combination ensures clarity in both light and dark mode without relying on color alone (important for WCAG AA).

### Per-Mini-App Decorative Motif *(design exploration)*

Each mini-app may carry a subtle, distinct decorative accent that reinforces the user's current context — inspired by the "old book" / scholarly aesthetic of StudyPuck. This could manifest as a small pattern, illustration fragment, or color accent in the margin of the main content area. The exact treatment is deferred to the visual design phase; the intent is **unobtrusive but recognizable** — a whisper, not a shout.

Candidate treatments to explore:
- A thin colored left-border on the sidebar's active row, distinct per mini-app
- A faint watermark or motif in the upper corner of the main content area
- A subtle header tint unique to each section

This motif must not interfere with readability or accessibility (contrast requirements still apply).

### Top Bar Controls (Desktop)

The language switcher and user avatar live in the **top bar**, right-aligned, alongside the app logo.

| Control | Visual | Behavior |
|---|---|---|
| Language switcher | `Chinese ▾` (English name + chevron) | Click → dropdown list opens below |
| User avatar | Initials circle (e.g., `ZB`) | Click → dropdown menu opens below |

The two controls sit side-by-side with comfortable spacing on the right side of the top bar. No other elements live in this zone.

---

## Language Switcher

### Button

`Chinese ▾` — the English name of the active language followed by a downward chevron (▾). Always visible on both desktop and mobile.

**Rationale for English name (not flag or code)**: Many languages span multiple countries and flags (Chinese, Spanish, Arabic, French, Portuguese). English names are unambiguous, accessible to screen readers, and scale cleanly to any future language.

### Desktop Interaction

1. User clicks `Chinese ▾`
2. A **dropdown list** opens directly below the button
3. List shows all configured languages, with the active language highlighted
4. Each item: English language name (with native name optionally shown smaller, TBD)
5. Clicking a language: switches context, closes dropdown, updates button label
6. Clicking outside or pressing Escape: closes dropdown without switching

### Mobile Interaction

1. User taps `Chinese ▾` in the top bar
2. A **bottom sheet** slides up from the bottom of the screen
3. Same list as desktop — active language highlighted
4. Tapping a language: switches context, dismisses bottom sheet
5. Tapping backdrop or swiping down: dismisses without switching

### What Happens on Switch

Defined in the IA document — summarized here for completeness:
- The active language context changes globally
- The user **stays on the same screen** — content refreshes for the new language
- Each language retains its own persistent state (inbox, session, etc.)
- If the new language has no content on the current screen, an empty state with a CTA is shown

### Edge Cases

- If only one language is configured, the button is still shown (non-interactive, or shows a tooltip: "Add more languages in Settings")
- Maximum visible languages in the dropdown before scrolling: 6 (then scroll)

---

## User Avatar Dropdown (Desktop)

### Trigger

An **initials circle** in the top-right. Shows the first letter(s) of the user's display name (e.g., "ZB" for Zach Blocker). Uses a consistent brand color as the background.

If a user has uploaded a profile photo (future feature), the photo replaces the initials circle.

### Dropdown Contents

```
┌──────────────────────────┐
│  Profile                 │
│  ─────────────────────── │
│  ☀ Dark Mode  [   ◯   ]  │
│  ─────────────────────── │
│  Sign Out                │
└──────────────────────────┘
```

| Item | Behavior |
|---|---|
| Profile | Navigates to `/settings/account` |
| Dark Mode | An inline toggle switch with a sun/moon icon. Toggling it changes the theme immediately and persists the preference in `localStorage`. Does **not** close the dropdown. |
| Sign Out | Triggers sign-out flow and redirects to `/` (Welcome screen) |

### Mobile Access

The user avatar and its dropdown are **not** in the mobile top bar. They are accessible via the "···" More bottom sheet (see below).

---

## Dark Mode Toggle

- **Location**: Inside the user avatar dropdown
- **Visual**: A labeled toggle switch — sun icon, the label "Dark Mode", and a toggle control
- **Behavior**: Immediate theme switch on toggle. Preference persisted in `localStorage`. No page reload.
- **No flash of wrong theme**: The theme is applied before first paint by reading `localStorage` in a blocking script in `<head>` (see NFR document).

---

## Mobile Layout

### Top Bar

```
┌───────────────────────────────┐
│  ◉ StudyPuck     Chinese ▾    │
└───────────────────────────────┘
```

| Property | Value |
|---|---|
| Height | Standard mobile top bar height (~56px) |
| Left | App logo/name — tapping navigates to Home (`/`) |
| Right | Language switcher: `Chinese ▾` |
| No avatar | Avatar is accessible via the "···" More bottom sheet |

### Bottom Tab Bar

```
┌───────────────────────────────────────────────────┐
│   🏠     📥     🃏     💬     ···                  │
│  Home   Entry  Review Drills  More                │
└───────────────────────────────────────────────────┘
```

| Tab | Route | Icon |
|---|---|---|
| Home | `/` | Home/house icon |
| Card Entry | `/card-entry` | Inbox/tray icon |
| Card Review | `/card-review` | Cards/stack icon |
| Translation Drills | `/translation-drills` | Chat/speech bubble icon |
| ··· More | (bottom sheet) | Ellipsis / grid icon |

**Active tab state**: Same treatment as desktop — bold colored icon/text + highlighted background behind the tab area.

**Tab bar always visible** on all authenticated screens, even while drawers/sheets are open.

### Global "+" FAB (Floating Action Button)

- **Position**: Bottom-right corner, floating above the tab bar
- **Size**: 56×56px minimum (meets 44×44px touch target requirement with margin)
- **Always visible** on all authenticated screens (mobile)
- **Action**: Opens the Quick-Add Note drawer (Feedly motif — slides in from right)
- **Visual**: Circle button with a "+" icon, brand primary color

The FAB sits above the bottom bar in the z-order. It does not obstruct the tab bar items.

### "···" More Bottom Sheet

Triggered by tapping the ··· tab. A bottom sheet slides up containing:

```
┌──────────────────────────────────────┐
│  ▬  (drag handle)                    │
│                                      │
│  📚 Cards                            │
│  📊 Statistics                       │
│  ⚙  Settings                         │
│  ─────────────────────────────────── │
│  [ZB]  Zach Blocker                  │
│       Profile                        │
│       ☀ Dark Mode  [   ◯   ]         │
│       Sign Out                       │
└──────────────────────────────────────┘
```

- Drag handle at top for swipe-to-dismiss
- Tap backdrop or swipe down to close
- User section mirrors the desktop avatar dropdown (same items: Profile, Dark Mode, Sign Out)

---

## Active State Summary

| Context | Signal |
|---|---|
| Active mini-app (desktop sidebar) | Bold colored text + highlighted row background |
| Active mini-app (mobile bottom bar) | Bold colored icon/text + highlighted tab background |
| Active language | Language switcher button label always shows current language |
| Per-mini-app motif (desktop, exploration) | Subtle decorative accent, exact treatment TBD |

---

## Behavior Across Breakpoints

| Element | Mobile (< 640px) | Tablet (640–1024px) | Desktop (> 1024px) |
|---|---|---|---|
| Sidebar | Hidden | Hidden | Visible (~200px) |
| Bottom tab bar | Visible | Visible | Hidden |
| App logo/name | Top bar (left) | Top bar (left) | Top bar (left) |
| Language switcher | Top bar (right) → bottom sheet | Top bar (right) → bottom sheet | Top bar (right) → dropdown |
| User avatar | Via More bottom sheet | Via More bottom sheet | Top bar (right) → dropdown |
| Global "+" FAB | Always visible (bottom-right) | Always visible (bottom-right) | Sidebar (inline button) |
| Settings | Via More bottom sheet | Via More bottom sheet | Sidebar (bottom) |

*Tablet uses the same layout as mobile for v1 — a full sidebar layout for tablet may be considered in a future iteration.*

---

## Accessibility Notes

- All nav items are keyboard-navigable (Tab/Enter/Arrow keys)
- Active state does not rely on color alone — bold weight provides a non-color signal
- Language switcher dropdown and More bottom sheet trap focus when open
- FAB has a visible label for screen readers: `aria-label="Add new note"`
- Bottom sheet and dropdowns close on Escape key
- Touch targets: all interactive items meet 44×44px minimum

---

## References

- [information-architecture.md](../information-architecture.md) — screen inventory, navigation model, language switching behavior
- [non-functional-requirements.md](../non-functional-requirements.md) — accessibility, touch targets, dark mode, responsive breakpoints
- [Wireframes: global-navigation.excalidraw](./global-navigation.excalidraw)
