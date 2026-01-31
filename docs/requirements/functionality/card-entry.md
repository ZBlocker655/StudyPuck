# Card Entry Functionality

## Overview

The Card Entry feature is a mini-application that serves as the primary gateway for capturing and processing language learning material into the StudyPuck system. It operates through a "vocabulary inbox" system that collects rough notes from various sources and provides tools to transform them into structured study cards in the core database.

As the central processing hub for new vocabulary and language concepts, Card Entry bridges the gap between unstructured learning material encountered in daily language study and the organized cards used by Card Review and Translation Drills. The system is designed with extensibility as a core principle to support multiple integration points with external language learning sources.

Card Entry maintains language-specific inboxes, ensuring that material from different languages remains separate throughout the processing workflow.

## Core Functionality

### Inbox System

- **Language-Specific Inboxes**: Each language has its own dedicated inbox to prevent cross-contamination of study material
- **Sequential Storage**: Notes are stored in the order they were entered, preserving the natural flow of discovery
- **Random Access**: Users can browse and process inbox items in any order, not restricted to sequential processing
- **Low-Friction Entry**: Designed to minimize barriers between encountering new material and capturing it for later processing
- **Multiple Entry Points**: Architecture supports various input methods and external integrations. Although initial input methods will be basic and largely manual, the architecture should _not_ prevent adding new, faster, more automatic entry methods and integrations.

### Note Management

- **Flexible Note Content**: Inbox notes can contain any type of unstructured text - single words, phrases, sentences, complex explanations, or contextual observations
- **Entry Sequence Preservation**: Notes maintain their original entry order while allowing non-sequential processing
- **Processing Actions**: Notes can be:
  - **Processed**: Converted into one or more structured draft cards (note-card links maintained for context)
  - **Deferred**: Temporarily skipped for later processing
  - **Deleted**: Removed from the inbox without creating cards
- **Draft Card Workflow**: After cards are promoted to active status, notes can be deleted while preserving the cards
- **No Complex State Management**: Notes exist in simple states (unprocessed, deferred, or deleted) without elaborate workflow tracking

### Card Processing Workflow

The transformation from rough notes to structured cards involves several key steps:

#### Draft/Active Card Lifecycle

Cards support a status-based lifecycle to enable better workflow control:

- **Draft Status**: Cards created during processing start as drafts, allowing users to:
  - Review AI-generated suggestions before making them active
  - Create multiple cards from complex notes and approve them individually  
  - Build up cards manually over time without polluting the active study deck
  - Utilize all card capabilities (group membership, full-text search) while in draft state
  - View the original note context that generated each draft card

- **Active Status**: Cards marked as active become visible in Card Review and Translation Drill applications

- **Status Promotion**: Users can promote draft cards to active status through the Card Entry interface, providing an approval gate for all new content

- **Note-Card Traceability**: The system maintains links between inbox notes and draft cards created from them, enabling users to see the original context during review

This workflow is particularly valuable when AI assistance generates card suggestions, ensuring user control over which suggestions become part of their active study materials.

#### Note-to-Card Flexibility

- **One-to-Many**: A single complex note can generate multiple related cards
- **Many-to-One**: Multiple related notes can be combined into a single comprehensive card  
- **One-to-One**: Simple notes can become individual cards
- **Contextual Decisions**: Users decide the optimal card structure based on learning needs

#### Card Creation Form

During processing, users structure their cards using these fields:

- **Card Content/Prompt**: The main study material or question
- **Status**: Cards can be created as 'draft' (for review) or 'active' (immediately available)
- **Group Assignments**: Selection of one or more groups for organization
- **Example Sentences**: Contextual usage demonstrations. Zero or more allowed per Card.
- **Mnemonic Prompts**: Personal memory encoding strategies. Multiple allowed.
- **LLM Instructions**: Optional guidance for AI-powered features

#### Processing Interface

- **Note Display**: Clear presentation of the original rough note content
- **Card Preview**: Real-time preview of the structured card being created
- **Status Selection**: Choice between draft and active status for new cards
- **Group Selection**: Interface for choosing existing groups or creating new ones
- **Field Assistance**: Support for adding multiple example sentences and mnemonics
- **Batch Processing**: Ability to create multiple cards from a single note
- **Draft Management**: Interface for reviewing, editing, and promoting draft cards to active status
- **Note Context**: When reviewing draft cards, display the original note that generated each card for context
- **Link Management**: Ability to see all cards created from a specific note and all notes that contributed to a card

## Integration Architecture

### Current Integration Points

- **Manual Entry**: Direct text input through the application interface
- **API**: API endpoint allowing item entry into Inbox

### Future Integration Strategy

The system is designed for extensive external integration to reduce friction in vocabulary mining:

- **Browser Extensions**: Designed to pull browser-based content directly into Card Entry.
- **Mobile Capture**: Cross-platform synchronization for on-the-go vocabulary collection
- **App Integration Platforms**: Systems like IFTTT, n8n, Zapier should have endpoints for StudyPuck to dump items into Card Entry.

## AI Enhancement Strategy

### Current Processing

Initial versions rely on manual structuring with user-driven card creation and organization.

### AI Integration for Version 1.0

AI assistance is essential for creating a low-friction Card Entry system:

#### Core 1.0 Features (Vector Search Required)

