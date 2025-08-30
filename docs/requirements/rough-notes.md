# Rough notes

* The overall mission of the app is to promote active recall, not passive memorization like traditional SRS/Anki. The app is for language learners who want to *produce* fluent and grammatically correct sentences, not just recognize vocabulary.

* Two main parts: the **Conversation** and the **SRS**. The Conversation is a continuous loop of sentence translation and feedback, driven by the LLM. The SRS consists of "Cards" and "Language Islands."

* **Cards**:

  * Not traditional flashcards. No front/back. More like study prompts.
  * Example: "越来越 (adjective) to express 'more and more...'"
  * Can be just a few words or full paragraph prompts.
  * Stored in queues. Queues are user-defined and named (e.g. "concrete nouns", "grammar patterns", "common verbs").
  * Queues differ per language. They are not shared.
  * Cards can include optional instructions to the LLM on how to use the card when generating sentences.
  * Cards can be edited at any time during the Conversation.
  * Cards can be snoozed, evaluated, or turned off from current study.
  * Cards may be created on-the-fly during Conversation based on a sentence or from scratch.

* **Language Islands**:

  * Represent a topic area the user wants to be able to talk about.
  * Include multiple English sentences with their translations into the target language.
  * May include vocabulary lists.
  * Studied like Cards but with special rules:

    * LLM might present a sentence for back translation.
    * May offer slightly modified sentence to avoid rote memorization.
    * Can pull vocab from the island to generate new content.

* **Language Island Builder**:

  * Separate from the main Conversation (probably a different page).
  * User starts by describing the topic.
  * Can manually input sentences.
  * LLM can generate sentences based on topic or back-and-forth with user.
  * User accepts/rejects/modifies LLM suggestions.
  * Finalized island is saved to an SRS queue of user's choice.

* Language Islands can be **imported across languages**:

  * When creating a new island, user can choose to import one from another language.
  * App copies the English side.
  * Then translates it into the new target language.

* The Conversation is the main usage mode.

  * LLM uses a system prompt and active Cards only (no entire conversation history).
  * At any time user can:

    * See Cards in current context (with optional reveal mechanics)
    * Edit cards
    * Snooze or dismiss
    * Add new cards from queues
    * Create new cards from recent sentences or external idea
    * Evaluate their success and add notes

* LLM behavior requirements:

  * Be creative when forming sentences.
  * Prefer 1–2 cards per sentence (from different queues when possible).
  * Give concise but specific feedback on grammar and usage.

* Users can study multiple languages, but only one at a time.

  * Each language has its own Conversation and SRS system.
  * Queues and islands are per-language.
  * UI will clearly show current language mode.
  * Users can switch between languages or add new ones.

* Card and Island creation should be as low-friction as possible.

  * Can happen in-flow during Conversation or in dedicated builder modes.

* Future enhancement plans include:

  * Logging full translation sessions.
  * Using R2 to store logs.
  * Possibly fine-tuning own model using HuggingFace/spaCy.
  * LLM should have RAG context including current Cards and user feedback/evaluation.
  * Modular design so GPT-4 can be swapped out for custom model later.
