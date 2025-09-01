# StudyPuck_Requirements

## Overview

### Mission statement

- Importance of active recall vs. ordinary flashcards (passive recall)
- Easy-to-maintain, easy-to-deploy project for professional portfolio and technology learning

### Core application structure

- Conversation (main translation drill)
- Spaced Repetition System (SRS)

## Functional_Requirements

### Conversation

- Continuous translation drills with the LLM
  - Always easily reachable from any other point in the web UI
- Real-time feedback from LLM
- User actions within Conversation:
  - View current Cards up for study (with optional gradual reveal)
  - Edit Cards (expand scope, add alternative words, modify study prompts)
  - Evaluate performance (add notes for RAG enhancement)
  - Dismiss/snooze Cards (spaced repetition adjustments)
  - Load new Cards into active context
  - Turn Cards on/off for study
  - Create new Cards based on recent sentences or external input

### Spaced_Repetition_System (SRS)

- Concept of multiple, user-defined named queues
- Example queues: "Concrete nouns," "Grammar patterns," "Common verbs"
  - When creating Cards, LLM will guess which named queue and prepopulate that field
- User specifies queue when pulling new Cards into active study
- Cards are study prompts (not traditional flashcards)
  - i.e. no front and back
- Cards can contain study instructions for LLM

### Language_Islands

- Thematic study sets with full sentences and vocab lists
- Function alongside Cards in SRS
- Special LLM behaviors:
  - Present exact sentences for translation
  - Provide slight sentence variations
  - Generate new sentences using Island vocab

### Language_Island_Builder

- Separate mode from Conversation
- User creates new Language Islands:
  - Manually input sentences
  - Generate candidate sentences via LLM (accept/reject/modify)
  - LLM can engage user in topic-specific dialog to elicit relevant content, then distill it into sentences
- Add finalized Language Island to SRS queue

### Multi-Language_Support

- User can study multiple languages (one at a time)
- Separate Conversation and SRS per language
- Custom queues per language (e.g., "Chengyu" queue for Chinese)
- Users can add new languages as needed
- Users can import Language Islands from other languages:
  - When adding a new Language Island, user chooses to create from scratch or import
  - Imported Language Island copies English content from another language mode
  - Sentences are automatically translated into the new target language

### LLM_Behavior

- System prompt designed for:
  - Creative sentence formation
  - Balanced use of multiple Cards (one or two per sentence)
  - Concise, specific feedback on grammar and usage
- Context window management:
  - Retain system prompt + active Cards (not entire conversation)
- Separate LLMs for sentence formation and feedback?

## Non-Functional_Requirements

- Simple and intuitive UI/UX
- Fast, low-friction Card and Language Island creation
- Cloudflare-based serverless architecture
- Efficient data storage and retrieval (D1 for main data, R2 for session logs)
- Modular design to allow future LLM fine-tuning
- Secure authentication and user data management