- **Group Suggestions**: AI analysis using vector embeddings to recommend the top 3-5 most semantically similar groups for each card. This requires comparing card content embeddings against existing group embeddings to identify thematic relationships, word families, and conceptual categories that pure text search cannot capture.

- **Duplicate Detection**: Vector similarity search to identify potentially duplicate or heavily overlapping cards before creation. Users often re-enter vocabulary terms months later in different phrasings, and semantic similarity detection is essential for maintaining data quality.

- **Batch Processing Architecture (To Explore)**: To optimize performance and user experience, vector search operations (Group Suggestions and Duplicate Detection) may benefit from asynchronous processing rather than real-time execution. This approach requires exploration to address key challenges:
  - **Data consistency concerns**: Pre-computed suggestions may become stale if cards or groups are modified after batch processing runs
  - **Implementation strategies to evaluate**:
    - **Periodic batch processing**: Cron-triggered background jobs processing entire inbox at regular intervals, with invalidation strategies for changed data
    - **Prefetch processing**: Background processing of next 5-10 inbox items when user loads Card Entry interface
    - **Hybrid approach**: Real-time processing with background pre-warming of expensive operations
  - **Cache invalidation requirements**: Mechanisms to detect when pre-computed suggestions are outdated due to card/group changes
  - **Fallback strategies**: Graceful degradation to real-time processing when cached results are unavailable or stale
  - **User experience considerations**: Interface design that handles both instant (cached) and delayed (real-time) suggestion scenarios

#### Additional 1.0 Features

- **Prompt Drafting**: AI analysis of rough notes to suggest clear, effective study prompts (creates draft cards for review)
- **Example Sentence Creation**: Generation of contextually appropriate usage examples
- **Definition Refinement**: Conversion of rough explanations into precise, study-friendly content
- **Mnemonic Brainstorming**: AI-generated memory aids based on existing mnemonic patterns from related groups. Uses Group Suggestions results to query related cards and their mnemonics, then prompts LLM with this context to suggest relevant memory aids for the new card.
- **Draft Card Review**: Interface for bulk review and approval of AI-generated card suggestions

#### Future Enhancement Features

- **Pattern Recognition**: Identification of related vocabulary and grammar patterns

## User Experience Considerations

### Workflow Efficiency

- **Rapid Capture**: Minimal steps required to add notes to the inbox
- **Flexible Processing**: Users can process when convenient, not immediately upon capture
- **Progress Tracking**: Clear indication of inbox status and processing progress
- **Context Preservation**: Original note content always visible during processing

### Interface Design

- **Inbox Overview**: Clear display of pending notes with entry timestamps
- **Processing Workspace**: Dedicated interface for converting notes to cards
- **Group Management**: Easy access to existing groups and creation of new ones
- **Preview and Edit**: Ability to review and modify cards before final creation

### Cross-Language Management

- **Language Switching**: Clear interface for selecting which language's inbox to view
- **Visual Distinction**: Clear indicators showing current language context
- **Isolation Enforcement**: Prevention of accidental cross-language contamination
- **Bulk Language Operations**: Language-specific inbox management tools

## Integration Points

### With Core Card Database

- **Card Creation**: Direct addition of processed cards to the core database
- **Group Management**: Creation and assignment of cards to user-defined groups
- **Content Validation**: Ensuring card structure meets system requirements
- **Duplicate Detection**: Optional identification of potentially duplicate content

## Technical Considerations

### Data Management

- **Language Segmentation**: Separate inbox storage for each language
- **Entry Sequencing**: Reliable timestamp-based ordering of notes
- **Processing History**: Optional tracking of note-to-card transformations

### Performance

- **Large Inbox Handling**: Efficient display and search of extensive note collections. Possibly involving paging.
- **External Integration Responsiveness**: Fast handling of incoming notes from external sources

### Extensibility Framework

- **Plugin Architecture**: Support for custom integration modules
- **API Design**: Well-defined interfaces for external system connections
- **Configuration Management**: User control over integration preferences and settings
- **Error Handling**: Robust management of failed imports or processing errors

## Architectural Considerations

### Mini-Application Design

- **Independent Operation**: Card Entry functions as a standalone mini-application
- **Shared Database Access**: Write access to core card database for creating new content
- **No SRS Dependency**: Does not require or maintain spaced repetition metadata
- **Extensible Framework**: Architecture supports multiple specialized card entry applications

### Cross-Application Coordination

- **Database Consistency**: Ensures new cards meet requirements for other mini-applications
- **Real-Time Updates**: Other applications immediately see newly created cards (because they access the common card database)
- **User Experience Continuity**: Smooth transitions between card creation and other study activities
- **Language Context Management**: Maintains proper language isolation across the entire system

### Future Enhancement Framework

- **AI Integration Points**: Designed interfaces for future AI assistance features

### Multi-Frontend Architecture

- **Platform-Agnostic API**: Core backend functionality exposed through general-purpose APIs not tied to any specific frontend technology
- **Web-Based Initial Implementation**: Initial user interface will be web-based for rapid development and cross-platform accessibility
- **Mobile and Desktop Ready**: API design supports future development of native mobile apps and desktop applications
- **Frontend Independence**: Business logic and data management remain separate from presentation layer to enable multiple client applications
