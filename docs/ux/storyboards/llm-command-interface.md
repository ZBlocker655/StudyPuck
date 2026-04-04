# LLM Command Interface

> **Status**: Authoritative  
> **Depends on**: [global-navigation.md](./global-navigation.md), [information-architecture.md](../information-architecture.md)

This document specifies the omnipresent LLM command bar — its placement, visual states, interaction model, and command set — across all screens and breakpoints.

---

## Design Philosophy

The command bar is the **single, unified input** for everything conversational and command-driven in StudyPuck. It is:

- **Always present**: visible on every authenticated screen at all times
- **Context-aware**: its behavior, scope, and LLM system prompt adapt to the current mini-app and the specific item in focus
- **The only command input**: there is no secondary "chat box" or separate input for Translation Drills — the command bar IS the translation drill input when you are in that context
- **Not redundant with navigation**: the command bar does not duplicate the mini-app switcher or language switcher; those live in the nav shell (see `global-navigation.md`)

### Principle #1 — Short, Bounded Conversations

Conversations in StudyPuck are **intentionally short**. The command bar is not a general-purpose chatbot. Specific application events trigger a hard **conversation reset** — clearing both the visible thread and the LLM's conversation history from the prompt.

Each mini-app's storyboard defines its own reset events. The Translation Drills reset event is specified here (see below). Other resets will be defined in their respective storyboard documents.

### Principle #2 — Two Competing Views

The content area always holds two competing views:

| View | Description |
|---|---|
| **Conversation view** | The live exchange thread between the user and the LLM |
| **Context view** | The mini-app's primary UI (cards, inbox, session, etc.) |

**On desktop**, these two views sit **side by side** — context left, conversation right. The divider between them can be dragged to resize. One side is the "wider" (dominant) pane; the other is "narrower" (minified). Fully collapsing the narrower pane reduces it to a thin strip (~40px) showing just an icon and optional badge. A toggle button on the divider swaps which pane is wider.

**On mobile**, the views are stacked. The context view fills the screen by default. When a conversation is active, a **draggable bottom sheet** slides up from above the command bar, displaying the conversation thread. The context view behind it dims slightly but remains visible. The user can drag the sheet up to expand it or drag it down to dismiss it.

**Default dominant pane by mini-app (desktop):**

| Mini-App / Context | Wider Pane by Default |
|---|---|
| Translation Drills | Conversation pane (~60–65%) |
| All other mini-apps | Context pane (~60–65%) |

The exact content of the narrower/minified pane (what key information it shows when compressed) is defined per mini-app in each mini-app's storyboard.

---

## Translation Drills Relationship: Decision

**Chosen: Option A — Single context-aware command bar**

The command bar is the same component on every screen, including Translation Drills. When you are in Translation Drills, the command bar accepts your translation attempt, follow-up questions, and slash commands — all in one input. The LLM handles intent disambiguation based on the active conversation context.

**Rationale:**
1. **One mental model**: users always know where to type. There is no "translation box" vs. "command box" distinction to learn.
2. **Screen real estate**: two separate inputs on the same screen would be cluttered and wasteful.
3. **Extensibility**: a single context-aware interface scales naturally as LLM capabilities grow. Adding AI-assisted tools in Card Entry or grammar assistance in Card Review does not require introducing a new UI pattern.

**The UX risk addressed**: In Translation Drills, users might wonder whether they are submitting a translation or asking a meta-question. This is handled at the LLM level — the system prompt for Translation Drills tells the model to treat free-text input as a translation attempt unless it is clearly a conversational follow-up or a slash command. The context view (current challenge) is always visible and provides visual continuity.

### Translation Drills Conversation Reset

In Translation Drills:

- The **current challenge** (the English sentence to translate) is always pinned in the context view and included in the LLM's system prompt.
- Free-text typed in the command bar is interpreted as a translation attempt or follow-up about the current challenge.
- When the user issues a **new challenge** (via the "New Challenge" button, the `/next` command, or the equivalent hotkey), the conversation history is wiped and a new conversation begins with the new challenge as its context.
- This gives the LLM a clean slate for each exercise, preventing previous exchange history from polluting its prompt.

---

## Visual Placement

