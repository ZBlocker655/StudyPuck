# UX Design Documentation

This directory contains all UX design artifacts for StudyPuck, organized by type.

## Directory Structure

```
docs/ux/
├── README.md              # This file
├── storyboards/           # Feature storyboards (Excalidraw + Markdown pairs)
└── logo/                  # Logo and brand identity artifacts
```

## Dual-Format Convention

Every design artifact uses two companion files:

| File | Purpose |
|------|---------|
| `feature-name.excalidraw` | Visual wireframe — editable in [Excalidraw](https://excalidraw.com) |
| `feature-name.md` | Written specification — describes flows, states, and decisions |

Both files are committed to version control. The `.excalidraw` format is JSON and remains fully editable; **do not export as PNG** for the primary artifact.

## File Naming Convention

Use **kebab-case** matching the feature name for both files in a pair:

```
storyboards/card-review.excalidraw
storyboards/card-review.md
```

## Storyboards

Feature storyboards live in [`storyboards/`](./storyboards/). Each storyboard pair covers the UX flow for one feature or screen.

## Logo

Logo and brand identity artifacts live in [`logo/`](./logo/).
