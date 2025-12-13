# Cards

Cards are the core database of study assets in StudyPuck. They serve as the primary shared data repository that multiple mini-applications consume to provide different learning experiences.

## Architectural Role

Cards function as the central data layer of the StudyPuck system:

- **Core Database**: Cards contain the vocabulary, grammar patterns, and language concepts that form the foundation of language learning
- **Mini-Application Consumer Model**: Multiple applications (Card Review, Translation Drills, future applications) consume card data
- **Read-Only for Applications**: Mini-applications read card content but maintain their own separate metadata (SRS schedules, review history, application-specific states)
- **Shared Resource**: The same card can be used simultaneously across different learning contexts with independent tracking

## Content Types

Cards can contain various types of language learning material:

- **Single words**: Basic vocabulary items
- **Grammar chunks**: Language patterns that form sentence structures
- **Sentence patterns**: Common constructions in the target language
- **Complex prompts**: More nuanced language concepts
  - Example: "Difference between 东西 and 事情"
- **Practical examples**: Real-world usage demonstrations
  - Example: "越来越 (adjective) to express 'more and more...'"

## Structure

Unlike traditional flashcards, StudyPuck cards are structured as study prompts rather than front/back pairs:

- **Study prompts**: Open-ended cues that encourage active recall
- **Multiple example sentences**: Demonstrate usage in context during review
- **Mnemonic prompts**: Personal memory encoding reminders for how you decided to remember a word or concept
- **LLM instructions**: Optional guidance for how the AI should use this card when generating translation sentences
- **Variable length**: Can range from a few words to full paragraph prompts

## Organization

Cards are organized using a flexible grouping system:

- **User-defined groups**: Named collections like "concrete nouns", "grammar patterns", or "common verbs"
- **Language-specific**: Groups are separate for each language being studied. For example a "Storytelling" group would belong to one language, even though another language could have its own "Storytelling" group.
- **Multiple membership**: Cards can belong to more than one group simultaneously. For example, a Card for the word 经历 could belong to a group called "Storytelling" and also "_历 word family" (meaning words ending in the 历 hanzi character).
- **Application-Independent**: Card organization exists at the core database level and is shared across all mini-applications

## Mini-Application Integration

Cards serve different purposes across the various mini-applications:

- **Card Review**: Uses cards for systematic spaced repetition review, maintaining its own SRS metadata
- **Translation Drills**: Incorporates cards into LLM context for translation practice, with separate SRS tracking
- **Card Entry**: Provides interface for creating and editing card content in the core database
- **Future Applications**: Additional mini-applications can be built that consume the same card database with their own learning mechanics

## Example Cards

### Word Card example

**经历** - this is both the title and the study prompt itself

- **Type**: word
- **Groups**: storytelling, 经_ word family, _历 word family
- **Meaning**: experience (that one has gone through)
- **Mnemonic**: "Go through here and experience something nice inside, which might not be legal!"
- **Example sentence**: "这次旅行是一次特别的经历。This trip was a special experience."

### Complex prompt Card example

- **Content**: 经历 (experience you go through) vs. 经验 (experience to gain knowledge and skill)
- **Type**: complex prompt
- **Groups**: storytelling

This organization system allows for flexible study patterns while maintaining clear structure for both systematic review and AI-powered translation practice.
