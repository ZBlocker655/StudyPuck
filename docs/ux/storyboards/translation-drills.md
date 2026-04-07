# Translation Drills Storyboard

> **Status**: Authoritative  
> **Depends on**: [translation-drills.md requirements](../../requirements/functionality/translation-drills.md), [information-architecture.md](../information-architecture.md), [global-navigation.md](./global-navigation.md), [llm-command-interface.md](./llm-command-interface.md)

This document specifies every screen and interaction in the Translation Drills feature — the pre-drill context overview, the active drill conversation, context management, card dismissal, drawing new cards, and the empty context state — across desktop and mobile breakpoints.

---

## Design Decisions

The following decisions were made during the UX design process. Each is captured here as the authoritative record of intent.

| # | Decision | Rationale |
|---|---|---|
| 1 | **No separate pre-drill setup screen** — Translation Drills has one main screen. When there is no active challenge, the conversation pane shows an empty state and a "New Challenge" button. The user starts drilling by clicking "New Challenge" or typing in the command bar. | Reduces friction. The context overview IS the home screen. There is no separate "setup" step to pass through. |
| 2 | **Command bar IS the translation input** — per the decision in `llm-command-interface.md` (Option A), the omnipresent command bar accepts translation attempts, follow-up questions, and slash commands in Translation Drills. There is no separate text box. | One mental model, no duplicated inputs. |
| 3 | **Translation Drills: conversation pane is dominant on desktop** — default split is ~60–65% conversation pane (right), ~35–40% context pane (left). This is the inverse of all other mini-apps. | Translation practice is the primary activity. The conversation dominates screen space; the card list is reference material. |
| 4 | **Context pane is collapsible for active recall** — the user can collapse the context pane (left) to a thin strip so the card vocabulary is hidden. Expanding it reveals the card list. This supports both active recall practice and reference-visible practice. | Different learners have different recall preferences. The collapse mechanism from `llm-command-interface.md` serves double duty here. |
| 5 | **Card game motif for draw piles** — each group section shows a face-down card stack visual representing the draw pile. The stack height scales with remaining cards (tall/thick for many, short for few). An empty pile shows as a dashed outline of the same shape. | Reinforces the "draw pile" mental model from the requirements. Intuitive. Visually communicates scarcity vs. abundance without a number. |
| 6 | **Tap the pile to draw — no confirmation** — clicking/tapping the draw pile visual immediately draws the top card from that group and adds it to the drawn cards list. No modal or confirmation step. | Drawing a card is a lightweight, reversible action. A confirmation step would break the flow and add unnecessary friction. |
| 7 | **Card rows show prompt text only** — within a group section, each drawn card shows only its front prompt text (e.g., `经历`). No group label, SRS data, or additional metadata. | Clean and minimal. Group context is already provided by the section header. |
| 8 | **Snoozed cards shown greyed-out with clock icon** — snoozed cards remain in their group section but are visually de-emphasized. A `🕐` clock icon signals the snooze state. | Keeps the user aware of snoozed cards without burying them in a separate panel. |
| 9 | **Per-card actions revealed on hover/tap** — hovering a card row (or tapping on mobile) reveals a small action row: `💤 Snooze`, `✕ Dismiss`, `···` more. No persistent action buttons cluttering the list. | Keeps the card list clean. Actions are discoverable but secondary. |
| 10 | **Current challenge: fixed header inside the conversation pane** — the English sentence to translate is shown in a visually distinct fixed banner at the top of the conversation pane, separate from the scrollable message history. A "New Challenge" button lives next to it. | Keeps the challenge always visible while the user scrolls through feedback. The header is a navigation landmark, not a message bubble. |
| 11 | **Dismiss scheduling: "Tomorrow" hardcoded + SRS-determined options** — the dismiss modal shows "Tomorrow" as a fixed first option, followed by a short set of SRS-calculated return intervals (e.g., 5 days, 2 weeks, 1 month). Labels are human-readable, no mention of "algorithm." | "Tomorrow" covers the most urgent use case. SRS options give meaningful variety without overwhelming. Plain language keeps it accessible. |
| 12 | **Mobile: conversation full-screen by default** — Translation Drills overrides the default mobile context-first layout. The conversation is the primary view. The card context is accessible via a "📚 Cards" button that slides a bottom sheet up from below. | The conversation is the core activity on mobile. Context is reference material — accessible but not dominant. |
| 13 | **Empty state: universal full-screen onboarding overlay** — shown when no groups have been added to the draw pile, whether first visit or after all cards are dismissed. Universal message: "Add some groups to start drilling." | One clear entry point regardless of how the user got to the empty state. |