### Desktop

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                               Chinese ▾        [ ZB ]        │  ← top bar
├──────────────────┬───────────────────────────────┬────────────────────────┤
│                  │                               │                        │
│  ▶ Card Review   │   CONTEXT VIEW                │  Conversation          │
│  ○ Card Entry    │   (~60%, wider by default)    │  (~40%, narrower)      │
│  ○ Trans. Drills │                               │                        │
│  ○ Cards         │                               │  [no history yet]      │
│  ○ Statistics    │                               │                        │
│                  │                    ◀▶          │                        │  ← draggable divider
│  [ + ]           ├───────────────────────────────┴────────────────────────┤
│  ─────────────── │   Ask anything or type / for commands...           [↵] │  ← command bar
│  ○ Settings      │                                                         │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

*`◀▶` = draggable divider between the two panes. Drag to resize; double-click (or drag fully) to collapse the narrower pane to a thin strip.*

- **Position**: The command bar spans the full width of the content area, pinned to the bottom — below both side-by-side panes
- **Spans**: Content area only — does not extend under the nav sidebar
- **Always visible**: command bar is not hidden when drawers open (Feedly drawers slide in from the right above the command bar level)
- **Conversation pane collapsed**: Reduces to a ~40px-wide strip on the right edge showing a 💬 icon and an unread-response badge if applicable. Clicking it reopens the pane.

### Mobile

```
Default (no active conversation):           With conversation bottom sheet open:
┌──────────────────────────────┐            ┌──────────────────────────────┐
│  ◉ StudyPuck   Chinese ▾     │            │  ◉ StudyPuck   Chinese ▾     │
├──────────────────────────────┤            ├──────────────────────────────┤
│                              │            │  CONTEXT UI (dimmed)         │
│                              │            │  (visible behind sheet)      │
│      CONTEXT UI              │            │                              │
│      (full width)            │            ├──────────────────────────────┤  ← drag handle
│                              │            │  ▬  (swipe down to dismiss)  │
│                              │            │                              │
│                              │            │  Conversation thread         │
│                              │            │  (scrollable)                │
│                              │            │                              │
├──────────────────────────────┤            ├──────────────────────────────┤
│  Ask anything or /...   [↵]  │            │  Ask anything or /...   [↵]  │
├──────────────────────────────┤            ├──────────────────────────────┤
│  🏠    📥   🃏   💬   ···   │            │  🏠    📥   🃏   💬   ···   │
└──────────────────────────────┘            └──────────────────────────────┘
```

- **Position**: Fixed above the bottom tab bar
- **Bottom sheet behavior**: When a conversation response arrives (or the user swipes up on the command bar area), the conversation bottom sheet slides up from above the command bar. The context UI behind it dims slightly (~40% opacity). The sheet is draggable — drag up to expand to ~75% of screen height, drag down to dismiss.
- **Keyboard behavior**: When the soft keyboard opens, the **bottom tab bar hides** to reclaim space. The command bar rises with the keyboard, remaining immediately above it. If the bottom sheet was open, it stays open above the command bar. The tab bar reappears when the keyboard is dismissed.

---

## The Side-by-Side Pane System (Desktop)

### Pane Sizing

The content area (right of the nav sidebar) is split into two horizontal panes separated by a draggable divider:

| Pane | Default width (most mini-apps) | Default width (Translation Drills) |
|---|---|---|
| Context pane (left) | ~60–65% | ~35–40% |
| Conversation pane (right) | ~35–40% | ~60–65% |

The divider can be dragged freely. The panes have minimum widths to prevent either from becoming unusably narrow (~200px each).

### Pane Toggle

A **swap icon** (⇄) on the divider expands whichever pane is currently narrower to its default "wider" ratio, and collapses the other. Double-clicking the divider performs the same action. This gives a quick full-swap without drag.

### Collapsing the Conversation Pane

Dragging the divider fully to the right edge collapses the conversation pane to a **~40px thin strip** at the right edge of the content area. The strip shows:
- A 💬 chat icon
- A badge with the number of unread LLM responses (if any)

Clicking the strip re-expands the pane to its last used width.

### Auto-Expand Behavior

When the user sends **free text** (non-slash-command content) and the conversation pane is currently collapsed (thin strip), the pane **automatically expands** to its default ratio so the response is visible.

Slash commands that generate conversational responses (e.g., `/help`) also auto-expand the conversation pane. Pure-action commands (e.g., `/next`, `/snooze`) do **not** auto-expand — they execute silently with no pane change.

### Mobile Pane Behavior

On mobile there are no side-by-side panes. The conversation appears as a **draggable bottom sheet** (see Visual Placement → Mobile above). Auto-expand behavior maps to: the bottom sheet slides up automatically when a conversational response arrives.

---

## Command Bar Component

