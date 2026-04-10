# ADR-006: Visual Design System — Typography, Color, and Shape

**Date:** 2026-04-10  
**Status:** Accepted  
**Deciders:** @ZBlocker655  
**Technical Story:** [GitHub Issue #62](https://github.com/ZBlocker655/StudyPuck/issues/62)

## Context and Problem Statement

StudyPuck requires a concrete visual design system before CSS design tokens can be implemented (Milestone 1.6). The app's stated aesthetic — "crisp elegance of a well-made, slightly old-school book — typography-forward, dark/light mode" — needed to be translated into specific, implementable values: font families, a color palette, and shape conventions.

## Decision Drivers

* **Typography-forward aesthetic**: Study cards and language content are text-heavy; the reading experience is the product
* **Book-like literary feel**: Serif typography was the clear category; the question was which serif and in what pairing
* **Dark/light mode**: Every color token requires two values; the dark mode character is a significant independent choice
* **Commercial viability**: Fonts must be free for commercial use (the app may be monetized later)
* **CJK content support**: Japanese, Chinese, and Korean characters appear in card content; the font stack must degrade gracefully
* **Distinctiveness**: The design should stand out among study apps (Duolingo, Anki, Quizlet all use rounded, consumer-friendly aesthetics)

## Considered Options

### Typography
* **Option A**: Playfair Display (headings) + Lora (body) — classic book-design pairing, high-contrast serif for headings
* **Option B**: Lora throughout — unified, calmer, single serif family
* **Option C**: Source Serif 4 throughout — most screen-optimized, designed by Adobe for digital reading
* **Option D**: Libre Baskerville throughout — most old-school, 18th-century heritage, heavier on screen
* **Option E**: EB Garamond throughout — most literary/antiquarian, lightest weight, 16th-century lineage

### UI Font
* **Inter** — neutral, slightly technical
* **DM Sans** — slightly warmer and friendlier

### Accent Color
* **Palette 1**: Classic Ink Blue (`#1f52a0`) — refined version of the pre-existing `#0066cc`
* **Palette 2**: Deep Teal (`#0f6b6b`) — scholarly, distinctive
* **Palette 3**: Warm Burgundy (`#8b1a1a`) — most book-like, academic red, library-binding feel
* **Palette 4**: Deep Forest Green (`#2a6b35`) — earthy, unique

### Dark Mode Background Temperature
* **Option A**: Deep Warm sepia near-black (`#1a1210`) — very cozy, consistent warmth
* **Option B**: Cool Blue-Gray (`#0d1117`) — crisp, GitHub-style dark
* **Option C**: Warm Charcoal (`#161412`) — middle ground

### Border Radius / Shape
* **Option A**: Sharp / Editorial (0–2px) — most old-school, newspaper-like
* **Option B**: Classic / Refined (4–6px) — polished, premium productivity feel
* **Option C**: Soft / Friendly (8–12px, pill buttons) — modern and rounded, Notion/Duolingo style

## Decision Outcome

**Chosen:** Option A typography (Playfair Display + Lora) + DM Sans UI + Warm Burgundy palette + Cool Blue-Gray dark mode + Classic/Refined border radius.

### Positive Consequences

* **Distinctive identity**: Warm Burgundy is unlike any major study app; combined with serif typography it creates a clear "literary tool" personality
* **Contrast harmony**: The cool blue-gray dark mode creates strong contrast with the warm burgundy accent, making it pop more than a warm dark would
* **Proven pairing**: Playfair Display + Lora is a classic book-design combination used in quality editorial contexts
* **Commercial font safety**: All three fonts (Playfair Display, Lora, DM Sans) are SIL Open Font License — free for commercial use, no attribution required, permanently open source
* **CJK-ready**: Lora's font stack includes Noto Serif SC / STSong / SimSun fallbacks for Chinese/Japanese/Korean characters
* **Design system coherence**: Classic/Refined border radius (4–6px) is consistent with the "polished but not casual" personality

### Negative Consequences

* **Dark mode tension**: Warm burgundy + cool dark background is an unusual pairing that requires careful execution to avoid feeling inconsistent
* **Serif body text performance**: Lora is slightly heavier to render than a system serif; mitigated by Google Fonts CDN + `display=swap`
* **No system serif fallback for headings**: Playfair Display has no good system-font equivalent; a flash of unstyled text is possible on slow connections (mitigated by `display=swap` and font preloading)

## Pros and Cons of the Options

### Option A Typography: Playfair Display + Lora ✅

* Good, because maximum visual hierarchy — heading and body fonts are clearly distinct
* Good, because Playfair's high-contrast strokes feel like premium print typography
* Good, because Lora is designed specifically for screen body text readability
* Bad, because two separate Google Fonts requests (mitigated by combining in one URL)
* Bad, because Playfair has no close system fallback

### Option C Typography: Source Serif 4

* Good, because single family covers all sizes elegantly
* Good, because designed specifically for digital screens at variable sizes
* Bad, because less visually dramatic at heading sizes — headings and body feel similar
* Bad, because more "modern" and less "literary" in feel

### Option D Typography: Libre Baskerville

* Good, because strongest old-school book feel
* Bad, because heavy stroke weight renders poorly in dark mode at body sizes
* Bad, because limited weight range (only 400/700) reduces design flexibility

### Palette 3: Warm Burgundy ✅

* Good, because unique among study apps
* Good, because immediately communicates "academic / literary"
* Good, because deep enough to maintain contrast at WCAG AA on both backgrounds
* Bad, because can be visually close to error states if semantic error colors are not carefully differentiated

### Palette 1: Classic Ink Blue

* Good, because familiar and trustworthy
* Good, because close to the pre-existing `#0066cc` (low migration cost)
* Bad, because generic — resembles dozens of productivity apps

### Dark Mode Option B: Cool Blue-Gray (`#0d1117`) ✅

* Good, because strong contrast with the warm burgundy accent
* Good, because widely legible — this palette (used by GitHub) is proven at scale
* Bad, because a slight visual tension exists between the warm light mode and the cool dark mode character

### Shape Option B: Classic / Refined (4–6px) ✅

* Good, because sits at the "polished product" sweet spot
* Good, because consistent with the book aesthetic without being too sharp or too soft
* Bad, because less distinctive than either extreme

## Links

* [GitHub Issue #62: Typography and visual style specification](https://github.com/ZBlocker655/StudyPuck/issues/62)
* [Visual Style Specification](../../ux/visual-style-spec.md) — the output of this decision
* [Design Reference Mockup v1](../../ux/design-reference-v1.html) — HTML/CSS demo with all tokens applied
* [GitHub Issue #52+: CSS Design Tokens (Milestone 1.6)](https://github.com/ZBlocker655/StudyPuck/issues/52) — the implementation that consumes this decision