---

## 1. Translation Drills Main Screen (Context Overview / Pre-Drill)

**Route**: `/[lang]/translation-drills`

This is the primary screen for Translation Drills. Before an active challenge is in progress, the conversation pane shows an empty state and a "New Challenge" button. The user sees their card context on the left and starts drilling by clicking "New Challenge" or typing in the command bar.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                        Chinese ▾       [ ZB ]        │  ← top bar
├──────────────────┬──────────────────────────┬───────────────────────────────────┤
│                  │                          │  Conversation        [New Challenge]│
│  ○ Home          │  Translation Drills      ├───────────────────────────────────┤
│  ○ Card Entry    │  ─────────────────────── │                                   │
│  ○ Card Review   │  HSK2                    │                                   │
│  ▶ Trans. Drills │  ┌──────────────────┐    │       No active challenge         │
│  ○ Cards         │  │ 经历             │    │                                   │
│  ○ Statistics    │  │  hover: 💤 ✕ ···│    │   Click "New Challenge" or type   │
│  ──────────────  │  └──────────────────┘    │   in the bar below to begin.      │
│  ○ Settings      │  ┌──────────────────┐    │                                   │
│                  │  │ 学习             │    │                                   │
│                  │  └──────────────────┘    │                                   │
│                  │  ┌──────────────────┐    │                                   │
│                  │  │ 🕐 感觉 (snoozed)│    │                                   │  ← greyed-out, clock icon
│                  │  └──────────────────┘    │                                   │
│                  │                          │                                   │
│                  │  [face-down pile ▓▓▓▓]   │                                   │  ← draw pile (tall stack)
│                  │  HSK2 draw pile          │                                   │
│                  │                          │                                   │
│                  │  ─────────────────────── │                                   │
│                  │  Conversational Chinese   │                                   │
│                  │  ┌──────────────────┐    │                                   │
│                  │  │ 把握             │    │                                   │
│                  │  └──────────────────┘    │                                   │
│                  │                          │                                   │
│                  │  [face-down pile ▓▓]     │                                   │  ← smaller pile (fewer cards)
│                  │  Conv. Chinese draw pile │                                   │
│                  │                          │                                   │
│                  │  ─────────────────────── │                                   │
│                  │  Old Group               │                                   │
│                  │  (no cards drawn)        │                                   │
│                  │  [- - - - - - - - -]     │                                   │  ← empty pile (dashed outline)
│                  │  Old Group draw pile     │                                   │
├──────────────────┴──────────────────────────┴───────────────────────────────────┤
│  ▸  Ask anything or type / for commands...                                  [↵]  │  ← command bar
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Context pane sections (top to bottom):**

1. **Heading** — "Translation Drills" at the top of the context pane.
2. **Group sections** — one section per group that has been added to the draw pile. Each section:
   - **Group header** — group name in medium-weight text; visual divider below
   - **Drawn card rows** — one row per drawn card, showing prompt text only. On hover/tap, a small action row fades in below: `💤 Snooze` · `✕ Dismiss` · `···` (more actions)
   - **Snoozed card rows** — same as drawn cards but visually greyed/dimmed with a `🕐` clock icon prepended
   - **Draw pile** — a face-down card stack graphic at the bottom of the section. Stack height scales with remaining cards. Empty pile shows as a dashed outline of the same shape. Tapping/clicking draws the next card immediately.
3. **No groups state** — when no groups are configured as draw piles, an empty state message replaces the group sections (see Screen 6).

**Conversation pane (right, wider ~60–65%):**

- Heading: "Conversation" with a "New Challenge" button aligned right
- Empty state: centered message `"No active challenge — click New Challenge or type below to begin."`

---

## 2. Active Drill Conversation Screen

**Route**: `/[lang]/translation-drills` (same route, different state)