### Anatomy

```
┌──────────────────────────────────────────────────────────┐
│  Ask anything or type / for commands...              [↵]  │
└──────────────────────────────────────────────────────────┘
```

| Zone | Contents |
|---|---|
| Input field | Placeholder text when empty; user's typed text when active |
| Submit button | `↵` arrow icon (or Enter key). Always tappable on mobile. Hidden on desktop (Enter key implied). |

### Visual States

#### 1. Idle

```
┌──────────────────────────────────────────────────────────┐
│  Ask anything or type / for commands...                   │
└──────────────────────────────────────────────────────────┘
```

- Single-line height
- Placeholder text dimmed/muted
- No cursor

#### 2. Focused

```
┌──────────────────────────────────────────────────────────┐
│  █                                                   [↵]  │
└──────────────────────────────────────────────────────────┘
```

- Single-line height (expands up to ~3 lines for long input)
- Cursor visible
- Border highlights to indicate active focus (matches NFR accessibility requirements)
- Submit button `[↵]` becomes tappable

#### 3. Command Mode (after typing `/`)

```
┌────────────────────────────────────────────────────────────────────┐
│  /pin ↵ to select                                             [↵]   │
├────────────────────────────────────────────────────────────────────┤   ← autocomplete panel (above)
│  ▶ /pin     — Pin this card to Translation Drills context           │
│    /process — Open processing workspace for next inbox item         │
│    /next    — Move to next card in session                          │
│    /help    — List available commands                               │
└────────────────────────────────────────────────────────────────────┘
```

*(Autocomplete panel floats above the command bar — see Command Autocomplete section below.)*

#### 4. Waiting for Response

```
┌──────────────────────────────────────────────────────────┐
│  ⠿  Thinking...                                           │
└──────────────────────────────────────────────────────────┘
```

- Input is disabled
- Animated spinner / "Thinking…" text
- Submit button replaced by a cancel `✕` button (allows aborting the request)

#### 5. Response Displayed

The command bar returns to its idle state. The LLM response appears in the **conversation pane** (desktop: the right pane auto-expands if it was collapsed; mobile: the bottom sheet slides up). The user reads the response there, not inline in the command bar.

---

## Conversation Panel

### Structure (Desktop — Expanded Pane)

The conversation pane lives to the right of the context pane. It has a header, a scrollable message thread, and no input of its own (input is always in the command bar at the bottom).

```
┌───────────────────────────────────────┐
│  Conversation                    [⇄]  │  ← pane header; ⇄ swaps pane widths
├───────────────────────────────────────┤
│                                       │
│  ┌───────────────────────────────┐    │
│  │ LLM  "Great question! 经历    │    │  ← LLM message (left-aligned)
│  │       implies a personal…"    │    │
│  └───────────────────────────────┘    │
│                  ┌──────────────────┐ │
│                  │ You  "What's the │ │  ← user message (right-aligned)
│                  │  difference?"    │ │
│                  └──────────────────┘ │
│                                       │
└───────────────────────────────────────┘
```

- **Scrollable**: conversation history scrolls within the pane
- **Message bubbles**: LLM messages left-aligned; user messages right-aligned
- **Reset indicator**: a subtle divider with label "— New conversation —" marks conversation resets
- **`[⇄]`** button: swaps pane widths (same as the swap icon on the divider)

### Structure (Desktop — Collapsed Thin Strip)

```
┌─────┐
│ 💬  │  ← chat icon
│  2  │  ← unread badge (if applicable)
│     │
└─────┘
```

Clicking the strip re-expands the pane to its last width.

### Structure (Mobile — Bottom Sheet)

