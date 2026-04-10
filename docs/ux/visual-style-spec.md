# StudyPuck Visual Style Specification

**Issue:** #62  
**Milestone:** 1.5 UX & Design Specification  
**Status:** Complete — feeds directly into CSS design token work (Milestone 1.6)

---

## Design Aesthetic

"Crisp elegance of a well-made, slightly old-school book — typography-forward, dark/light mode."

**Key character decisions:**
- Light mode: warm paper feel — never pure white, never pure black
- Dark mode: cool blue-gray base (makes the warm burgundy accent pop by contrast)
- Accent color: Warm Burgundy — distinctive, literary, unlike any other study app
- Typography: Playfair Display headings paired with Lora body — classic book-design pairing
- Shape: classic/refined (4–6 px radius) — polished and digital, not rounded-consumer

---

## Typography

### Typefaces

| Role | Font | Weights | Notes |
|---|---|---|---|
| Heading (h1–h3, display) | Playfair Display | 400, 500, 700, 900 | High-contrast serif; feels like chapter headings in a quality textbook |
| Body (card text, explanations, reading content) | Lora | 400, 500, 600, italic 400/500 | Elegant serif optimized for screen body text; literary feel |
| UI (buttons, nav, labels, metadata, inputs) | DM Sans | 300, 400, 500, 600 | Slightly warm and friendly sans-serif; harmonizes well with Lora |
| Monospace (code, technical content) | System fallback | — | `'ui-monospace', 'Cascadia Code', 'Fira Code', 'Consolas', monospace` |

**CJK fallback font stack** (for Chinese/Japanese/Korean content, where Lora has no glyphs):
```
font-family: 'Lora', 'Georgia', 'Noto Serif SC', 'STSong', 'SimSun', serif;
```

**Google Fonts import URL:**
```
https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500
  &family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,900;1,400;1,700
  &family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400
  &display=swap
```

All three fonts are licensed under the SIL Open Font License (OFL) and are free for commercial use with no attribution requirement.

---

### Type Scale

| Token | Value | px equivalent | Usage |
|---|---|---|---|
| `--font-size-display` | `3.5rem` | 56px | Landing page hero text |
| `--font-size-h1` | `2.5rem` | 40px | Page titles |
| `--font-size-h2` | `2rem` | 32px | Section headings |
| `--font-size-h3` | `1.5rem` | 24px | Sub-section headings, card category headers |
| `--font-size-h4` | `1.2rem` | ~19px | Minor headings |
| `--font-size-body` | `1.0625rem` | 17px | Default reading size — slightly above 16px for literary feel |
| `--font-size-ui` | `0.875rem` | 14px | Buttons, nav items, labels |
| `--font-size-small` | `0.875rem` | 14px | Secondary information |
| `--font-size-caption` | `0.75rem` | 12px | Metadata, timestamps, card counts |

---

### Spacing & Rhythm

| Token | Value | Usage |
|---|---|---|
| `--leading-tight` | `1.1` | Large display headings (h1 at display size) |
| `--leading-heading` | `1.15` | Normal headings (h1–h3) |
| `--leading-body` | `1.65` | Body text — generous for readability |
| `--leading-relaxed` | `1.75` | Long-form reading passages |
| `--tracking-heading` | `-0.02em` | Slight negative tracking on large headings |
| `--tracking-caps` | `0.1em` | Positive tracking on uppercase labels/eyebrows |
| `--tracking-normal` | `0em` | Default |
| `--para-spacing` | `0.85em` | Space between consecutive paragraphs |

---

### Measure (Line Length)

| Token | Value | Notes |
|---|---|---|
| `--measure-body` | `68ch` | Targets 60–72 character line length for optimal readability. Apply as `max-width` on text containers. |

---

## Color Palette

### Design Principle

- Light mode: warm paper palette (off-white backgrounds, never `#ffffff` for page bg)
- Dark mode: cool blue-gray base — the warmth of the burgundy accent reads as more saturated and rich against a cool dark background
- Accent: Warm Burgundy — a deep academic red, like a library book binding

---

### Neutral Scale

| Token | Light mode | Dark mode |
|---|---|---|
| `--neutral-100` | `#faf6f2` | `#0d1117` |
| `--neutral-200` | `#f2ece5` | `#161b22` |
| `--neutral-300` | `#e0d8ce` | `#21262d` |
| `--neutral-400` | `#c8beb4` | `#30363d` |
| `--neutral-500` | `#a09890` | `#484f58` |
| `--neutral-600` | `#7a706a` | `#6e7681` |
| `--neutral-700` | `#504844` | `#8b949e` |
| `--neutral-800` | `#2a2422` | `#b1bac4` |
| `--neutral-900` | `#1a1918` | `#e6edf3` |

---

