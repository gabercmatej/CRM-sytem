/**
 * Heading-aware markdown chunking: split on headings, then pack sections
 * into ~800-token chunks (approximated at 4 chars/token) with overlap.
 */

const TARGET_CHARS = 3200; // ~800 tokens
const OVERLAP_CHARS = 400; // ~100 tokens
const MIN_CHARS = 200;

export function chunkMarkdown(markdown: string): string[] {
  const clean = markdown.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  // Split into sections at headings, keeping the heading with its content.
  const sections = clean
    .split(/(?=^#{1,4}\s)/m)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed.length >= MIN_CHARS) chunks.push(trimmed);
    current = "";
  };

  for (const section of sections) {
    if (section.length > TARGET_CHARS) {
      flush();
      // Long section: split by paragraphs with overlap.
      const paragraphs = section.split(/\n{2,}/);
      let buffer = "";
      for (const para of paragraphs) {
        if (buffer.length + para.length > TARGET_CHARS && buffer) {
          chunks.push(buffer.trim());
          buffer = buffer.slice(-OVERLAP_CHARS) + "\n\n";
        }
        buffer += para + "\n\n";
      }
      if (buffer.trim().length >= MIN_CHARS) chunks.push(buffer.trim());
    } else if (current.length + section.length > TARGET_CHARS) {
      flush();
      current = section + "\n\n";
    } else {
      current += section + "\n\n";
    }
  }
  flush();

  return chunks;
}