```
┌──────────────────────────────────────┐
│  ▬  (drag handle — swipe down to     │  ← sheet header
│       dismiss)                       │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ LLM  "Translate: 'She has      │  │
│  │       been living here…'"      │  │
│  └────────────────────────────────┘  │
│             ┌──────────────────────┐ │
│             │ You  "她在这里住了…" │ │
│             └──────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

- Drag handle at top for swipe-to-dismiss
- Tap outside the sheet (on the dimmed context behind it) to dismiss
- Sheet height is user-draggable from ~40% to ~80% of screen height

### Conversation Reset

When an application event triggers a reset:
1. The conversation pane's message history is cleared from the visible thread
2. The LLM's conversation history is cleared from the active prompt context
3. A subtle "— New conversation —" divider may briefly appear to confirm the reset
4. The pane shows its empty state: "No conversation yet" on desktop; the bottom sheet collapses on mobile

**Known reset events (to be completed per mini-app storyboard):**

| Mini-App | Reset Trigger |
|---|---|
| Translation Drills | User requests a new challenge (button, `/next`, hotkey) |
| All others | TBD in respective storyboard documents |

---

## Command Autocomplete

### Trigger

Typing `/` as the first character of the input opens the autocomplete panel. Subsequent characters filter the list in real time.

### Appearance

The autocomplete panel **floats above** the command bar, anchored to the left edge of the input. On desktop it appears in the space above the command bar spanning the full content-area width. On mobile it appears above the command bar within the bottom sheet or main screen area.

```
┌──────────────────────────────────────────────────────────────┐
│  ▶ /pin     — Pin this card to Translation Drills context     │  ← highlighted item
│    /process — Open processing workspace for next inbox item   │
│    /next    — Move to next card in session                    │
│    /help    — List available commands                         │
└──────────────────────────────────────────────────────────────┘
          ↑ floats above the command bar
┌──────────────────────────────────────────────────────────────┐
│  /pin                                                   [↵]   │
└──────────────────────────────────────────────────────────────┘
```

### Filtering

As the user types after `/`, the list narrows to matching commands:

- Typing `/p` shows: `/pin`, `/process`
- Typing `/pi` shows: `/pin` only
- No match: panel closes; text is treated as freeform (may still be valid input depending on context)

### Keyboard Navigation

| Key | Action |
|---|---|
| `↑` / `↓` arrow keys | Move selection up/down in the list |
| `Enter` or `Tab` | Select highlighted command, populate the input |
| `Escape` | Close the autocomplete panel without selecting |
| Any character | Continues filtering the list in real time |

### Command Description

Each autocomplete entry shows:
- **Command name** (`/pin`)
- **Em dash separator**
- **Brief description** (one line, plain language)

Commands from the current context appear first. Global commands appear below, in a visually de-emphasized group.

---

## Command Set

### Global Commands (Available on All Screens)

| Command | Description |
|---|---|
| `/add [text]` | Add a note to the inbox for the current language. If text is provided, submits immediately. If omitted, opens the Quick-Add Note drawer. |
| `/lang [language]` | Switch to the specified language. If no argument is given, lists available languages. |
| `/help` | Display all commands available in the current context. Response appears in the conversation panel. |

### Card Entry Commands

| Command | Description |
|---|---|
| `/process` | Open the Note Processing workspace for the next unprocessed inbox item. |
| `/defer` | Defer the current inbox item (moves it to the deferred queue). |

### Card Review Commands

| Command | Description |
|---|---|
| `/pin` | Pin the current card to Translation Drills context (adds it to the active draw pile). |
| `/snooze` | Snooze the current card (temporarily hide from review session). |
| `/next` | Move to the next card in the current review session. |

### Translation Drills Commands

| Command | Description |
|---|---|
| `/next` | Request the next translation challenge. Triggers a conversation reset. |
| `/dismiss` | Dismiss the current card from the translation context (uses SRS scheduling). |
| `/draw [group]` | Draw more cards from the specified group into the active translation context. |

**Note on `/next`:** This command appears in both Card Review and Translation Drills with different behaviors. This is intentional context-aware behavior. The autocomplete panel only shows the appropriate version based on the active mini-app.

---

## Desktop Wireframes

### Wireframe 1 — Desktop: Idle (Card Review, Context Pane Wider)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                               Chinese ▾        [ ZB ]        │
├──────────────────┬────────────────────────────────────┬────────────────── ┤
│  ▶ Card Review   │                                    │ Conversation  [⇄] │
│  ○ Card Entry    │   CARD REVIEW CONTEXT UI           ├───────────────────┤
│  ○ Trans. Drills │   (current card, session stats)    │                   │
│  ○ Cards         │                                    │  No conversation  │
│  ○ Statistics    │                                    │  yet              │
│                  │              ◀▶                    │                   │
│  [ + ]           ├────────────────────────────────────┴───────────────────┤
│  ─────────────── │   Ask anything or type / for commands...           [↵] │
│  ○ Settings      │                                                         │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

*Context pane ~60%, conversation pane ~40%. Conversation pane shows "No conversation yet" as a placeholder.*

### Wireframe 2 — Desktop: Command Mode (Card Review, Autocomplete Open)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                               Chinese ▾        [ ZB ]        │
├──────────────────┬────────────────────────────────────┬────────────────── ┤
│  ▶ Card Review   │                                    │ Conversation  [⇄] │
│                  │   CARD REVIEW CONTEXT UI           ├───────────────────┤
│                  │                                    │                   │
│                  │              ◀▶                    │  No conversation  │
│                  │                                    │  yet              │
│                  │                                    │                   │
│  [ + ]           ├────────────────────────────────────┴───────────────────┤
│                  │  ┌──────────────────────────────────────────────────┐  │  ← autocomplete
│                  │  │ ▶ /pin    — Pin this card to Trans. Drills        │  │    floats above bar
│                  │  │   /next   — Move to next card in session          │  │
│                  │  │   /snooze — Snooze this card                      │  │
│                  │  │   ─── Global ──────────────────────────────────   │  │
│                  │  │   /help   — List available commands               │  │
│                  │  └──────────────────────────────────────────────────┘  │
│                  │   /p█                                              [↵]  │  ← command bar (focused)
└──────────────────┴─────────────────────────────────────────────────────────┘
```

