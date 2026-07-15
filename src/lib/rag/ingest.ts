import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DocumentSource } from "@/lib/database.types";
import { chunkMarkdown } from "./chunking";
import { embedTexts, toVectorString } from "./embeddings";

type Client = SupabaseClient<Database>;

/**
 * Store a markdown document in the company knowledge base:
 * create the document row, chunk, embed, insert chunks, mark ready.
 */
export async function ingestMarkdown(opts: {
  supabase: Client;
  workspaceId: string;
  companyId: string;
  source: DocumentSource;
  title: string;
  url?: string | null;
  storagePath?: string | null;
  markdown: string;
}) {
  const { supabase, workspaceId, companyId } = opts;

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      workspace_id: workspaceId,
      company_id: companyId,
      source: opts.source,
      title: opts.title.slice(0, 300),
      url: opts.url ?? null,
      storage_path: opts.storagePath ?? null,
      status: "processing",
    })
    .select("id")
    .single();

  if (docError || !doc) {
    throw new Error(`Could not create document: ${docError?.message}`);
  }

  try {
    const chunks = chunkMarkdown(opts.markdown);
    if (chunks.length === 0) {
      throw new Error("No usable text found in this document.");
    }

    const embeddings = await embedTexts(chunks);

    const rows = chunks.map((content, i) => ({
      workspace_id: workspaceId,
      document_id: doc.id,
      company_id: companyId,
      content,
      embedding: embeddings[i] ? toVectorString(embeddings[i]) : null,
    }));

    // Insert in batches to stay under payload limits.
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase
        .from("document_chunks")
        .insert(rows.slice(i, i + 50));
      if (error) throw new Error(error.message);
    }

    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", doc.id);

    return { documentId: doc.id, chunkCount: chunks.length };
  } catch (err) {
    await supabase
      .from("documents")
      .update({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", doc.id);
    throw err;
  }
}
