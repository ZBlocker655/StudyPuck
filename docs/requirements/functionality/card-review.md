# Card Review Functionality

## Overview

The Card Review feature is a mini-application that operates on the core database of study cards, providing a browsing and review interface with its own spaced repetition system (SRS). As one of multiple applications that use the shared card database, Card Review maintains independent SRS metadata - meaning a card's review history and scheduling in Card Review is separate from its usage in Translation Drills or other future mini-applications.

This architectural separation allows users to have different familiarity levels and review schedules for the same card across different learning contexts (e.g., passive review vs. active translation practice).

## Core Functionality

### Browsing Interface

- **Group-based Navigation**: Users can browse cards by selecting specific groups (e.g., "concrete nouns", "grammar patterns", "common verbs")
- **Subset Selection**: Within a group, users can choose to review a subset of cards by number or other criteria
- **SRS-driven Ordering**: The system prioritizes displaying cards that haven't been reviewed recently, following spaced repetition principles

### Review Process

- **Card Display**: Present study prompts with full context including:
  - Main vocabulary or grammar pattern
  - Example sentences (when available)
  - Mnemonic prompts (when provided)
  - Any special LLM instructions
- **Review Actions**: After reviewing each card, users can:
  - Rate their familiarity/difficulty
  - Influence the next review timing
  - Add card to translation drill context ("Pinned" group)
  - Snooze card temporarily
  - Disable card from current study rotation

### SRS Integration

- **Independent SRS Metadata**: Card Review maintains its own separate spaced repetition data for each card, independent of Translation Drills or other mini-applications
- **Review Tracking**: System maintains timestamps of when each card was last reviewed *in Card Review specifically*
- **Algorithm-based Scheduling**: Default next review timing calculated using SRS algorithm based on Card Review history only
- **User Override**: Users can modify the suggested next review interval based on their self-assessment within the Card Review context
- **Difficulty Adjustment**: Review frequency adjusts based on user-indicated difficulty or success rates *from Card Review sessions*

### Context Management

- **Translation Drill Integration**: Cards can be seamlessly added to the active translation drill context
- **Pinned Group**: Cards added to translation context appear in a special "Pinned" group for easy identification
- **Cross-feature Coordination**: Changes in Card Review affect what's available in Translation Drills

## Card Review States

Cards can have various states within the Card Review mini-application that affect how they appear in study sessions:

- **Active**: Available for review in the current study rotation
- **Snoozed**: Temporarily hidden from Card Review study rotation
- **Disabled**: Removed from current Card Review study but preserved in core database
- **Evaluated**: Marked for review timing adjustment based on user performance in Card Review
- **Pinned**: Added to Translation Drill context during Card Review (appears in special "Pinned" group)

Note: These states are specific to Card Review. The same card may have different states in Translation Drills or other mini-applications.

### Navigation

- Clear group selection interface
- Subset size controls (e.g., "Review 10 cards", "Review all")
- Progress indication showing cards remaining in current session

### Card Display

- Clean, readable presentation of card content
- Clear distinction between different content types (vocabulary, examples, mnemonics)
- Visual indicators for card metadata (group membership, last review date)

### Review Controls

- Intuitive rating system for difficulty/familiarity
- Quick-access buttons for common actions (pin to context, snooze, disable)
- Easy navigation between cards (next/previous)

## Integration Points

### With Core Card Database
- Read-only access to card content (vocabulary, examples, mnemonics, groups)
- Real-time updates when cards are modified or group membership changes
- No modification of core card data - only consumption

### With Translation Drills
- Ability to add cards to translation drill context during review
- Shared "Pinned" group mechanism between mini-applications
- **SRS Independence**: Card Review SRS data remains separate from Translation Drill SRS data

### With Card Review SRS System
- Dedicated SRS metadata storage specific to Card Review application
- Recording of Card Review events and user feedback
- Retrieval of Card Review-specific next review schedules
- No cross-contamination with other mini-application SRS data

## Architectural Considerations

### Mini-Application Design
- Card Review operates as one of potentially multiple mini-applications
- Each mini-application can maintain its own SRS metadata for the same cards
- Future mini-applications can be added without affecting existing SRS data
- Core card database remains unchanged regardless of number of consuming applications

### SRS Data Separation
- A single card may have different review histories across mini-applications
- Example: Card X reviewed today in Card Review, but not used in Translation Drills for 2 weeks
- Each application's SRS algorithm operates independently
- Users may see the same card at different frequencies in different contexts

## Technical Considerations

### Performance

- Efficient loading of card subsets without requiring full group data
- Responsive UI that handles large groups gracefully

### Data Consistency

- Ensure review timestamps are accurately recorded
- Maintain integrity when cards belong to multiple groups
- Handle concurrent access if user switches between features

### User Experience

- Minimize cognitive load during review sessions
- Provide clear feedback on actions taken
- Allow easy recovery from accidental actions (undo/redo where appropriate)