### Wireframe 3 — Desktop: Conversation Active (Card Review, Response Showing)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                               Chinese ▾        [ ZB ]        │
├──────────────────┬──────────────────────────────┬──────────────────────── ┤
│  ▶ Card Review   │                              │ Conversation       [⇄] │
│                  │   CARD REVIEW CONTEXT UI     ├────────────────────────┤
│                  │   (current card: 经历)        │ ┌──────────────────┐  │
│                  │                              │ │You "Difference   │  │
│                  │              ◀▶               │ │btwn 经历/经过?"  │  │
│                  │                              │ └──────────────────┘  │
│                  │                              │ ┌──────────────────┐  │
│                  │                              │ │LLM "经历 implies │  │
│                  │                              │ │personal impact…" │  │
│                  │                              │ └──────────────────┘  │
│  [ + ]           ├──────────────────────────────┴────────────────────────┤
│  ─────────────── │   Ask anything or type / for commands...          [↵]  │
│  ○ Settings      │                                                         │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

### Wireframe 4 — Desktop: Translation Drills (Conversation Pane Wider by Default)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ◉ StudyPuck                               Chinese ▾        [ ZB ]        │
├──────────────────┬──────────────────┬───────────────────────────────────── ┤
│  ▶ Trans. Drills │                  │ Conversation                    [⇄] │
│                  │  CONTEXT VIEW    ├─────────────────────────────────────┤
│                  │  (cards/piles,   │ ┌─────────────────────────────────┐ │
│                  │   ~35% default)  │ │LLM "Translate: 'She has been    │ │
│                  │                  │ │     living here for years.'"    │ │
│                  │       ◀▶          │ └─────────────────────────────────┘ │
│                  │                  │          ┌──────────────────────┐   │
│                  │                  │          │You "她在这里住了多年了"│   │
│                  │                  │          └──────────────────────┘   │
│                  │                  │ ┌─────────────────────────────────┐ │
│                  │                  │ │LLM "Excellent! The 了 signals…" │ │
│  [ + ]           │                  │ └─────────────────────────────────┘ │
│  ─────────────── ├──────────────────┴─────────────────────────────────────┤
│  ○ Settings      │   Ask anything or type / for commands...           [↵] │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

*Context pane ~35%, conversation pane ~65%. Conversation is wider by default in Translation Drills.*

---

## Mobile Wireframes

### Wireframe 5 — Mobile: Idle (Card Review, No Active Conversation)

```
┌──────────────────────────────────┐
│  ◉ StudyPuck      Chinese ▾      │  ← top bar
├──────────────────────────────────┤
│                                  │
│                                  │
│    CARD REVIEW CONTEXT UI        │
│    (current card, session        │
│     progress, etc.)              │
│                                  │
│                                  │
├──────────────────────────────────┤
│  Ask anything or /...      [↵]   │  ← command bar
├──────────────────────────────────┤
│  🏠    📥    🃏    💬    ···     │  ← bottom tab bar
└──────────────────────────────────┘
```

*No conversation strip — context fills the full screen. Conversation only appears when active.*

### Wireframe 6 — Mobile: Conversation Bottom Sheet Open (Card Review)

