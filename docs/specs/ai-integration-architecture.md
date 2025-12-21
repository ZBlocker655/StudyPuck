# AI Integration Architecture

**Status**: Complete ✅
**Last Updated**: December 21, 2025  
**Dependencies**: Database Schema Design (completed), AI Service Selection (completed)

## Design Outcome Summary

This document captures the complete AI integration architecture for StudyPuck's translation drill generation system. The design emphasizes cost efficiency, vendor flexibility, and simple implementation while maintaining educational quality.

### Key Architectural Decisions Made

1. **Single Sentence Generation**: 1-4 cards per sentence with natural AI selection
2. **Deterministic Rotation**: LRU-based card selection to ensure balanced coverage
3. **Batch Caching Strategy**: 8-10 sentences per generation with context-based invalidation
4. **Prompt Engineering QA**: Token-efficient quality assurance without AI self-validation
5. **CEFR Personalization**: Language-level storage with optional drill-level override
6. **Universal Template Approach**: Single template for all language pairs in V1
7. **Cost-Optimized Performance**: Vendor flexibility with acceptable latency trade-offs

## Implementation-Ready Architecture

- **Card Selection**: Modular 6-8 LRU candidate algorithm
- **Caching**: Cloudflare KV with context hash keys and background refill
- **Personalization**: CEFR levels integrated into prompt generation
- **Quality Assurance**: Strong prompt engineering with minimal post-processing
- **Vendor Strategy**: Easy switching between Gemini Flash and GPT-4o-mini

## Core AI Use Cases

### 1. Translation Drill Generation
**Primary Function**: Generate single sentences incorporating 1-4 active vocabulary cards for translation practice.

**Input Context**:
- Active cards from `translation_drill_context` table (with usage weighting)
- Card selection algorithm: 1-4 cards per sentence, weighted by usage frequency
- User language proficiency level
- Session history/difficulty preferences

**Output Requirements**:
- Single contextually appropriate sentence using selected vocabulary
- Explicit reporting of which cards/words were incorporated
- Natural sentence structure appropriate for target language
- Difficulty scaling based on user preferences

**Selection Strategy**:
- **Rotation Algorithm**: Deterministic preference for least-recently-used cards
- **AI Flexibility**: Choose 1-4 cards naturally based on sentence construction potential
- **Natural Selection**: AI prioritizes good sentence flow over forcing incompatible cards together
- **Isolation Handling**: Difficult-to-combine cards will naturally appear in separate sentences
- **Coverage Guarantee**: Systematic rotation ensures all context cards get used over time

### 2. Card Review Assistance
**Primary Function**: Provide contextual explanations, mnemonics, and usage examples during card review.

**Input Context**:
- Individual card content
- User's review history and difficulty patterns
- Related vocabulary (from same group or semantic field)
- User-defined learning preferences

**Output Requirements**:
- Memorable mnemonics
- Usage examples with cultural context
- Explanation of nuances or common mistakes

### 3. Content Enhancement
**Primary Function**: Enrich manually entered cards with examples, pronunciations, and learning aids.

**Input Context**:
- Raw card content (word/phrase)
- Target language and user's native language
- Existing card examples (for consistency)
- User's vocabulary level

**Output Requirements**:
- Natural example sentences
- Pronunciation guides
- Cultural usage notes
- Related vocabulary suggestions

## Architecture Components

### AI Service Layer
```
Frontend Request 
    ↓
SvelteKit API Route
    ↓  
Cloudflare Workers (AI Proxy)
    ↓
Google Gemini Flash / GPT-4o-mini
```

### Prompt Engineering Strategy

#### V1 Implementation: Single Sentence Generation
- **Context Window**: Send 6-8 least-recently-used cards as candidates
- **Card Selection**: AI chooses 1-4 cards naturally from candidate pool
- **Modular Selection**: Isolated algorithm for card candidate selection (easily tunable)
- **Response Format**: Structured JSON with sentence + used_card_ids array
- **Natural Flow**: AI prioritizes sentence quality over forcing card combinations
- **Variety Strategy**: Intentional complexity mix in each batch for active recall stimulation
  - 2-3 single-card sentences (isolation practice)
  - 3-4 two-card sentences (common combinations)
  - 2-3 three-card+ sentences (complexity challenge)