Once a challenge is active (user clicked "New Challenge" or typed in command bar), the conversation pane shows a fixed challenge header and a scrollable message thread.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                                        Chinese ▾       [ ZB ]        │
├──────────────────┬──────────────────────────┬───────────────────────────────────┤
│                  │                          │  Conversation        [New Challenge]│
│  ▶ Trans. Drills │  Translation Drills      ├───────────────────────────────────┤
│  (sidebar        │  ─────────────────────── │ ┌──────────────────────────────┐  │  ← fixed challenge header
│   omitted for    │  HSK2                    │ │  🎯 Translate to Chinese:     │  │
│   brevity)       │  ┌──────────────────┐    │ │  "She has been living here    │  │
│                  │  │ 经历             │    │ │   for many years."            │  │
│                  │  └──────────────────┘    │ └──────────────────────────────┘  │
│                  │  ┌──────────────────┐    ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  ← scrollable area begins
│                  │  │ 学习             │    │                                   │
│                  │  └──────────────────┘    │  ┌─────────────────────────────┐ │  ← LLM message (left)
│                  │                          │  │ LLM  Good try! One note:    │ │
│                  │  [face-down pile ▓▓▓▓]   │  │      "经历" implies lived   │ │
│                  │                          │  │      experience here, so…   │ │
│                  │  ─────────────────────── │  └─────────────────────────────┘ │
│                  │  Conversational Chinese   │             ┌───────────────────┐ │  ← user message (right)
│                  │  ┌──────────────────┐    │             │ You  她在这里经历 │ │
│                  │  │ 把握             │    │             │      了很多年。   │ │
│                  │  └──────────────────┘    │             └───────────────────┘ │
│                  │                          │  ┌─────────────────────────────┐ │
│                  │  [face-down pile ▓▓]     │  │ LLM  Excellent! 经历 used  │ │
│                  │                          │  │      naturally. Here's a    │ │
│                  │                          │  │      tip on tone…          │ │
│                  │                          │  └─────────────────────────────┘ │
├──────────────────┴──────────────────────────┴───────────────────────────────────┤
│  ▸  Ask anything or type / for commands...                                  [↵]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Challenge header (fixed, not scrollable):**
- Sits at the very top of the conversation pane, below the "Conversation" heading row
- Visually distinct background (e.g., soft brand-tinted fill, slightly elevated with a shadow separator)
- Contents: `🎯 Translate to Chinese:` label, followed by the English sentence in medium-weight text
- "New Challenge" button in the conversation pane heading row (not inside the challenge header itself)

**Conversation thread (scrollable, below the challenge header):**
- LLM messages: left-aligned bubbles
- User messages: right-aligned bubbles
- `— New conversation —` divider with muted text appears when a reset occurs (new challenge requested)
- Thread scrolls independently; the challenge header does not scroll away

**Context pane (left, ~35–40%):**
- Same card list as Screen 1
- Collapsible to a thin strip via the divider (drag or double-click). When collapsed, shows a `📚` icon + optional badge if cards have been drawn recently
- When collapsed, the conversation pane expands to full width of the content area

---

## 3. Context Management Panel (During Drill)

Context management happens within the **left context pane** — there is no separate drawer. All card actions are accessible directly from the context pane without leaving the active drill.

### Card Row — Default State

```
  ┌────────────────────────────────────┐
  │  经历                              │
  └────────────────────────────────────┘
```

### Card Row — Hover / Tap State

```
  ┌────────────────────────────────────┐
  │  经历                              │
  │  💤 Snooze   ✕ Dismiss   ···      │
  └────────────────────────────────────┘
```

The action row fades in with a subtle transition. On desktop it appears on hover; on mobile it appears on tap (a second tap dismisses it). Actions:

| Action | Behavior |
|---|---|
| `💤 Snooze` | Card is immediately snoozed. The card row remains in place but becomes greyed-out with a `🕐` icon. No modal. A subtle toast confirmation: "经历 snoozed." |
| `✕ Dismiss` | Opens the Dismiss / Schedule modal (Screen 4). The card row is not removed yet — removal happens on confirm. |
| `···` More | Opens a small popover with additional options: "View card detail", "Disable card", "Cancel". "View card detail" opens the Card Detail drawer (Feedly motif from the right). |

### Draw Pile Visual — States

```
  Full pile (5+ cards):        Small pile (1–2 cards):      Empty pile:
  ┌──────────────────┐         ┌──────────────────┐         ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│              (dashed)
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         └──────────────────┘         └ ─ ─ ─ ─ ─ ─ ─ ─ ┘
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         (low, thin stack)             (no more cards)
  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
  └──────────────────┘
  (tall, thick stack)
```

Tapping the pile (full or small) **immediately** draws the top card from the group's pile and adds it to the drawn cards list. The new card appears with a brief entrance animation (fade in). No confirmation dialog. If the pile transitions from small to empty, the visual updates to the dashed outline.

### `/command` Equivalents During Drill

All context management actions are also accessible via the command bar:

| Command | Action |
|---|---|
| `/snooze` | Snooze the most recently focused card, or prompt to specify which card |
| `/dismiss` | Dismiss a card (opens scheduling modal) |
| `/draw [group]` | Draw the next card from the specified group |
| `/context` | List all active cards in the current context |

---

## 4. Dismiss / Schedule a Card

When the user taps `✕ Dismiss` on a card row, a compact modal overlays the screen.

