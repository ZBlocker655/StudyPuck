# Core Application Structure

StudyPuck is organized around a few primary components.

## Cards

Study prompts containing vocabulary, grammar patterns, and learning context. These are not traditional flashcards with front/back sides, but rather structured prompts that help organize user's language learning materials. Cards can represent single words, grammar chunks, sentence patterns, or more complex language concepts.

## Card Entry

A low-friction system for adding new Cards to the collection. Think of it like an inbox, where the items in it need to be refined, finalized, fleshed out, sorted into groups, and otherwise prepared for study.

## Card Review

A spaced repetition system for browsing and managing Cards. It's not meant to work like flashcards with question/answer and right/wrong motif. It's just meant to get the user thinking about their words (and associated mnemonics and example sentences) on a regular basis.

## Translation Drills

An LLM-powered conversation interface that provides active practice with Cards. Rather than passive recall, this component generates varied sentences for the user to translate into their target language.

These four components work together cyclically - enter new material, review it systematically, practice it actively through translation, and repeat with new Cards.

## Usage Statistics

Each mini-application tracks daily usage statistics to provide Anki-style progress visualization and motivation features. This includes metrics like cards reviewed, sentences translated, study time, and application-specific actions. Statistics are maintained separately for each application while following the established user/language partitioning pattern.
