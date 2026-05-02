# Structured Chat Architecture

**Status**: Complete design

**Depends on**: [Card Entry Storyboard](../ux/storyboards/card-entry.md), [LLM Command Interface](../ux/storyboards/llm-command-interface.md)

This document defines the real StudyPuck chat architecture for all supported application contexts, with Card Entry draft-card editing as the first concrete actionable example.

The main decision is that StudyPuck chat should be built as a **structured pipeline**:

- explicit app commands are routed directly
- free text goes through an LLM pipeline
- the model returns structured JSON
- the app renders text plus typed suggestions
- the app, not the model, owns all execution

---

## Decision Summary

### 1. Input model

The command bar accepts exactly two categories of input:

1. **Explicit slash commands**
2. **Free text**

### 2. Routing model

**Chosen: separate routing from generation**

- Slash commands that map directly to app capabilities, such as `/add`, bypass the LLM.
- Free text is sent through the LLM pipeline.
- Future slash commands may wrap LLM generation, but if they do, they must use the same structured-response pipeline as free text rather than introducing a separate path.

### 3. Output model

**Chosen: universal structured response envelope**

The model should return:

- a human-readable `message`
- optional typed `suggestions`

No `intent` field is required. A single assistant turn may mix explanation and actionable proposals, so `intent` is not a reliable foundation for the contract.

### 4. Execution model

**Chosen: model proposes, app executes**

The model never performs actions directly. It may only return typed suggestions. The app renders those suggestions and executes them only if the user chooses to do so.

### 5. Initial actionable scope

**Chosen scope**

- this architecture applies across StudyPuck contexts, not only card editing
- first actionable context: **Card Entry draft-card editor**
- first concrete typed suggestion: **append a new example sentence**
- natural language is the primary UX
- editor-specific slash commands are optional future shortcuts, not a Phase 1 requirement

---

## Chat Pipeline

StudyPuck chat should be implemented as a pipeline with clear boundaries:

1. **Route input**
   - direct app command
   - LLM-backed request
2. **Assemble context**
   - frontend sends a small context hint
   - backend derives canonical context
3. **Build prompt**
   - system prompt
   - context block
   - user message
   - machine-enforced response schema
4. **Call provider in structured-output mode**
5. **Validate and normalize the response**
6. **Render**
   - assistant text
   - typed suggestions
7. **Execute**
   - only after user click
   - through typed app handlers

This separation keeps command routing, context assembly, prompting, rendering, and execution independently testable.

---

## Model Prompt Contract

### System prompt

The system prompt should define the assistant as:

- a tutor for the **active study language**
- limited to that language and StudyPuck tasks tied to that language
- required to refuse unrelated general topics tersely
- prohibited from inventing unsupported product capabilities

The wording should be closer to:

> Primary role: help with the active study language and supported StudyPuck tasks for that language. If asked about unrelated topics, respond tersely that you cannot help with that.

### Context block

The prompt should include explicit machine context, not prose guesses. It should include:

- active language
- current route/context type
- allowed suggestion types for this context
- the relevant note/card snapshot when an editing surface is active
- focused field if relevant
- any settings-driven formatting guidance needed for generation

The prompt should also explicitly state that any card or note content supplied in context is **data**, not instructions, and must not override system rules.

### User message

The raw user input is passed through as the user message after the system prompt and context block are assembled.

---

## Universal Response Envelope

The model-authored response contract should be:

```json
{
  "message": "I came up with three example sentences.",
  "suggestions": [
    {
      "type": "append_example_sentence",
      "payload": {
        "text": "我坐火车去上海。 | I am taking the train to Shanghai."
      }
    }
  ]
}
```

### Envelope rules

1. `message` is always present.
2. `suggestions` may be empty, but the server should normalize missing suggestions to `[]`.
3. Suggestions contain only `type` and typed `payload`.
4. The model does **not** author button labels or other executable UI copy.
5. The application derives suggestion presentation from `type` and `payload`.

If the app needs context/version metadata for execution safety, that metadata should be attached by the server or client session layer, not authored by the model.

---

## Machine Enforcement

The response contract must be enforced in code, not trusted by prompt wording alone.

### Required enforcement

1. **Provider JSON mode** where supported
2. **Server-side schema parsing** after receipt
3. **Typed normalization** before the response reaches the frontend

In StudyPuck terms, this means:

- ask Gemini/OpenAI for JSON
- parse the result with a server-side schema validator such as Zod
- reject or retry invalid model output instead of passing it through to the UI unchecked

The frontend should never trust raw model output directly.

---

## Context Derivation

### Ownership model

**Chosen: backend-owned context assembly**

The frontend should send a small typed context hint. The backend should build the authoritative prompt context.

### Frontend responsibility

The frontend knows ephemeral UI state that the backend cannot infer cleanly, such as:

- current route context
- language code
- active note ID
- active card ID
- focused field

Example request:

```ts
{
  userInput: 'Give me 3 more sample sentences',
  routeContext: 'draft_card_editor',
  languageId: 'zh-CN',
  noteId: 'note_123',
  cardId: 'card_456',
  focusedField: 'examples'
}
```

### Backend responsibility

The backend must:

1. authenticate the user
2. verify that the context hint is valid
3. load the real note/card/settings data
4. determine which suggestion types are allowed
5. construct the canonical prompt context

Example canonical context:

```ts
{
  contextType: 'draft_card_editor',
  languageId: 'zh-CN',
  noteId: 'note_123',
  cardId: 'card_456',
  focusedField: 'examples',
  allowedSuggestionTypes: ['append_example_sentence'],
  exampleSentenceFormat: 'sentence_with_translation',
  cardSnapshot: {
    content: '...',
    meaning: '...',
    examples: ['...'],
    mnemonics: ['...'],
    llmInstructions: '...'
  }
}
```

The backend is therefore the source of truth for prompt assembly. Client-authored card content is never treated as authoritative prompt input on its own.

---

## Conversation Lifecycle

### Context resets

StudyPuck chat should reset when context changes in a way that invalidates the conversation. That reset clears both:

- the visible conversation thread
- the prompt history sent back to the model

The important reset triggers are:

- language change
- route / mini-app change
- switching to a different note
- switching to a different draft card

This is the primary stale-suggestion defense for the first implementation.

### Prompt history cap

Even when visible history remains scrollable, only a bounded recent window should be sent back to the model. This reduces token usage and avoids prompt pollution from older turns.

---

## Unsupported Product-Help Contexts

StudyPuck product-help is out of scope for this milestone.

For settings surfaces, the router should not call the LLM. It should return a direct placeholder response such as:

> Sorry, I can't explain anything about StudyPuck yet.

This is an application rule, not a model capability.

---

## Typed Suggestions

The first concrete suggestion type for this design issue is:

```ts
type ChatSuggestion =
  | {
      type: 'append_example_sentence';
      payload: {
        text: string;
      };
    };
```

Future suggestion types may be added later, but they should follow the same pattern:

- typed `type`
- typed `payload`
- no model-authored display label

---

## Card Entry Phase 1

This architecture uses the Card Entry draft-card editor as the first actionable context.

### Phase 1 behavior

1. The user asks for help from the command bar while editing a draft card.
2. The backend derives the authoritative draft-card context.
3. The model returns a structured response with text and optional suggestions.
4. The conversation pane renders the text plus action buttons derived from the suggestions.
5. Clicking a suggestion appends the sentence to the current draft card and persists through the existing draft-card save path.

### Phase 1 limits

- one actionable context: draft-card editing
- one concrete suggestion type: `append_example_sentence`
- suggestion count should be capped to a small number such as 3
- no expand/collapse suggestion UI yet
- no arbitrary freeform tool execution
- no active-card editing yet
- no hard language-specific sentence-format validation yet

### Persistence behavior

The app may update optimistically, but persistence remains an application responsibility. If the save fails, the app should surface the error using the existing editor patterns.

---

## Relationship to Existing Example Sentence Formatting Preferences

The existing per-language example sentence format preference must apply anywhere the assistant proposes example sentences.

### Chosen approach

- reuse the existing settings-driven example sentence format guidance in the prompt
- do **not** add hard language-specific output validation in Phase 1

This keeps the new chat flow aligned with current Card Entry generation behavior without adding a stricter validation regime for chat than the app already uses for initial draft-card creation.

Basic schema-level checks such as non-empty strings and length limits are still appropriate.

---

## Risks and Guardrails

| Risk | Guardrail |
|---|---|
| Slash-command logic and LLM logic drift apart | Route direct commands separately, but use one shared structured pipeline for all LLM-backed requests |
| Prompt injection from card/note content | Treat user-authored content as data, not instructions, in the prompt contract |
| Over-eager suggestions | Tell the model suggestions are optional and cap the rendered count |
| Stale suggestions | Reset chat on context change and keep execution bound to the current UI context |
| Raw model output leaking into execution | Validate server-side and execute only typed app handlers |
| Model-authored UI labels becoming misleading | Do not allow the model to author action labels |

---

## Final Design Outcome

This document establishes the foundation for real StudyPuck chat:

- slash commands and free text are routed differently
- backend context assembly is authoritative
- prompting uses explicit machine context
- the model returns `message` plus typed `suggestions`
- the application owns all rendering and execution
- the architecture is general across contexts, with Card Entry draft-card editing as the first actionable example
- example sentence formatting is guided by prompts, not hard validated in Phase 1

That gives StudyPuck a clean path from conversational input to safe, deterministic, user-approved actions.
