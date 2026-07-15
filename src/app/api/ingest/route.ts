import { NextRequest, NextResponse } from "next/server";
import Firecrawl from "@mendable/firecrawl-js";
import { anthropic, UTILITY_MODEL } from "@/lib/ai/client";
import { getAuthContext } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestMarkdown } from "@/lib/rag/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, workspaceId } = auth;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    // ---------- PDF upload (multipart) ----------
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const companyId = String(formData.get("companyId") ?? "");
      const file = formData.get("file");

      if (!companyId || !(file instanceof File)) {
        return NextResponse.json({ error: "companyId and file required" }, { status: 400 });
      }
      if (!(await ownsCompany(supabase, companyId))) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "PDF too large (max 10 MB)" }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());

      // Store the original in the private bucket (service role required).
      const storagePath = `${workspaceId}/${companyId}/${Date.now()}-${file.name}`;
      const admin = createAdminClient();
      const { error: uploadError } = await admin.storage
        .from("kb-files")
        .upload(storagePath, bytes, { contentType: "application/pdf" });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      // Claude reads the PDF and transcribes it to clean markdown.
      const stream = anthropic.messages.stream({
        model: UTILITY_MODEL,
        max_tokens: 32_000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: bytes.toString("base64"),
                },
              },
              {
                type: "text",
                text: "Transcribe this document to clean, complete markdown. Preserve headings, lists and tables. Output only the markdown.",
              },
            ],
          },
        ],
      });
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") {
        return NextResponse.json({ error: "The model declined to read this PDF." }, { status: 422 });
      }
      const markdown = message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      const result = await ingestMarkdown({
        supabase,
        workspaceId,
        companyId,
        source: "pdf",
        title: file.name,
        storagePath,
        markdown,
      });
      return NextResponse.json(result);
    }

    // ---------- JSON modes: website crawl / manual note ----------
    const body = (await request.json()) as {
      companyId?: string;
      mode?: "website" | "note";
      url?: string;
      title?: string;
      content?: string;
    };
    const { companyId, mode } = body;
    if (!companyId || !mode) {
      return NextResponse.json({ error: "companyId and mode required" }, { status: 400 });
    }
    if (!(await ownsCompany(supabase, companyId))) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (mode === "note") {
      if (!body.content) {
        return NextResponse.json({ error: "content required" }, { status: 400 });
      }
      const result = await ingestMarkdown({
        supabase,
        workspaceId,
        companyId,
        source: "manual",
        title: body.title || "Note",
        markdown: body.content,
      });
      return NextResponse.json(result);
    }

    // mode === "website"
    if (!body.url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: "FIRECRAWL_API_KEY is not configured — add it to .env.local to crawl websites." },
        { status: 400 }
      );
    }

    const url = body.url.startsWith("http") ? body.url : `https://${body.url}`;
    const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
    const job = await firecrawl.crawl(url, {
      limit: 10,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      timeout: 180_000,
    });

    const pages = (job.data ?? []).filter((d) => d.markdown);
    if (pages.length === 0) {
      return NextResponse.json({ error: "Crawl returned no readable pages." }, { status: 422 });
    }

    let documents = 0;
    let chunks = 0;
    for (const page of pages) {
      const title =
        page.metadata?.title || page.metadata?.sourceURL || "Website page";
      try {
        const result = await ingestMarkdown({
          supabase,
          workspaceId,
          companyId,
          source: "website",
          title: String(title),
          url: page.metadata?.sourceURL ?? url,
          markdown: page.markdown ?? "",
        });
        documents += 1;
        chunks += result.chunkCount;
      } catch {
        // Skip pages with no usable text (e.g. cookie walls).
      }
    }

    if (documents === 0) {
      return NextResponse.json({ error: "No pages had usable text." }, { status: 422 });
    }
    return NextResponse.json({ documents, chunks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function ownsCompany(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>["supabase"],
  companyId: string
) {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .single();
  return Boolean(data);
}
