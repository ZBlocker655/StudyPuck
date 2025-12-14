# Translation Drills Functionality

## Overview

The Translation Drills feature is a mini-application that provides AI-powered translation practice using the core database of study cards. It creates a conversation-style interface where users engage with an LLM to practice translating English sentences into their target language, with the LLM drawing from a curated context of active cards and providing feedback on translations.

As one of multiple applications that use the shared card database, Translation Drills maintains independent SRS metadata - meaning a card's usage history and scheduling in Translation Drills is completely separate from its review history in Card Review or other future mini-applications.

This architectural separation allows users to have different proficiency levels and practice schedules for the same card across different learning contexts (e.g., passive recognition vs. active translation production).

## Core Functionality

### Conversational Interface

- **LLM Interaction**: Users engage in conversation-style exchanges with an AI language model
- **Structured Translation Practice**: The conversation centers around one-at-a-time sentence translation exercises
- **Interactive Dialogue**: Beyond simple translation, users can:
  - Ask questions about grammar or usage
  - Request clarification on feedback
  - Try alternative translation approaches
  - Discuss nuances in meaning or context
- **Command Interface**: Slash-prefixed commands provide structured navigation (specific commands to be determined during implementation)
  - Example: `/next` to proceed to the next translation exercise
  - Additional commands for session control and context management

### Card Context Management

Translation Drills operates on a "draw pile" system similar to card games:

- **Group-based Draw Piles**: Each configured group functions as a separate draw pile
- **Active Context Display**: A number of top cards from each draw pile are "drawn" (made active) and displayed in the translation context
- **Group Association**: Cards in context remain visually associated with their source groups
- **User Configuration**: Users select which groups serve as draw piles for translation practice
- **Cross-Session Persistence**: The active context persists between sessions, maintaining state even when users log out and return

### Card Context States

Cards within the translation context can be managed through several user actions:

- **Active**: Card is available for the LLM to use in generating translation exercises
- **Snoozed**: Card is temporarily hidden from the active context but remains in the draw pile
- **Disabled**: Card is removed from the current translation context but preserved in core database
- **Dismissed**: Card is removed from active context and scheduled for return based on SRS algorithm
  - User can influence return timing with options like "tomorrow", "sooner - 5 days", "later - 20 days"
  - Timing options calibrated to SRS algorithm principles
  - Default timing calculated by Translation Drills' independent SRS system

### SRS Integration

- **Independent SRS Metadata**: Translation Drills maintains its own separate spaced repetition data for each card, independent of Card Review or other mini-applications
- **Usage Tracking**: System tracks when and how effectively each card was used in translation exercises *within Translation Drills specifically*
- **Card-specific Notes**: Users can add notes to cards about specific problem aspects to work on (e.g., "practice tone usage", "remember irregular conjugation")
  - Notes are associated with the card itself, not the SRS relationship
  - Notes persist across all mini-applications but can inform Translation Drills behavior
- **Algorithm-based Scheduling**: Next appearance timing calculated using SRS algorithm based on Translation Drills usage history only
- **User Override**: Users can modify suggested return intervals when dismissing cards

## Translation Process

### Sentence Generation

The LLM creates English sentences following specific behavioral requirements:

- **Creative Sentence Construction**: LLM generates varied, interesting sentences rather than repetitive patterns
- **Optimal Card Usage**: Prefer incorporating 1-2 cards per sentence to maintain focus
- **Cross-group Integration**: When possible, use cards from different groups within the same sentence to reinforce connections
- **Context Awareness**: Draw from currently active cards in the translation context

### User Translation

- **One Sentence at a Time**: Each translation exercise focuses on a single English sentence
- **Target Language Response**: User provides their translation in the target language
- **Iterative Refinement**: Users can attempt multiple translations or ask for guidance before moving to evaluation

### LLM Evaluation and Feedback

- **Concise Assessment**: LLM provides specific but brief feedback on translation quality
- **Grammar Focus**: Emphasis on grammatical accuracy and proper usage patterns
- **Usage Guidance**: Corrections that explain not just what was wrong but why
- **Conversational Support**: LLM can engage in follow-up discussion about translation choices, alternative approaches, or related grammar concepts

## Context Management Operations

### Drawing More Cards

- **Group Selection**: Users can choose from any configured group to draw additional cards
- **Permanent Addition**: Cards drawn into context remain active across sessions
- **Group Balance**: System may provide guidance on maintaining appropriate context size and group representation

### Context Configuration

- **Group Selection**: Users configure which groups serve as draw piles for translation practice
- **Draw Size Control**: Users may influence how many cards are active from each group
- **Context Review**: Interface for viewing and managing currently active cards

## Integration Points

### With Core Card Database

- **Read-only Content Access**: Retrieval of card content (vocabulary, examples, mnemonics, LLM instructions)
- **Real-time Updates**: Context reflects changes when cards are modified or group membership changes
- **Note Storage**: Card-specific notes are stored with the card itself for cross-application access

### With Translation Drills SRS System

- **Independent Metadata Storage**: Dedicated SRS data specific to Translation Drills usage
- **Usage Event Recording**: Tracking of translation exercises and user performance
- **Scheduling Calculations**: Next appearance timing based partly on SRS algorithm from Translation Drills and partly on user overrides
- **No Cross-contamination**: Complete separation from Card Review or other mini-application SRS data

### With Other Mini-Applications

- **Shared Card Access**: Same cards available across Card Review and future applications
- **Independent State**: Translation context state separate from Card Review states
- **Note Sharing**: Card-specific notes accessible across applications

## User Experience Considerations

### Session Flow

- **Context Awareness**: Clear display of which cards are currently active in translation context
- **Progress Indication**: Visual feedback on translation exercises completed and remaining context
- **Smooth Transitions**: Seamless movement between translation practice and context management

### Interface Design

- **Conversation Clarity**: Clear distinction between translation exercises and general conversation
- **Context Visibility**: Easy access to view active cards and their source groups
- **Command Integration**: Intuitive slash-command interface for session control
- **Feedback Integration**: Natural presentation of LLM evaluation and guidance

### Context Management

- **Group Organization**: Clear visual association between active cards and their source groups
- **Easy Manipulation**: Simple controls for snoozing, dismissing, or drawing additional cards
- **State Persistence**: Reliable maintenance of context state across sessions

## Technical Considerations

### LLM Integration

- **Context Injection**: Efficient method for providing active cards as context to the LLM
- **Instruction Handling**: Processing of card-specific LLM instructions when generating sentences
- **Response Processing**: Parsing LLM output to distinguish between translation exercises and feedback

### Data Management

- **Context Persistence**: Reliable storage and retrieval of active translation context
- **SRS Calculations**: Independent algorithm implementation for Translation Drills scheduling
- **Note Management**: Storage and retrieval of user-added card notes

### Performance

- **Context Loading**: Efficient loading of active cards without full group data retrieval
- **Real-time Interaction**: Responsive LLM communication for natural conversation flow
- **Session Management**: Reliable state management across user sessions

## Architectural Considerations

### Mini-Application Independence

- **Separate SRS Systems**: Complete isolation of Translation Drills SRS data from other applications
- **Independent Context**: Translation context operates separately from Card Review or other features
- **Extensible Design**: Framework supports future mini-applications with their own translation-related features

### Cross-Application Coordination

- **Shared Card Notes**: Notes added in Translation Drills available in other applications
- **Database Consistency**: Changes to core card content reflected in active translation context
- **User Experience Continuity**: Smooth transitions when switching between mini-applications