### Surface Layers

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-background` | `#faf6f2` | `#0d1117` |
| `--color-surface` | `#ffffff` | `#161b22` |
| `--color-surface-raised` | `#ffffff` (+ shadow) | `#1c2430` |
| `--color-surface-subtle` | `#f2ece5` | `#161b22` |

---

### Border

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-border` | `#e0d8ce` | `#30363d` |
| `--color-border-subtle` | `#ede8e0` | `#21262d` |

---

### Accent / Primary — Warm Burgundy

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-primary` | `#8b1a1a` | `#c04040` |
| `--color-primary-hover` | `#a82222` | `#d45050` |
| `--color-primary-active` | `#701414` | `#a83030` |
| `--color-primary-subtle` | `#f5e8e8` | `#1c1020` |
| `--color-primary-text` | `#8b1a1a` | `#e07070` |

*Rationale: `#8b1a1a` is a deep, desaturated burgundy — warm and rich without reading as "error red." In dark mode it is lightened to `#c04040` (and text representation to `#e07070`) to maintain WCAG AA contrast against the dark surface.*

---

### Text Colors

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-text-primary` | `#1a1918` | `#e6edf3` |
| `--color-text-secondary` | `#504844` | `#b1bac4` |
| `--color-text-muted` | `#7a706a` | `#8b949e` |
| `--color-text-disabled` | `#a09890` | `#484f58` |
| `--color-text-inverse` | `#f5f0ee` | `#0d1117` |
| `--color-text-accent` | `#8b1a1a` | `#e07070` |

---

### Semantic Colors

#### Success (Green)

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-success-text` | `#166534` | `#3fb950` |
| `--color-success-bg` | `#dcfce7` | `#0d1f15` |
| `--color-success-border` | `#86efac` | `#196c2e` |

#### Warning (Amber)

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-warning-text` | `#92400e` | `#d29922` |
| `--color-warning-bg` | `#fef3c7` | `#1c1500` |
| `--color-warning-border` | `#fcd34d` | `#7d5700` |

#### Error (Red)

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-error-text` | `#991b1b` | `#f85149` |
| `--color-error-bg` | `#fee2e2` | `#1a0808` |
| `--color-error-border` | `#fca5a5` | `#6e2020` |

*Note: Error red is deliberately distinct from the Burgundy accent — it leans toward orange-red rather than deep crimson to avoid visual confusion.*

#### Info (Blue)

| Token | Light mode | Dark mode |
|---|---|---|
| `--color-info-text` | `#1e40af` | `#58a6ff` |
| `--color-info-bg` | `#dbeafe` | `#051526` |
| `--color-info-border` | `#93c5fd` | `#1f4080` |

---

## Spacing Scale

4px base unit. All values in rem for accessibility (respects user font size preferences).

| Token | Value | px |
|---|---|---|
| `--space-1` | `0.25rem` | 4px |
| `--space-2` | `0.5rem` | 8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem` | 16px |
| `--space-5` | `1.5rem` | 24px |
| `--space-6` | `2rem` | 32px |
| `--space-7` | `3rem` | 48px |
| `--space-8` | `4rem` | 64px |
| `--space-9` | `6rem` | 96px |

---

## Border Radius

Classic/Refined system — enough softness to feel polished, not rounded enough to feel casual.

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `2px` | Tags, chips, small badges |
| `--radius-md` | `4px` | Cards, inputs, buttons |
| `--radius-lg` | `6px` | Modals, large panels, drawers |

*No pill/full-round style — inconsistent with the editorial book aesthetic.*

---

## Shadows

Warm-tinted shadows in light mode (slightly sepia, not gray). Pure alpha-black in dark mode.

| Token | Light mode | Dark mode |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(26,12,10,.08), 0 1px 2px rgba(26,12,10,.05)` | `0 1px 3px rgba(0,0,0,.40)` |
| `--shadow-md` | `0 4px 12px rgba(26,12,10,.10), 0 2px 6px rgba(26,12,10,.06)` | `0 4px 12px rgba(0,0,0,.50)` |
| `--shadow-lg` | `0 12px 32px rgba(26,12,10,.14), 0 4px 12px rgba(26,12,10,.08)` | `0 12px 32px rgba(0,0,0,.60)` |

---

## Transitions

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | `150ms` | Micro-interactions: button hover, focus ring |
| `--duration-base` | `250ms` | Component transitions: dropdown open, tab switch |
| `--duration-slow` | `400ms` | Page transitions, major layout animations |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default — Material-style ease in-out |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |

---

## Complete CSS Custom Properties Reference

The following is the complete token set ready to paste into a `:root` block (light mode defaults with `.dark` class overrides):

