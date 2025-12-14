# Multi-Language Support

## Overview

StudyPuck is designed to support users studying multiple languages while maintaining strict isolation between language contexts. The system operates on a "one language at a time" principle, ensuring that vocabulary, groups, translation contexts, and study sessions remain completely separate for each language being studied.

This architectural approach prevents cross-contamination between languages while providing users the flexibility to switch between their language studies as needed. Each language maintains its own complete ecosystem within the StudyPuck system, from card storage to spaced repetition scheduling.

## Core Principles

### Language Isolation

StudyPuck enforces complete separation between languages at every system level:

- **Independent Card Databases**: Each language maintains its own collection of study cards with no cross-language sharing
- **Separate Group Systems**: Groups are language-specific - a "Storytelling" group in Chinese is completely separate from a "Storytelling" group in French
- **Isolated Translation Contexts**: Translation Drill contexts remain separate per language, preventing accidental mixing of vocabulary
- **Independent SRS Systems**: Each mini-application maintains separate spaced repetition metadata for each language
- **Language-Specific Inboxes**: Card Entry maintains distinct inbox queues for each language

### Single-Language Study Sessions

- **Active Language Context**: Users work within one language at a time during study sessions
- **Context Clarity**: The user interface clearly indicates which language is currently active
- **Session Isolation**: All study activities (Card Review, Translation Drills, Card Entry) operate within the selected language context
- **No Cross-Language Interference**: Vocabulary from other languages cannot accidentally appear in study sessions

## Language Management

### Language Selection

- **Primary Language Interface**: Clear, prominent display of currently active language
- **Quick Switching**: Users can easily switch between configured languages
- **Session Persistence**: Selected language remains active across application restarts and between study sessions
- **Context Preservation**: Each language retains its own state when switching between languages

### Adding New Languages

- **System-Supported Languages**: Users can select from languages specifically supported by the system
- **Administrative Control**: Language availability is controlled at the system level, not user-configurable
- **Language-Specific Features**: Each supported language includes provisions for specific input modes, fonts, and UI behaviors
- **Initial Setup**: New languages start with empty card databases, groups, and contexts
- **Immediate Availability**: Once selected, supported languages are immediately available for study and card entry
- **Architecture Foundation**: System architecture designed to support language-specific UI adaptations in future versions

## System Integration

### Mini-Application Coordination

All mini-applications respect and enforce language isolation, including Card Review, Card Entry, and Translation Drills.

## User Experience Considerations

### Interface Design

- **Language Indicator**: Current language clearly visible throughout the application
- **Language Switching**: Language selection easily available from main navigation
- **Cross-Language Prevention**: System prevents operations that would break language isolation with clear error messages

### Workflow Considerations

- **Study Session Management**: Study sessions operate entirely within one language context
- **Progress Tracking**: Separate progress tracking and statistics for each language

## Architectural Considerations

### Data Architecture

- **Language Namespacing**: All data structures include language identifiers to maintain separation
- **API Language Context**: All API operations explicitly specify which language is being referenced to prevent ambiguity
- **Referential Integrity**: Cross-references validate language consistency
- **Query Isolation**: System operations automatically filter by active language

### Multi-Application Consistency

- **Shared Language Context**: All mini-applications operate within the same active language
- **State Management**: Language selection state maintained consistently across the application
- **Cross-Application Coordination**: Language switches affect all mini-applications simultaneously

### Extensibility Framework

- **Language-Aware Design**: System architecture supports language isolation for future mini-applications
- **External Integration Support**: Framework for language-specific external integrations
- **Language-Specific UI Support**: Architecture designed to support different input modes, keyboards, fonts, and UI behaviors per language in future versions
- **Scalability**: Architecture supports users with extensive language portfolios from system-supported languages
