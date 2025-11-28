# Rough notes

* The overall mission of the app is to promote active recall, not passive memorization like traditional SRS/Anki. The app is for language learners who want to manage their vocabulary learning and practice, while at the same time *produce* fluent and grammatically correct sentences using their acquired vocabulary.

* The main features for the first version are: entering new vocabulary to study, reviewing that vocabulary systematically, and translation drills where an LLM has in context the vocabulary that the user wants to review, and crafts English sentences for the user to translate into the target language, then providing feedback on the user's work.

* **Cards**:

  * Primary asset owned by the user. Can represent single words, or language/grammar chunks that form sentence patterns.
  * Can also be more complicated prompts such as: "Difference between 东西 and 事情".
  * Not traditional flashcards. No front/back. More like study prompts.
  * Example: "越来越 (adjective) to express 'more and more...'"
  * Can be just a few words or full paragraph prompts.
  * Can contain multiple example sentences (useful during review).
  * Can contain mnemonic prompts (reminding the user how they decided to encode a given word in memory.)
  * Stored in groups. Groups are user-defined and named (e.g. "concrete nouns", "grammar patterns", "common verbs").
  * Groups differ per language. They are not shared.
  * Cards can belong to more than one group.
  * Cards can include optional instructions to the LLM on how to use the card when generating sentences.
  * Cards can be snoozed, evaluated, or turned off from current study.

* **Card review**

  * In this feature the user can browse a specified group of study Cards.
  * User can browse by group or by subset within that group (by number perhaps?)
  * Similar to how a spaced repetition system works, app keeps track of when a card was last reviewed.
  * App tries to put less recently reviewed cards in front of user.
  * User, after reviewing a card, can help app choose how long to wait to see it next.
  * App knows the default options for how long to wait, based on SRS algorithm.
  * User should be able to add any Card being reviewed into the study context (for translation drills - see below).
    * If a card is added into context like this it would appear in a specialized group "Pinned".

* **Translation drills**

  * User interacts with an LLM in a conversation-style interface.
  * There is also a current context of which Cards the LLM can use to craft translation prompts.
  * In context, Cards are organized by group primarily. There is an SRS system (separate from the one for vocab review) that governs which Cards are top of each group, and in context for review.
  * The user can snooze/disable current Cards.
  * The user can dismiss current Cards (in which case they are given a next date where they come up according to the SRS algorithm.)
  * The user can draw more Cards from any group into the context.
  * During translation drills, LLM, given Cards in context, creates English sentences for user to translate into target language.
  * User enters answer in target language, and LLM responds by evaluating the answer and providing guidance if necessary.

* LLM behavior requirements:

  * Be creative when forming sentences.
  * Prefer 1–2 cards per sentence (from different queues when possible).
  * Give concise but specific feedback on grammar and usage.

* Users can study multiple languages, but only one at a time.

  * Each language has its own Cards and groups, and context for translation drills.
  * UI will clearly show current language mode.
  * Users can switch between languages or add new ones.

* **Card entry**

  * Ideally should be as low friction as possible.
  * There is a special "inbox" queue of rough notes that will be turned into Cards and organized with groups, mnemonics, example sentences, etc.
  * Processing this inbox queue should be another top-level application activity (on equal billing as Card Review, and Translation Drill).

* Future enhancement plans include:

  * Logging full translation sessions.
  * Using R2 to store logs.
  * Possibly fine-tuning own model using HuggingFace/spaCy.
  * LLM should have RAG context including current Cards and user feedback/evaluation.
  * Modular design so GPT-4 can be swapped out for custom model later.
  * Expanding application scope to bring in more aspects of language learning and study.