```css
:root {
  /* ── Fonts ── */
  --font-heading: 'Playfair Display', 'Georgia', serif;
  --font-body:    'Lora', 'Georgia', 'Noto Serif SC', 'STSong', 'SimSun', serif;
  --font-ui:      'DM Sans', system-ui, sans-serif;
  --font-mono:    'ui-monospace', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;

  /* ── Type scale ── */
  --font-size-display: 3.5rem;
  --font-size-h1:      2.5rem;
  --font-size-h2:      2rem;
  --font-size-h3:      1.5rem;
  --font-size-h4:      1.2rem;
  --font-size-body:    1.0625rem;
  --font-size-ui:      0.875rem;
  --font-size-small:   0.875rem;
  --font-size-caption: 0.75rem;

  /* ── Leading ── */
  --leading-tight:   1.1;
  --leading-heading: 1.15;
  --leading-body:    1.65;
  --leading-relaxed: 1.75;

  /* ── Tracking ── */
  --tracking-heading: -0.02em;
  --tracking-caps:     0.1em;
  --tracking-normal:   0em;

  /* ── Paragraph spacing ── */
  --para-spacing: 0.85em;

  /* ── Measure ── */
  --measure-body: 68ch;

  /* ── Spacing scale ── */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;

  /* ── Border radius ── */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;

  /* ── Transitions ── */
  --duration-fast:   150ms;
  --duration-base:   250ms;
  --duration-slow:   400ms;
  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

  /* ── Light mode color tokens (defaults) ── */
  --color-background:      #faf6f2;
  --color-surface:         #ffffff;
  --color-surface-raised:  #ffffff;
  --color-surface-subtle:  #f2ece5;
  --color-border:          #e0d8ce;
  --color-border-subtle:   #ede8e0;

  --neutral-100: #faf6f2;
  --neutral-200: #f2ece5;
  --neutral-300: #e0d8ce;
  --neutral-400: #c8beb4;
  --neutral-500: #a09890;
  --neutral-600: #7a706a;
  --neutral-700: #504844;
  --neutral-800: #2a2422;
  --neutral-900: #1a1918;

  --color-primary:        #8b1a1a;
  --color-primary-hover:  #a82222;
  --color-primary-active: #701414;
  --color-primary-subtle: #f5e8e8;
  --color-primary-text:   #8b1a1a;

  --color-text-primary:   #1a1918;
  --color-text-secondary: #504844;
  --color-text-muted:     #7a706a;
  --color-text-disabled:  #a09890;
  --color-text-inverse:   #f5f0ee;
  --color-text-accent:    #8b1a1a;

  --color-success-text:   #166534;
  --color-success-bg:     #dcfce7;
  --color-success-border: #86efac;

  --color-warning-text:   #92400e;
  --color-warning-bg:     #fef3c7;
  --color-warning-border: #fcd34d;

  --color-error-text:     #991b1b;
  --color-error-bg:       #fee2e2;
  --color-error-border:   #fca5a5;

  --color-info-text:      #1e40af;
  --color-info-bg:        #dbeafe;
  --color-info-border:    #93c5fd;

  --shadow-sm: 0 1px 3px rgba(26,12,10,.08), 0 1px 2px rgba(26,12,10,.05);
  --shadow-md: 0 4px 12px rgba(26,12,10,.10), 0 2px 6px rgba(26,12,10,.06);
  --shadow-lg: 0 12px 32px rgba(26,12,10,.14), 0 4px 12px rgba(26,12,10,.08);
}

/* ── Dark mode overrides ── */
.dark {
  --color-background:      #0d1117;
  --color-surface:         #161b22;
  --color-surface-raised:  #1c2430;
  --color-surface-subtle:  #161b22;
  --color-border:          #30363d;
  --color-border-subtle:   #21262d;

  --neutral-100: #0d1117;
  --neutral-200: #161b22;
  --neutral-300: #21262d;
  --neutral-400: #30363d;
  --neutral-500: #484f58;
  --neutral-600: #6e7681;
  --neutral-700: #8b949e;
  --neutral-800: #b1bac4;
  --neutral-900: #e6edf3;

  --color-primary:        #c04040;
  --color-primary-hover:  #d45050;
  --color-primary-active: #a83030;
  --color-primary-subtle: #1c1020;
  --color-primary-text:   #e07070;

  --color-text-primary:   #e6edf3;
  --color-text-secondary: #b1bac4;
  --color-text-muted:     #8b949e;
  --color-text-disabled:  #484f58;
  --color-text-inverse:   #0d1117;
  --color-text-accent:    #e07070;

  --color-success-text:   #3fb950;
  --color-success-bg:     #0d1f15;
  --color-success-border: #196c2e;

  --color-warning-text:   #d29922;
  --color-warning-bg:     #1c1500;
  --color-warning-border: #7d5700;

  --color-error-text:     #f85149;
  --color-error-bg:       #1a0808;
  --color-error-border:   #6e2020;

  --color-info-text:      #58a6ff;
  --color-info-bg:        #051526;
  --color-info-border:    #1f4080;

  --shadow-sm: 0 1px 3px rgba(0,0,0,.40);
  --shadow-md: 0 4px 12px rgba(0,0,0,.50);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.60);
}
```
