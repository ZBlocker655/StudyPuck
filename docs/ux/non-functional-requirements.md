# Non-Functional Requirements

> **Status**: Authoritative — supersedes scattered NFR notes in `docs/specs/architecture-requirements.md` and `docs/specs/css-architecture-analysis.md`

Non-functional requirements (NFRs) define *how* the application performs, not *what* it does. They constrain every design and implementation decision. All targets below are minimum passing bars, not aspirational stretch goals.

---

## Performance

### Time to Interactive
- **Target**: < 2 seconds on a standard LTE connection
- Measured from navigation start to fully interactive page

### Core Web Vitals
| Metric | Target | Notes |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s | Google "Good" threshold |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | Google "Good" threshold |
| INP (Interaction to Next Paint) | ≤ 200ms | Replaces FID |

### Lighthouse Scores
Minimum passing scores on mobile simulation:

| Category | Minimum Score |
|---|---|
| Performance | 90 |
| Accessibility | 90 |
| Best Practices | 90 |
| SEO | 90 |

---

## Accessibility

### WCAG Compliance
- **Level**: WCAG 2.1 AA minimum
- All new UI components must meet AA before merging

### Keyboard Navigation
- Every user action must be completable without a mouse
- Focus order must follow logical reading order
- Keyboard shortcuts may supplement but never replace standard navigation

### Focus Management
- Visible focus indicators on **all** interactive elements (no `outline: none` without accessible replacement)
- Focus must be programmatically managed on route changes and modal open/close

### Screen Reader Support
- ARIA landmark regions required on all pages: `<header>`, `<main>`, `<nav>`, `<footer>`
- All images require meaningful `alt` text or `alt=""` if decorative
- Dynamic content changes (e.g., card flip results) must be announced via ARIA live regions

### Color Contrast
| Text Type | Minimum Ratio |
|---|---|
| Normal text (< 18px regular, < 14px bold) | 4.5:1 |
| Large text (≥ 18px regular, ≥ 14px bold) | 3:1 |
| UI components and graphical objects | 3:1 |

Applies in both light and dark mode.

### Touch Targets
- Minimum touch target size: **44×44px** (per Apple Human Interface Guidelines and WCAG 2.5.5)
- Adjacent targets must have sufficient spacing to prevent mis-taps

---

## Browser Support

### Supported Browsers
| Browser | Minimum Version |
|---|---|
| Chrome | Latest 2 versions |
| Firefox | Latest 2 versions |
| Safari | Latest 2 versions |
| Edge | Latest 2 versions |
| iOS Safari | Latest 2 versions |

### Explicitly Not Supported
- Internet Explorer (all versions)
- Browsers more than ~2 years behind current release

### Progressive Enhancement
Features that use emerging CSS (e.g., View Transitions API, CSS `:has()`) must degrade gracefully in unsupported browsers. Core functionality must not depend on these features.

---

## Responsive Design

### Minimum Supported Width
- **375px** — matches modern small phones (e.g., iPhone 12 mini, standard Android)
- No layout must break or require horizontal scrolling above 375px

### Breakpoints
| Zone | Range | Typical Device |
|---|---|---|
| Mobile | < 640px | Phones |
| Tablet | 640px – 1024px | Tablets, small laptops |
| Desktop | > 1024px | Laptops, desktops |

### Layout Expectations per Zone
- **Mobile**: Single-column layouts, stacked navigation, large touch targets
- **Tablet**: Two-column layouts where appropriate; sidebar may appear
- **Desktop**: Full multi-column layouts, persistent navigation

CSS container queries are preferred over viewport breakpoints for component-level responsiveness.

---

## Animation and Motion

### Allowed Animation Properties
- Only `transform` and `opacity` for performance-critical animations (avoids layout/paint)
- Color transitions via CSS custom properties are acceptable for theme transitions

### Duration Limits
| Interaction Type | Maximum Duration |
|---|---|
| UI micro-interactions (hover, click) | 150ms |
| UI transitions (panel open/close, card flip) | 300ms |
| Page-level transitions | 400ms |

### Reduced Motion
- `prefers-reduced-motion: reduce` **must** be respected — all animations must be suppressed or minimized when this preference is set
- Non-motion alternatives (e.g., instant state change) must be provided

---

## Typography and Readability

### Font Sizes
- **Minimum body font size**: 16px (1rem)
- No UI text below 12px

### Line Length
- **Target measure**: 60–75 characters for body/reading text
- Avoid full-width paragraphs on desktop — constrain max-width for readable columns

### CJK (Chinese, Japanese, Korean) Support
- Chinese Simplified is the primary CJK language for initial launch
- Fonts must render CJK characters correctly — system font stacks must include CJK fallbacks
- CJK character sizing: body text may need slight size adjustment (CJK characters read smaller than Latin at equal px)
- Do not crop or clip characters with tight `line-height` — CJK glyphs require more vertical space

---

## Dark / Light Mode

### Detection
- On first visit, detect system preference via `prefers-color-scheme`
- Default to system preference if no stored preference exists

### Persistence
- User's manual theme choice is persisted in `localStorage`
- On subsequent visits, stored preference takes priority over system preference

### Flash of Wrong Theme (FOWT)
- Theme must be applied before first paint — no flash of incorrect theme
- Implementation: read `localStorage` in a blocking script in `<head>` before SvelteKit hydration

### Color Tokens
- All colors must be defined as CSS custom properties
- Both light and dark variants must meet the contrast ratios in the Accessibility section above

---

## Internationalization

### Current Phase
- **Active languages**: Chinese Simplified, Spanish, Dutch
- All text rendering must support Unicode (UTF-8)
- Input fields must accept CJK characters and multi-byte Unicode

### RTL Support (Future Consideration)
- RTL layout support (Arabic, Hebrew, etc.) is planned for a future phase
- **Requirement now**: Use CSS logical properties (e.g., `margin-inline-start` instead of `margin-left`) throughout the codebase so RTL support can be added without major refactoring
- Document any hard-coded directional assumptions as technical debt

### Locale Formatting
- Dates, numbers, and lists must use locale-aware formatting (e.g., `Intl` API) rather than hardcoded formats

---

## Offline Behavior

### Current Phase: Graceful Degradation
StudyPuck requires a live network connection for all core features (LLM, database sync). Full offline-first functionality is **not** a current requirement.

### Error Handling
- When network connectivity is lost, display a **friendly inline error state** — not a full-page error or silent failure
- Error message must be clear and actionable: e.g., *"You're offline. Reconnect to continue studying."*
- On reconnection, the app should resume without requiring a full page reload where possible

### Future Consideration
- Partial offline capability (e.g., viewing previously studied cards) may be added in a later phase — no architectural commitment is made now

---

## References

- [architecture-requirements.md](../specs/architecture-requirements.md) — project goals and technology stack
- [css-architecture-analysis.md](../specs/css-architecture-analysis.md) — CSS methodology, dark mode, and animation decisions
- [WCAG 2.1 AA](https://www.w3.org/TR/WCAG21/) — accessibility standard
- [Google Core Web Vitals](https://web.dev/vitals/) — performance metrics
- [Apple Human Interface Guidelines — Touch Targets](https://developer.apple.com/design/human-interface-guidelines/buttons)
