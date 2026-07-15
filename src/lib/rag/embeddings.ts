import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims, matches vector(1536)

/**
 * Embed a batch of texts. Returns null per text when OPENAI_API_KEY is not
 * configured — chunks are then stored without embeddings and hybrid search
 * falls back to full-text only.
 */
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (!process.env.OPENAI_API_KEY) return texts.map(() => null);
  if (texts.length === 0) return [];

  const openai = new OpenAI();
  const embeddings: (number[] | null)[] = [];

  // The embeddings endpoint accepts batches; stay well under limits.
  const BATCH = 96;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH).map((t) => t.slice(0, 8000));
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    for (const item of res.data) embeddings.push(item.embedding);
  }
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const [embedding] = await embedTexts([text]);
  return embedding ?? null;
}

/** pgvector accepts the JSON-array string form, e.g. "[0.1,0.2,...]". */
export function toVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
