# Usage Statistics Requirements

## Overview

StudyPuck provides comprehensive usage statistics to track learning progress and maintain motivation, similar to Anki's statistical features. Each mini-application maintains independent statistics while following the established user/language partitioning pattern.

## Core Principles

### Application-Specific Statistics
Each mini-application (Card Entry, Card Review, Translation Drills) maintains its own daily statistics tables, reflecting the independent nature of these applications and enabling specialized metrics relevant to each learning mode.

### Daily Aggregation Pattern
Statistics are aggregated daily rather than storing individual events, providing efficient storage while supporting meaningful progress visualization through charts and trends.

### User/Language Partitioning
All statistics follow the established pattern of partitioning by `(user_id, language_id)` to maintain data isolation and support multi-language learning workflows.

## Statistics by Application

### Card Entry Statistics
- **Inbox Activity**: Notes captured, processed, deferred, and deleted
- **Card Creation**: Draft cards created, cards promoted to active status
- **Organization**: New groups created during processing

### Card Review Statistics  
- **Review Activity**: Cards reviewed, total study time
- **Performance Tracking**: Cards rated by difficulty (easy/medium/hard)
- **State Management**: Cards snoozed, disabled, or pinned to translation drills
- **Cross-Application Integration**: Cards moved to translation drill context

### Translation Drills Statistics
- **Translation Practice**: Sentences translated, total session time
- **Context Management**: Cards dismissed, snoozed, drawn from groups
- **Learning Organization**: New context groups added to practice rotation

## Visualization and Analytics

### Progress Charts
Daily activity charts showing study consistency across applications, enabling users to:
- Track study streaks and identify patterns
- Compare activity levels across different learning modes
- Monitor long-term progress trends

### Performance Trends
Application-specific performance metrics over time:
- Review efficiency (time per card) in Card Review
- Translation practice volume in Translation Drills  
- Processing velocity in Card Entry

### Cross-Application Analysis
Comparative analytics showing how different learning methods contribute to overall progress, helping users optimize their study approach.

## Implementation Approach

### Hybrid Architecture
Statistics use a hybrid approach that maintains the current snapshot-based database architecture while adding lightweight daily aggregation for analytics.

### Real-Time Updates
Statistics increment in real-time during user actions using efficient upsert patterns (`INSERT ... ON CONFLICT DO UPDATE`) to maintain daily totals without complex event processing.

### Future Extensibility
The statistics framework is designed to support additional metrics and applications as StudyPuck evolves, maintaining consistency with the multi-application architecture.

## Privacy and Data Management

### User Data Control
Statistics remain under full user control, following the same data ownership principles as core study data.

### Language Isolation
Statistical data maintains proper isolation between languages, supporting users who study multiple languages independently.

### Data Retention
Daily statistics are preserved long-term to enable meaningful progress analysis, while individual user actions are not logged beyond their contribution to daily aggregates.