### Modal Layout

```
  ┌────────────────────────────────────────────────────┐
  │  Dismiss Card                                   ✕  │
  │  ─────────────────────────────────────────────────  │
  │  经历                                               │
  │  This card will leave your active context and       │
  │  return after the scheduled interval.               │
  │  ─────────────────────────────────────────────────  │
  │  When should it return?                             │
  │                                                     │
  │  ○  Tomorrow                                        │
  │  ●  In 5 days          ← SRS default / recommended │
  │  ○  In 2 weeks                                      │
  │  ○  In 1 month                                      │
  │                                                     │
  │  ─────────────────────────────────────────────────  │
  │                        [ Cancel ]  [ Dismiss ]      │
  └────────────────────────────────────────────────────┘
```

**Modal details:**

- **Card display**: The prompt text of the card being dismissed is shown prominently.
- **Explanation copy**: One line of plain-language explanation. No technical SRS terminology.
- **Scheduling options**: Radio buttons.
  - `Tomorrow` — always present, hardcoded.
  - The remaining 3 options are SRS-calculated return intervals, shown as human-readable durations (e.g., "In 5 days", "In 2 weeks", "In 1 month"). The SRS default/recommended option is pre-selected and visually marked.
  - Labels never say "algorithm" — they express concrete durations.
- **Actions**: `Cancel` (secondary button, closes modal, no action) and `Dismiss` (primary button, confirms dismissal and removes the card from active context).
- **Dismiss behavior**: After confirming, the card row is removed from the context pane with a fade-out animation. A brief toast: "经历 dismissed — returns in 5 days."

---

## 5. Drawing Cards from a Pile

Drawing cards requires no dedicated screen or modal. The interaction is:

1. User sees a group section with a draw pile visual (face-down card stack).
2. User taps/clicks the pile.
3. The top card is immediately drawn. The new card appears in the drawn cards list for that group with a brief entrance animation.
4. If the pile is now empty, the visual updates to a dashed outline.

**If the context pane is collapsed** (thin strip), the user must first expand it to access the draw pile. Alternatively, they can type `/draw [group name]` in the command bar to draw a card without opening the pane.

**Group balance guidance**: If the active context has more than ~10 cards total, a subtle inline callout may appear below the group sections: "Large context may reduce drill focus. Consider dismissing cards you've mastered." This is informational only, never blocking.

---

## 6. Empty Context State

**Shown when**: The user arrives at Translation Drills and no groups have been configured as draw piles (first visit, or all groups were removed).

A full-screen overlay covers the Translation Drills main screen. It is informational, not alarming.

### Overlay Layout

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │                          📚                                         │
  │                                                                      │
  │              Add groups to start drilling                            │
  │                                                                      │
  │    Translation Drills uses your vocabulary cards as practice         │
  │    material. To get started, add one or more card groups to          │
  │    your drill context.                                               │
  │                                                                      │
  │    Cards are drawn from those groups into your active context        │
  │    — like a hand of cards in a card game.                            │
  │                                                                      │
  │              [ Go to Cards ]    [ Learn more ]                       │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘
```

**Overlay details:**
- The overlay appears over the Translation Drills main screen (which has no cards, so both panes are empty underneath)
- Not dismissable by clicking outside — the user must take an action or navigate away
- `Go to Cards` — navigates to `/[lang]/cards` where the user can configure which groups are draw pile sources
- `Learn more` — expands inline copy or links to a help article explaining the draw pile concept

**Same overlay shown when all drawn cards are dismissed** (no more cards, pile also empty): The overlay text is identical. The message is universal — "Add groups to start drilling" works for both first-time and empty-again states.

---

## Mobile Layouts

Translation Drills overrides the default mobile context-first layout. On mobile, the **conversation is the primary view**.

### Mobile — Active Drill (Default View)

```
  ┌──────────────────────────────┐
  │  ◉ StudyPuck   Chinese ▾     │  ← top bar
  ├──────────────────────────────┤
  │ ┌────────────────────────────┤  ← fixed challenge header
  │ │  🎯 Translate to Chinese:  │
  │ │  "She has been living here │
  │ │   for many years."         │
  │ └────────────────────────────┤
  │                              │
  │  ┌──────────────────────┐    │  ← LLM message
  │  │ LLM  Good try!…      │    │
  │  └──────────────────────┘    │
  │          ┌───────────────┐   │  ← user message
  │          │ You  她在这…  │   │
  │          └───────────────┘   │
  │                              │
  │  [New Challenge]   [📚 Cards]│  ← action row (sticky above command bar)
  ├──────────────────────────────┤
  │  Ask anything or /...   [↵]  │  ← command bar
  ├──────────────────────────────┤
  │  🏠    📥   🃏   💬   ···   │  ← bottom tab bar
  └──────────────────────────────┘
