/**
 * One-time backfill: guess part_of_speech for all word-type cards that don't have one yet.
 *
 * Prerequisites:
 *   1. DATABASE_URL_PRODUCTION must be set (via Bitwarden — see .env.schema)
 *   2. GEMINI_API_KEY must be set (via Bitwarden — see .env.schema)
 *   3. Run: bw sync (if you just added DATABASE_URL_PRODUCTION to Bitwarden)
 *
 * Run with:
 *   pnpm backfill:pos:secure
 *
 * The script is intentionally left in the repo after the one-time run for documentation purposes.
 */

import postgres from 'postgres';

const VALID_POS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
  'conjunction', 'particle', 'measure_word', 'numeral', 'interjection', 'idiom',
] as const;
type PartOfSpeech = typeof VALID_POS[number];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';
const DATABASE_URL_PRODUCTION = process.env.DATABASE_URL_PRODUCTION;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set. Ensure Bitwarden is unlocked and bw sync has been run.');
}
if (!DATABASE_URL_PRODUCTION) {
  throw new Error(
    'DATABASE_URL_PRODUCTION is not set.\n' +
    'Add it to Bitwarden (field name: DATABASE_URL_PRODUCTION, value: direct Neon production connection string)\n' +
    'then run: bw sync'
  );
}

type CardRow = { card_id: string; content: string; meaning: string | null };

async function guessPosForBatch(cards: CardRow[]): Promise<Map<string, PartOfSpeech | null>> {
  const systemPrompt =
    'You are a Chinese language expert. Given a list of Chinese vocabulary cards, ' +
    'classify each card\'s part of speech. ' +
    'Valid values: noun, verb, adjective, adverb, pronoun, preposition, conjunction, ' +
    'particle, measure_word, numeral, interjection, idiom. ' +
    'If you cannot determine the part of speech with reasonable confidence, use null. ' +
    'Respond with a JSON object mapping card_id to part_of_speech (string or null).';

  const userPrompt = JSON.stringify(
    cards.map((c) => ({
      card_id: c.card_id,
      content: c.content,
      meaning: c.meaning,
    }))
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const rawText = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  let parsed: Record<string, string | null>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('Failed to parse Gemini response:', rawText);
    return new Map(cards.map((c) => [c.card_id, null]));
  }

  const result = new Map<string, PartOfSpeech | null>();
  for (const card of cards) {
    const raw = parsed[card.card_id];
    const pos = typeof raw === 'string' && (VALID_POS as readonly string[]).includes(raw)
      ? (raw as PartOfSpeech)
      : null;
    result.set(card.card_id, pos);
  }
  return result;
}

async function main() {
  console.log('Connecting to production database...');
  const sql = postgres(DATABASE_URL_PRODUCTION, { max: 1 });

  try {
    const rows = await sql<CardRow[]>`
      SELECT card_id, content, meaning
      FROM cards
      WHERE card_type = 'word'
        AND part_of_speech IS NULL
        AND status != 'deleted'
      ORDER BY created_at
    `;

    if (rows.length === 0) {
      console.log('No word cards without part_of_speech found. Nothing to do.');
      return;
    }

    console.log(`Found ${rows.length} word card(s) to classify.`);

    const BATCH_SIZE = 20;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} (${batch.length} cards)...`);

      const guesses = await guessPosForBatch(batch);

      for (const card of batch) {
        const pos = guesses.get(card.card_id) ?? null;
        if (pos) {
          await sql`
            UPDATE cards
            SET part_of_speech = ${pos}
            WHERE card_id = ${card.card_id}
          `;
          console.log(`  ✓ ${card.content} (${card.meaning ?? ''}) → ${pos}`);
          updated++;
        } else {
          console.log(`  ? ${card.content} (${card.meaning ?? ''}) → could not determine, leaving null`);
          skipped++;
        }
      }
    }

    console.log(`\nDone. Updated: ${updated}, Left null: ${skipped}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
