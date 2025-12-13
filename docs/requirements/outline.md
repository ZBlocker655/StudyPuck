# StudyPuck Requirements Outline

## Overview

### Mission Statement

- Promote active recall over passive memorization (vs traditional SRS/Anki)
- Help language learners produce fluent, grammatically correct sentences using acquired vocabulary
- Combine vocabulary management with LLM-powered translation practice
- Vehicle for learning modern technologies and demonstrating technical growth
- Tool for everyday personal language learning
- Potential career and income opportunities

### Core Application Structure

- **Cards**: Study prompts with vocabulary, grammar patterns, and learning context
- **Card Review**: Spaced repetition system for browsing and managing study cards
- **Translation Drills**: LLM-powered conversation interface for active practice
- **Card Entry**: Low-friction system for adding new study material

## Functional Requirements

### Cards

- **Content Types**:
  - Single words, grammar chunks, sentence patterns
  - Complex prompts (e.g., "Difference between 东西 and 事情")
  - Example: "越来越 (adjective) to express 'more and more...'"
- **Structure**:
  - Study prompts (not traditional front/back flashcards)
  - Multiple example sentences
  - Mnemonic prompts for memory encoding
  - Optional LLM instructions for sentence generation
- **Organization**:
  - Stored in user-defined, named groups (e.g., "concrete nouns", "grammar patterns")
  - Groups are language-specific, not shared across languages
  - Cards can belong to multiple groups
- **Architectural Role**:
  - Core database consumed by multiple mini-applications
  - Each mini-application maintains separate metadata for cards

### Card Review

- **Browsing**:
  - Browse by group or subset within group
  - Display less recently reviewed cards first
- **SRS Integration**:
  - Track last review date for each card
  - User can influence next review timing
  - Default timing based on SRS algorithm
- **Context Management**:
  - Add reviewed cards to translation drill context
- **Card States** (Card Review specific):
  - Active, snoozed, disabled, evaluated, pinned states
  - States are independent from other mini-applications
  - Cards added this way appear in special "Pinned" group

### Translation Drills

- **Interface**:
  - Conversation-style interaction with LLM
  - Current context of available cards for LLM use
- **Card Context Management**:
  - Cards organized primarily by group
  - Separate SRS system for translation context
  - User can snooze/disable current cards
  - User can dismiss cards (scheduled by SRS algorithm)
  - User can draw more cards from any group into context
- **Translation Process**:
  - LLM creates English sentences using cards in context
  - User translates to target language
  - LLM evaluates and provides feedback

### Card Entry

- **Inbox System**:
  - Special "inbox" queue for rough notes
  - Low-friction entry process
  - Processing inbox is top-level application activity
- **Card Processing**:
  - Convert rough notes to structured cards
  - Add groups, mnemonics, example sentences
  - Equal priority with Card Review and Translation Drills

### Multi-Language Support

- **Language Isolation**:
  - Users study one language at a time
  - Each language has separate cards, groups, and translation context
  - Clear UI indication of current language mode
- **Language Management**:
  - Users can switch between languages
  - Users can add new languages as needed

## LLM Behavior Requirements

### Sentence Generation

- Be creative when forming sentences
- Prefer 1-2 cards per sentence
- Use cards from different groups when possible

### Feedback Provision

- Give concise but specific feedback
- Focus on grammar and usage corrections

## Future Enhancement Plans

### Logging and Analytics

- Log full translation sessions
- Store logs using R2

### Model Customization

- Fine-tune custom models using HuggingFace/spaCy
- Implement RAG context with current cards and user feedback
- Modular design for swapping GPT-4 with custom models

### Scope Expansion

- Bring in additional aspects of language learning and study
- Expand beyond vocabulary and translation practice