```

**Mobile-specific elements:**
- **Fixed challenge header**: Same as desktop — sits pinned at the top of the content area, below the top bar
- **Conversation thread**: Scrollable, fills the remaining space
- **Sticky action row**: A thin row directly above the command bar containing two buttons: `[New Challenge]` and `[📚 Cards]`. These stay visible without scrolling.
- **`[📚 Cards]` button**: Triggers the card context bottom sheet (see below)

### Mobile — Card Context Bottom Sheet

Triggered by tapping `[📚 Cards]` button.

```
  ┌──────────────────────────────┐
  │  ◉ StudyPuck   Chinese ▾     │
  ├──────────────────────────────┤
  │  (conversation dimmed)       │
  │                              │
  ├──────────────────────────────┤  ← drag handle
  │  ▬  Cards in context         │
  ├──────────────────────────────┤
  │  HSK2                        │
  │  ┌──────────────────────┐    │
  │  │ 经历                 │    │
  │  │ tap: 💤 ✕ ···        │    │
  │  └──────────────────────┘    │
  │  ┌──────────────────────┐    │
  │  │ 学习                 │    │
  │  └──────────────────────┘    │
  │  [face-down pile ▓▓▓▓]       │
  │  ─────────────────────────── │
  │  Conversational Chinese      │
  │  ┌──────────────────────┐    │
  │  │ 把握                 │    │
  │  └──────────────────────┘    │
  │  [face-down pile ▓▓]         │
  ├──────────────────────────────┤
  │  Ask anything or /...   [↵]  │
  ├──────────────────────────────┤
  │  🏠    📥   🃏   💬   ···   │
  └──────────────────────────────┘
```

- Drag handle at top — swipe down to dismiss
- Tap backdrop (dimmed conversation) to dismiss
- Sheet is draggable from ~50% to ~85% of screen height
- Per-card actions work the same as desktop (tap card to reveal actions)
- Tapping the draw pile draws a card (same immediate behavior as desktop)

### Mobile — Empty Context State

Same full-screen overlay as desktop, adapted for mobile proportions. The overlay covers the full screen (above the bottom tab bar and command bar). Same copy, same two CTA buttons stacked vertically.

---

## Conversation Resets

As defined in `llm-command-interface.md`, Translation Drills resets the conversation when the user requests a new challenge.

**Reset triggers:**
- Clicking "New Challenge" button
- Typing `/next` in the command bar
- (Future) Keyboard shortcut

**Reset behavior:**
1. The challenge header updates to the new English sentence
2. The conversation thread is cleared — a `— New conversation —` divider briefly appears before the thread clears
3. The LLM context is wiped; the new challenge becomes the fresh starting context
4. The command bar returns to idle state

---

## Accessibility Notes

- Challenge header has `role="status"` and `aria-live="polite"` — screen readers announce new challenges
- Dismiss modal is a proper `role="dialog"` with focus trap
- Draw pile visuals include `aria-label="[Group name] draw pile — tap to draw a card"` (or "empty" variant)
- Card action row is keyboard-navigable — Tab into the row, arrow keys between actions, Enter to activate
- All touch targets meet 44×44px minimum
- Snoozed card state is communicated via `aria-label` (not just color/opacity)
- "New Challenge" button has `aria-live` so screen readers announce when a challenge loads

---

## Slash Command Reference (Translation Drills Context)

| Command | Description |
|---|---|
| `/next` | Request the next translation challenge (resets the current conversation) |
| `/dismiss` | Dismiss the most recently active card from context (opens scheduling modal) |
| `/draw [group]` | Draw the next card from the specified group into context |
| `/context` | List all currently active cards in the conversation pane |
| `/snooze` | Snooze the current card (most recently focused in context pane) |

*Global commands (`/add`, `/lang`, `/help`) are also available. See `llm-command-interface.md`.*

---

## References

- [translation-drills.md requirements](../../requirements/functionality/translation-drills.md)
- [information-architecture.md](../information-architecture.md) — screen inventory, Feedly drawer pattern, Translation Drills route
- [llm-command-interface.md](./llm-command-interface.md) — command bar design, side-by-side pane system, Option A decision, conversation reset behavior
- [global-navigation.md](./global-navigation.md) — nav shell, mobile tab bar, breakpoints
- [Wireframes: translation-drills.excalidraw](./translation-drills.excalidraw)
