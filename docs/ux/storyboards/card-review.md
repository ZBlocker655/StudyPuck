# Card Review Storyboard

> **Status**: Authoritative  
> **Depends on**: [card-review.md requirements](../../requirements/functionality/card-review.md), [information-architecture.md](../information-architecture.md), [global-navigation.md](./global-navigation.md), [llm-command-interface.md](./llm-command-interface.md)

This document specifies every screen and interaction in the Card Review feature — its session setup, card display, rating controls, secondary actions, transient card states, and session completion — across desktop and mobile breakpoints.

---

## Design Decisions

The following decisions were made during the UX design process. Each is captured here as the authoritative record of intent.

| # | Decision | Rationale |
|---|---|---|
| 1 | **No reveal step — show everything immediately** — the card content (prompt, meaning, examples, mnemonic) is fully visible when a card is displayed. | StudyPuck is a review tool, not a quiz. The user reads the card to reinforce memory, then rates difficulty. There is no Q&A prompt/answer pattern. |
| 2 | **Normal two-pane layout throughout** — the nav sidebar and the two-pane (context + conversation) layout remain visible during review. No receding or hiding chrome. | Consistency over distraction-free mode. The conversation pane is valuable during review for `/pin`, `/snooze`, and `/next` commands. |
| 3 | **Group selection uses always-visible checkboxes** — on the session setup screen, each group row shows a checkbox on the left. Clicking anywhere on the row toggles selection. Multi-select is allowed. A "Select all" link appears at the top-right of the section. | Consistent with the app's selection patterns. Checkboxes are always shown because selection IS the purpose of this list (unlike Card Library, where checkboxes only appear in bulk-select mode). |
| 4 | **Card count: default "All due cards" + optional "Limit to N cards" toggle** — the default state shows "All due cards" selected. Below it, an optional "Limit to N cards" toggle; when enabled, a number input appears (default 10, min 1). | Simple; covers the 90% case (all due) with an escape hatch for users who want shorter sessions. |
| 5 | **Rating controls: three large tap-friendly buttons — [Easy] [Medium] [Hard]** — displayed prominently below the card content. Color-coded: Easy = green (#2f9e44), Medium = amber (#e67700), Hard = red (#e03131). Keyboard shortcuts: `1` = Easy, `2` = Medium, `3` = Hard. | Three tiers are DB-backed (`cardsRatedEasy`, `cardsRatedMedium`, `cardsRatedHard` in `cardReviewDailyStats`). Large buttons ensure fast, accurate tapping on mobile. |
| 6 | **Auto-advance after rating** — tapping Easy/Medium/Hard immediately loads the next card. No separate "Next →" button is needed. | Rating IS the advance action. This creates a fast, rhythmic review flow. |
| 7 | **Secondary actions: small button row below rating buttons** — `[📌 Pin to Drills]  [💤 Snooze]  [🚫 Disable]` — always visible below the rating row. Keyboard shortcuts: `P` = Pin, `S` = Snooze, `D` = Disable. | Discoverable but secondary. Visible without a menu, but smaller/quieter than the rating buttons. |
| 8 | **Progress indicator: subtle "Card N of N" counter only** — shown in the session header row (not as a progress bar). Muted color. | A progress bar adds anxiety about remaining cards. A simple counter is informative without being distracting. |
| 9 | **Card metadata: group chips only** — small, muted group name chips appear below the card content. The last-reviewed date is NOT shown during review. | Groups give useful context (especially when reviewing across multiple groups). Last-reviewed date is noise during a session; the SRS handles scheduling invisibly. |
| 10 | **Session complete: stats + 3 CTAs** — shows cards reviewed, time taken, and Easy/Medium/Hard breakdown. Three action buttons: "Review more", "Go to Translation Drills" (highlighted if cards were pinned), "Back to home". | Gives a satisfying summary. The Translation Drills CTA is contextually prominent when cards were pinned, guiding the natural next step. |

---

## 1. Card Review Home / Session Setup

**Route**: `/[lang]/card-review`

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                    Japanese ▾       [ ZB ]      │  ← top bar
├──────────────────┬─────────────────────────────┬────────────────────────────┤
│                  │  Card Review                 │  Conversation              │
│  ○ Home          │  ─────────────────────────  │                            │
│  ○ Card Entry    │  🔥 7-day streak · 52 cards  │  Review commands           │  ← quick stats strip
│  ▶ Card Review   │  in rotation · Last: yestr.  │  appear here               │
│  ○ Trans. Drills │  ─────────────────────────  │                            │
│  ○ Cards         │  Select groups to review     │                            │
│  ○ Statistics    │                  Select all  │                            │
│  ──────────────  │  ☑ Common Verbs  18 (5 due)  │                            │
│  ○ Settings      │  ☐ Grammar Patt. 24 (12 due) │                            │
│                  │  ☐ Kanji N5      30 (8 due)  │                            │
│                  │  ─────────────────────────  │                            │
│                  │  Card count                  │                            │
│                  │  ● All due cards (25 today)  │                            │
│                  │  ○ Limit to [10] cards       │                            │
│                  │                              │                            │
│                  │  [ Start Session ]           │                            │
├──────────────────┴─────────────────────────────┴────────────────────────────┤
│  ▸  /pin  /snooze  /next  …                                                  │  ← command bar
└──────────────────────────────────────────────────────────────────────────────┘
```

The session setup screen fills the context pane. The conversation pane is available for pre-session questions or slash commands. The layout is the standard two-pane structure — no full-screen takeover.

**Context pane sections (top to bottom):**

1. **Heading** — "Card Review" at the top of the context pane.
2. **Quick stats strip** — a single compact row in muted text: streak count, total cards in rotation, last reviewed date. Background slightly distinct from the main pane (#f1f3f5 or similar). Purpose: orientation at a glance, not data exploration.
3. **Group selection** — section label "Select groups to review" with a "Select all" link aligned right. Below: a scrollable list of group rows. Each row:
   - Checkbox on the left (always visible, not hover-gated)
   - Group name (medium weight)
   - Card count and due-today count on the right: e.g., `18 cards  (5 due today)`
   - Clicking anywhere on the row toggles the checkbox
   - Alternating row backgrounds (white / #f8f9fa) for readability
4. **Session options** — section label "Card count". Two options rendered as radio/toggle rows:
   - `● All due cards (25 due today)` — selected by default; the count in parentheses updates to reflect the total due in currently-selected groups
   - `○ Limit to N cards` — when toggled on, a number input appears inline (default 10, min 1, max = total due)
5. **Start Session button** — primary CTA, full-width of the options area. Disabled state when no groups are selected or when selected groups have 0 due cards.
6. **Empty state message** (conditional) — shown below the Start button when selected groups have 0 due cards: `"No cards due in selected groups. Next due: [date]."` The button remains disabled.

### Mobile Layout

```
┌───────────────────────────────────┐
│  ◉ StudyPuck        Japanese ▾    │  ← top bar
├───────────────────────────────────┤
│  Card Review                      │
│  ─────────────────────────────── │
│  🔥 7-day streak · 52 in rotation │  ← stats strip
│  ─────────────────────────────── │
│  Select groups to review          │
│  ☑ Common Verbs       5 due       │
│  ☐ Grammar Patterns   12 due      │
│  ☐ Kanji N5           8 due       │
│  ─────────────────────────────── │
│  Card count                       │
│  ● All due cards (25)             │
│  ○ Limit to N cards               │
│  ─────────────────────────────── │
│  [ Start Session          ]       │
│                                   │
├───────────────────────────────────┤
│   🏠     📥     ▶     💬     ···  │  ← bottom tab bar
└───────────────────────────────────┘
```

Mobile uses the same structure in a single column. Group rows span full width. The Start Session button is full-width. The conversation pane is accessible via the bottom tab bar or a draggable bottom sheet.

**Group row touch targets:** minimum 44px tall on mobile.

---

## 2. Card Display (Active Review)

**Route**: `/[lang]/card-review/session`

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                    Japanese ▾       [ ZB ]      │
├──────────────────┬────────────────────────────────┬───────────────────────────┤
│                  │  Card Review   Card 7 of 20     ✕ End session              │  ← session header
│  ○ Home          │  ──────────────────────────────│  Conversation             │
│  ○ Card Entry    │                                │                           │
│  ▶ Card Review   │         食べる                  │  Chat with the AI         │  ← prompt (32px)
│  ○ Trans. Drills │                                │  about this card…         │
│  ○ Cards         │         to eat                 │                           │  ← meaning (18px)
│  ○ Statistics    │                                │                           │
│  ──────────────  │  Examples:                     │                           │
│  ○ Settings      │  1. 私は魚を食べます。          │                           │
│                  │  2. 何を食べたい？              │                           │
│                  │  ┌─────────────────────────┐   │                           │
│                  │  │ 💡 Mnemonic              │   │                           │
│                  │  │ Tabe-ru → "table" →      │   │                           │
│                  │  │ the act of eating        │   │                           │
│                  │  └─────────────────────────┘   │                           │
│                  │  [Common Verbs] [JLPT N5]       │                           │  ← group chips
│                  │  ──────────────────────────    │                           │
│                  │  [   Easy   ] [  Medium ] [Hard]│                           │  ← rating buttons
│                  │     1            2          3   │                           │  ← kbd shortcuts
│                  │  [📌 Pin] [💤 Snooze] [🚫 Disable]                        │  ← secondary actions
├──────────────────┴────────────────────────────────┴───────────────────────────┤
│  ▸  /pin  /snooze  /next  …                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Context pane sections (top to bottom):**

#### Session Header (sticky, compact)

A thin header row at the top of the context pane, with a subtle background (#f1f3f5) and a bottom divider line. Contains:

| Element | Position | Style |
|---|---|---|
| "Card Review" label | left | 13px, `#495057` |
| "Card 7 of 20" counter | center-right | 12px, `#868e96` (muted) |
| "✕ End session" link | far right | 12px, `#868e96`, underline on hover |

The counter shows the current card index and the total number of cards in the session queue. It reflects remaining cards, not a percentage.

#### Card Body

The main content area, which scrolls if the card is very long. Layout within card body (top to bottom):

1. **Prompt / Main content** — the primary study item. Font: 32px, bold, centered horizontally. For CJK characters: 32–36px. See CJK note below. Black (#1e1e1e). No label above it.
2. **Meaning / Definition** — below the prompt, 16–18px, normal weight, `#495057` (muted but readable). No explicit label.
3. **Example sentences** — section label "Examples:" in 12px muted text, followed by a numbered list. Each sentence on its own line, 13px, slight indent. Italic or muted style to distinguish from main content.
4. **Mnemonic** — rendered in a light-background box (#fff9db, a light yellow) with a label "💡 Mnemonic" and the mnemonic text below. 12px, slightly smaller than main content. If no mnemonic is set, this section is omitted entirely.
5. **Group chips** — small pill-shaped chips below the mnemonic (or below examples if no mnemonic). Background `#e9ecef`, text `#495057`, 11px. E.g., `Common Verbs` · `JLPT N5`. These are read-only labels, not interactive.

#### Rating Controls (sticky, bottom of context pane)

A horizontal separator line divides the card body from the rating area. The rating area is visually attached to the bottom of the context pane (not floating over card content).

**Primary rating buttons** — three equal-width buttons, full-width of the rating area:

| Button | Color | Keyboard shortcut |
|---|---|---|
| Easy | Background `#2f9e44`, white text | `1` |
| Medium | Background `#e67700`, white text | `2` |
| Hard | Background `#e03131`, white text | `3` |

Keyboard shortcut labels (`1`, `2`, `3`) appear as small muted text below each button on desktop only.

Minimum button height: 44px (touch target). On desktop, height can be 44–50px.

**Secondary action row** — below the rating buttons, three smaller outline/ghost buttons:

| Button | Keyboard shortcut |
|---|---|
| 📌 Pin to Drills | `P` |
| 💤 Snooze | `S` |
| 🚫 Disable | `D` |

These buttons are visually quieter (smaller, outline style, muted border) but always visible — no menu required.

### CJK Character Rendering

The main prompt may be a single Chinese, Japanese, or Korean character or compound. To ensure correct rendering:

- **Recommended font stack**: `"Noto Sans CJK SC", "PingFang SC", "Hiragino Sans", "Malgun Gothic", system-ui`
- **Recommended prompt font size**: 32–36px when content is primarily CJK; 24–28px for mixed or Latin content
- **v1 simplification**: a fixed 32px for all card prompts is acceptable — large enough for CJK, still readable for Latin
- **v2 enhancement** (deferred): detect CJK character presence and apply adaptive sizing (36px for single characters, 24px for longer phrases)

### Mobile Layout

```
┌───────────────────────────────────┐
│  ◉ StudyPuck        Japanese ▾    │
├───────────────────────────────────┤
│  Card Review    7/20       ✕      │  ← session header
│  ─────────────────────────────── │
│                                   │
│           食べる                  │  ← large prompt (32px)
│                                   │
│           to eat                  │  ← meaning
│                                   │
│  1. 私は魚を食べます。            │
│  ┌────────────────────────────┐   │
│  │ 💡 Tabe-ru → "table"      │   │
│  └────────────────────────────┘   │
│  [Common Verbs]                   │
│  ─────────────────────────────── │
│                                   │
│  [ Easy ] [ Medium ] [  Hard  ]   │  ← rating buttons (min 44px tall)
│  📌   💤   🚫                     │  ← icon-only secondary actions
├───────────────────────────────────┤
│   🏠     📥     ▶     💬     ···  │
└───────────────────────────────────┘
```

**Mobile-specific notes:**
- Rating buttons span the full content width as three equal-width side-by-side blocks (minimum 44px height each). Side-by-side layout is preferred at ≥ 360px viewport width.
- Secondary action buttons (`📌`, `💤`, `🚫`) are **icon-only** on mobile (no text labels) to conserve space. Tooltips appear on long-press.
- The card body scrolls vertically if the content is long. The rating controls remain anchored above the bottom tab bar (sticky bottom).

---

## 3. Card States During Review

These are transient states that occur while the card display screen is active.

### Pin Confirmation

After tapping `📌 Pin to Drills` (or pressing `P`):
- A brief toast/snackbar appears at the top of the context pane: **"Pinned to Translation Drills"**
- The card immediately auto-advances to the next card (pin + advance is a single action)
- The `cardsPinnedToDrills` counter in `cardReviewDailyStats` is incremented
- The card's SRS record is NOT updated (no rating is applied)

### Snooze Confirmation

After tapping `💤 Snooze` (or pressing `S`):
- Toast: **"Card snoozed"**
- Auto-advances to next card
- Card's status is set to `Snoozed`; it will not appear until the snooze duration expires
- The `cardsSnoozed` counter is incremented

### Disable Confirmation

After tapping `🚫 Disable` (or pressing `D`):
- Toast: **"Card removed from rotation"**
- Auto-advances to next card
- Card's status is set to `Disabled`
- The `cardsDisabled` counter is incremented

### End Session Confirmation

Tapping `✕ End session` (in the session header) does NOT immediately end the session. Instead:
- A small inline confirmation appears in the session header area (or as a compact popover):

```
  End session?  N cards remain.
  [ End ]   [ Keep reviewing ]
```

- "End" navigates to the Session Complete screen with whatever stats were accumulated
- "Keep reviewing" dismisses the confirmation and returns to the current card
- This applies on both desktop and mobile (tap `✕` on mobile shows the same confirmation)

---

## 4. Session Complete Screen

**Route**: `/[lang]/card-review/complete`

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                    Japanese ▾       [ ZB ]      │
├──────────────────┬────────────────────────────────┬──────────────────────────┤
│                  │  ✓ Session complete             │  Conversation            │
│  ○ Home          │                                │                          │
│  ○ Card Entry    │  ┌──────────────────────────┐  │                          │
│  ▶ Card Review   │  │  Cards reviewed:  25     │  │                          │
│  ○ Trans. Drills │  │  Time:  18 minutes       │  │                          │
│  ○ Cards         │  │  Easy 10 · Med 9 · Hard 6│  │                          │
│  ○ Statistics    │  │  3 cards pinned to Drills│  │                          │
│  ──────────────  │  └──────────────────────────┘  │                          │
│  ○ Settings      │                                │                          │
│                  │  [ Review more             ]   │  ← outline button        │
│                  │                                │                          │
│                  │  [ Go to Translation Drills → ]│  ← primary (highlighted) │
│                  │                                │                          │
│                  │       Back to home             │  ← text link             │
├──────────────────┴────────────────────────────────┴──────────────────────────┤
│  ▸  /pin  /snooze  /next  …                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Context pane sections:**

1. **Heading** — "✓ Session complete" — celebratory but restrained. No confetti animations in v1.
2. **Stats card** — a bordered box (#dee2e6 border, white background) containing:
   - Cards reviewed: N
   - Time: N minutes
   - Breakdown: `Easy N  ·  Medium N  ·  Hard N` (each count in its respective color: green/amber/red for readability)
   - If `cardsPinnedToDrills > 0`: `"N card(s) pinned to Translation Drills"` in a note style
3. **Action buttons** (stacked vertically, left-aligned):
   - `Review more` — outline/secondary button. Starts a new session from the same setup screen.
   - `Go to Translation Drills →` — **primary button if any cards were pinned** (blue #1971c2 background); secondary/outline if no cards were pinned. Navigates to `/[lang]/translation-drills`.
   - `Back to home` — plain text link, centered. Navigates to `/[lang]`.

### Mobile Layout

Same structure as desktop, in a single column. Stats card spans full width. Buttons span full width.

---

## 5. Empty State (No Cards Due)

Shown on the session setup screen when the user has no groups with due cards — i.e., all their groups have 0 due today, or they have no cards at all.

**Route**: `/[lang]/card-review` (same route, empty state branch)

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                    Japanese ▾       [ ZB ]      │
├──────────────────┬─────────────────────────────┬────────────────────────────┤
│                  │  Card Review                 │  Conversation              │
│  ○ Home          │                              │                            │
│  ○ Card Entry    │                              │                            │
│  ▶ Card Review   │         🎉                   │                            │
│  ○ Trans. Drills │                              │                            │
│  ○ Cards         │  You're all caught up!       │                            │
│  ○ Statistics    │                              │                            │
│  ──────────────  │  No cards are due for        │                            │
│  ○ Settings      │  review today.               │                            │
│                  │                              │                            │
│                  │  Next card due:              │                            │
│                  │  Tomorrow, 9:00 AM           │                            │
│                  │                              │                            │
│                  │  [ Go to Translation Drills ]│                            │
│                  │  Add new cards in Card Entry │                            │
├──────────────────┴─────────────────────────────┴────────────────────────────┤
│  ▸  /pin  /snooze  /next  …                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Context pane sections:**

1. **Heading** — "Card Review"
2. **Illustration placeholder** — a centered emoji or SVG illustration placeholder (🎉 in v1)
3. **Message** — "You're all caught up!" (prominent) and "No cards are due for review today." (body text)
4. **Next due** — "Next card due: [date/time]" — shown only when the user has cards in rotation; derived from the minimum `nextDue` value in `cardReviewSrs` across all groups
5. **Suggestions**:
   - `Go to Translation Drills` — primary button
   - `Add new cards in Card Entry` — plain text link

### Mobile Layout

Same structure, single column, full-width button.

---

## Empty States Summary

| Context | Trigger | Empty state content |
|---|---|---|
| Session setup — no groups exist | User has no card groups for the language | "You have no card groups yet. Add cards in Card Entry to get started." — CTA: `Go to Card Entry` |
| Session setup — groups exist, none selected | User has not checked any group | Start Session button is disabled. No inline message needed (button state communicates this). |
| Session setup — groups selected, 0 due | Selected groups have 0 cards due today | "No cards due in selected groups. Next due: [date]." shown below Start button; button disabled. |
| Session setup — no cards due globally | All groups have 0 due cards | Full empty state (Screen 5 above): illustration + catch-up message + next due date |

---

## Accessibility Notes

### Keyboard Navigation

| Key | Action |
|---|---|
| `1` | Rate current card Easy |
| `2` | Rate current card Medium |
| `3` | Rate current card Hard |
| `P` | Pin current card to Translation Drills |
| `S` | Snooze current card |
| `D` | Disable current card |
| `Tab` | Move focus through interactive elements |
| `Enter` / `Space` | Activate focused button |
| `Esc` | Dismiss confirmation dialogs (End session popover) |

### Focus Management

- When a new card loads (after rating), focus moves to the first rating button so keyboard users can immediately rate without re-tabbing.
- The "End session" confirmation popover traps focus until dismissed.
- Toast notifications are rendered in an ARIA live region (`role="status"`, `aria-live="polite"`) so screen readers announce them without interrupting the user.

### Color and Contrast

- Rating buttons (Easy/Medium/Hard) use color as a secondary cue only. The button text labels ("Easy", "Medium", "Hard") communicate the action independently of color. Contrast ratios for white text on green (#2f9e44), amber (#e67700), and red (#e03131) meet or approach WCAG AA; test with the chosen shade.
- Group chips and muted labels (`#868e96`) on white backgrounds fall below WCAG AA for body text; these are decorative/supplemental labels where color contrast AA is not required, but AA should be pursued where feasible.
- The "Card N of N" counter and "✕ End session" link use `#868e96` (very muted). They are not primary actions; their lower contrast is intentional. If users rely on them heavily (validated by research), increase to `#495057`.

### Touch Targets

- All rating buttons: minimum 44×44px touch target (per WCAG 2.5.5 AAA, aligned with Apple HIG and Material Design guidelines)
- Secondary action buttons: minimum 36px height on mobile; icon-only variants include a tooltip via `title` attribute and long-press tooltip on mobile
- Group rows in session setup: minimum 44px height (the entire row is a tap target)

### Screen Reader Semantics

- Rating buttons: `<button>` elements with visible labels. No ARIA needed beyond the label.
- Card prompt: wrapped in a landmark or heading if structurally appropriate; the prompt and meaning should be associated (e.g., `<dl>` or labeled sections) so screen readers convey the relationship.
- Group list: `<ul>` with `<li>` per row; checkbox `<input type="checkbox">` with visible label matching the group name.
- Session header "Card 7 of 20": rendered in an ARIA live region that updates on each card advance so screen reader users hear the progress without having to navigate to it.
- Progress: optionally use `aria-valuenow`, `aria-valuemin`, `aria-valuemax` on a hidden element to expose progress to assistive technology without showing a visual progress bar.