#### Future Enhancements
- **Difficulty Scaling**: User-adjustable complexity (single sentence → paragraphs → dialogues)
- **Context Expansion**: Multi-sentence scenarios and conversation contexts
- **Cultural Integration**: Situational appropriateness and cultural context

#### Template System
- **Base Templates**: Core prompt structures emphasizing natural sentence construction
- **Card Injection**: Rotation-sorted card candidates with usage metadata
- **Language Pairs**: Specialized templates per language combination
- **Flexibility Emphasis**: Prompts encourage natural card selection over forced combinations

### Caching Strategy

#### Batch Generation & Caching
- **Batch Size**: 8-10 sentences per AI request (balance cost vs. waste risk)
- **Cache Storage**: Cloudflare KV with context-based cache keys
- **Variety Strategy**: Mix of sentence complexities (1-4 cards) for unpredictable user experience
- **Background Refill**: Generate new batch when cache drops to 3-4 sentences
- **Context Invalidation**: Auto-invalidate when active context changes (minimize token waste)

#### Cache Key Strategy
- **Hash Composition**: `drill_cache_{user_id}_{language_id}_{context_hash}`
- **Context Hash**: MD5 of sorted active card IDs + rotation state
- **Rotation Tracking**: Include least-recently-used card priorities in hash
- **Automatic Invalidation**: Context changes (dismiss/draw) trigger cache cleanup

#### Context Change Detection
- **Triggers**: Card dismissal, snooze, new draws from pile, manual additions
- **Background Cleanup**: Remove invalid cache entries when context modified
- **Cache Miss Handling**: Generate new batch when cache empty or invalid
- **Performance Target**: Serve cached sentences instantly, batch regenerate in background

### Cost Management

#### Request Optimization
- **Batch Operations**: Generate 8-10 sentences per AI call (balance cost efficiency vs. waste)
- **Smart Caching**: Context-aware sentence caching with automatic invalidation
- **Background Regeneration**: Refill cache when dropping to 3-4 sentences
- **Modular Card Selection**: Isolated algorithm for candidate selection (6-8 LRU cards)
- **Waste Prevention**: Conservative batch sizes to minimize invalidated sentence loss

#### Rate Limiting
- **User Quotas**: Daily/monthly AI operation limits
- **Request Throttling**: Prevent API abuse
- **Priority Queuing**: Critical operations first
- **Cost Alerts**: Monitor and alert on usage spikes

## Implementation Sections

*[To be expanded in subsequent discussions]*

### Section 1: Prompt Engineering Deep Dive
- Template design patterns
- Context injection strategies  
- Language-specific optimizations
- Quality assurance approaches

### Section 2: Caching Architecture  
- Cache invalidation strategies
- Performance optimization
- Storage cost management
- Cache warming strategies

### Section 3: API Integration Patterns
- Request/response handling
- Error recovery mechanisms
- Fallback service coordination
- Monitoring and alerting

### Section 4: Cost Control Implementation
- Usage tracking mechanisms
- Rate limiting algorithms  
- Budget management features
- User quota enforcement

## Key Questions for Discussion

1. ✅ **Prompt Complexity**: Single sentence generation with 1-4 cards per sentence
2. ✅ **Context Window Management**: 6-8 LRU cards as candidates, modular selection algorithm
3. ✅ **Caching Strategy**: Batch generation (8-10 sentences) with variety mix, conservative waste prevention
4. ✅ **Quality Assurance**: Prompt engineering approach for token efficiency
5. ✅ **User Personalization**: CEFR levels (A1-C2) stored per language with optional drill-level override
6. ✅ **Multi-language Support**: Universal template for V1, evolve to language-specific if needed
7. ✅ **Performance Targets**: Cost optimization with vendor flexibility, 8-10 sentence batches, 2-3s acceptable

## Architecture Decisions Made

### Card Selection & Usage Balancing
- **Selection Range**: 1-4 cards per generated sentence (AI chooses naturally)
- **Rotation Strategy**: Deterministic least-recently-used prioritization
- **AI Flexibility**: Prioritize sentence quality over forcing incompatible combinations
- **Response Format**: JSON structure with sentence + array of used card IDs
- **Variety Strategy**: Intentional complexity distribution for active recall stimulation