```
┌──────────────────────────────────┐
│  ◉ StudyPuck      Chinese ▾      │  ← top bar
├──────────────────────────────────┤
│  CARD REVIEW CONTEXT UI          │  ← dimmed (~40% opacity)
│  (visible behind sheet)          │
├──────────────────────────────────┤  ← bottom sheet start
│  ▬  (drag handle)                │
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │
│ │You "Difference btwn        │   │
│ │    经历 and 经过?"          │   │
│ └────────────────────────────┘   │
│ ┌────────────────────────────┐   │
│ │LLM "经历 implies personal  │   │
│ │     impact while 经过…"    │   │
│ └────────────────────────────┘   │
├──────────────────────────────────┤
│  Ask anything or /...      [↵]   │  ← command bar (above keyboard)
├──────────────────────────────────┤
│  🏠    📥    🃏    💬    ···     │  ← bottom tab bar
└──────────────────────────────────┘
```

*Drag the sheet up to expand, swipe down or tap the dimmed backdrop to dismiss.*

### Wireframe 7 — Mobile: Command Bar Focused, Keyboard Open

```
┌──────────────────────────────────┐
│  ◉ StudyPuck      Chinese ▾      │  ← top bar
├──────────────────────────────────┤
│    CONTEXT UI (compressed)       │  ← visible above sheet
├──────────────────────────────────┤
│  ▬                               │  ← sheet handle
│  [conversation history, scroll]  │
├──────────────────────────────────┤
│  ▶ /pin   — Pin this card        │  ← autocomplete (floats above bar)
│    /next  — Next card            │
│    /snooze— Snooze               │
├──────────────────────────────────┤
│  /p█                       [↵]   │  ← command bar (focused, above keyboard)
├──────────────────────────────────┤
│  [ q ][ w ][ e ][ r ][ t ][ y ] │
│   [ a ][ s ][ d ][ f ][ g ]     │  ← software keyboard
│ [123]       [  space  ]  [done] │
└──────────────────────────────────┘
```

*Tab bar hidden when keyboard is open. Reappears when keyboard dismisses.*

### Wireframe 8 — Mobile: Translation Drills (Conversation Bottom Sheet Open by Default)

```
┌──────────────────────────────────┐
│  ◉ StudyPuck      Chinese ▾      │
├──────────────────────────────────┤
│  CONTEXT UI: cards & piles       │  ← dimmed; challenge sentence visible
│  Challenge: "She has been…"      │
├──────────────────────────────────┤
│  ▬  (drag handle)                │  ← bottom sheet (auto-open in Drills)
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │
│ │LLM "Translate: 'She has    │   │
│ │     been living here…'"    │   │
│ └────────────────────────────┘   │
│          ┌─────────────────────┐ │
│          │You "她在这里住了多  │ │
│          │    年了"             │ │
│          └─────────────────────┘ │
│ ┌────────────────────────────┐   │
│ │LLM "Excellent! The 了…"    │   │
│ └────────────────────────────┘   │
├──────────────────────────────────┤
│  Ask anything or /...      [↵]   │  ← command bar
├──────────────────────────────────┤
│  🏠    📥    🃏    💬    ···     │  ← bottom tab bar (💬 active)
└──────────────────────────────────┘
```

*In Translation Drills, the bottom sheet opens automatically when a new challenge is issued.*

---

## Accessibility

- Command bar and all interactive elements are keyboard-navigable (Tab, Shift+Tab, Enter, Escape, Arrow keys)
- Autocomplete panel traps focus when open; Escape closes it and returns focus to the input
- Command bar meets 44×44px minimum touch target on mobile
- All visual states communicate meaning through more than color alone (focus ring for focus, text for waiting state, etc.)
- Conversation messages have appropriate ARIA roles for live region announcements when new messages appear
- The conversation view-swap toggle has a visible label for screen readers (e.g., `aria-label="Swap conversation and context view"`)
- Animated elements (spinner, autocomplete appearance) respect `prefers-reduced-motion`

---

## Open Questions / Deferred to Mini-App Storyboards

The following items are intentionally deferred. Each mini-app storyboard document will specify:

1. **Minified context strip content** for that mini-app (what key info is shown when context is non-dominant)
2. **Conversation reset triggers** specific to that mini-app
3. **LLM system prompt scope** for that context (what topics the LLM should and should not address)
4. **Whether any context-specific commands** should be added beyond the initial set

---

## References

- [global-navigation.md](./global-navigation.md) — nav shell design (sidebar, bottom tab bar, top bar)
- [information-architecture.md](../information-architecture.md) — screen inventory and navigation model
- [non-functional-requirements.md](../non-functional-requirements.md) — accessibility, touch targets, responsive breakpoints
- [Wireframes: llm-command-interface.excalidraw](./llm-command-interface.excalidraw)