### Batch Generation & Caching Strategy  
- **Batch Composition**: 8-10 sentences with complexity variety (2-3 single-card, 3-4 two-card, 2-3 multi-card)
- **Context Window**: 6-8 LRU cards sent as candidates per batch generation
- **Refill Strategy**: Generate new batch when cache drops to 3-4 sentences
- **Waste Prevention**: Conservative batch sizes to minimize invalidation loss
- **Modular Design**: Isolated card selection algorithm for easy tuning
- **CEFR Integration**: Use language-level or drill-override CEFR in all generation prompts

### Quality Assurance Strategy
- **Primary QA**: Strong prompt engineering with detailed guidelines and examples
- **Token Efficiency**: No AI self-validation to minimize token costs
- **Minimal Post-Processing**: Basic automated checks (vocabulary inclusion, length, encoding)
- **V1 Approach**: Manual assessment by developer during initial usage
- **Future Enhancement**: User feedback system can be added later if needed

### CEFR Personalization Strategy
- **Language-Level Storage**: Base CEFR level (A1-C2) stored in `study_languages` table
- **Drill-Level Override**: Optional per-session CEFR override in `translation_drill_context`
- **Default Behavior**: Use language-level CEFR, fall back to override if set
- **Cross-App Consistency**: All AI generation uses same CEFR level per language
- **Prompt Integration**: "Generate sentences appropriate for CEFR level B1..."

### Multi-Language Template Strategy
- **V1 Approach**: Universal template for all language pairs
- **Rationale**: Start simple, avoid premature optimization, reduce development complexity
- **Evolution Path**: Add language-specific refinements based on real usage patterns
- **Template Focus**: Natural English sentences with varied structures for good translation practice
- **Future Enhancement**: Language-pair specific templates if construct-nudging proves valuable

### Performance & Cost Strategy
- **Latency Acceptance**: 2-3s generation delays acceptable for fresh content
- **Vendor Flexibility**: Avoid lock-in, design for easy AI service switching
- **Cost Optimization**: Prefer cheaper options (Gemini Flash) if quality acceptable
- **Batch Size**: Maintain 8-10 sentences for cost/waste balance
- **Quality Gate**: Switch vendors if quality becomes unacceptable

### Database Schema Implications
The rotation strategy requires tracking in `translation_drill_context`:
- `last_used`: Timestamp of most recent selection (primary sort key)
- `usage_count`: Total usage tracking (secondary metric)
- `cefr_override`: Optional drill-level CEFR override (A1-C2)
- **Selection Algorithm**: ORDER BY last_used ASC NULLS FIRST, then let AI choose naturally from top candidates
- **CEFR Logic**: Use cefr_override if set, otherwise use study_languages.cefr_level
- **Schema Update**: Added rotation fields and CEFR override to translation_drill_context table

### Schema Update Guidelines
- **Rule**: Always edit CREATE TABLE statements directly rather than using ALTER TABLE
- **Rationale**: Maintains clean, authoritative schema definition
- **Implementation**: Schema changes update the master CREATE statements

### Cache Implementation Details
- **Batch Size**: 8-10 sentences per AI request (balance cost vs. invalidation waste)
- **Cache Structure**: JSON array of {sentence, used_card_ids, created_at}
- **Context Hashing**: MD5 of sorted active card IDs + rotation state
- **Refill Trigger**: Generate new batch when cache drops to 3-4 sentences
- **Variety Goal**: Unpredictable sentence complexity to stimulate active recall

### Context Window Strategy
- **Candidate Selection**: Modular algorithm sends 6-8 least-recently-used cards
- **AI Flexibility**: Choose 1-4 cards naturally from candidate pool
- **Rotation Guarantee**: All cards eventually appear as candidates
- **Tunable Parameters**: Easy adjustment of candidate pool size (6-8 range)

## Success Criteria

- **Response Quality**: 90%+ of generated content is educationally appropriate
- **Performance**: <2s cached responses, 2-3s fresh generation acceptable
- **Cost Efficiency**: <$0.10/user/month average AI costs (optimize for cost with quality gate)
- **User Experience**: Seamless integration with existing workflows
- **Scalability**: Architecture supports 10x user growth without major changes
- **Vendor Flexibility**: Easy switching between AI providers if quality/cost changes

---

*Next: Begin with Section 1 - Prompt Engineering Deep Dive*
