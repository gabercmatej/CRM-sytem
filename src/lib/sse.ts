/**
 * Read a fetch() Response containing an SSE stream ("data: {json}\n\n" lines)
 * and invoke onEvent for each parsed event.
 */
export async function readSseStream<T>(
  response: Response,
  onEvent: (event: T) => void
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as T);
      } catch {
        // Ignore malformed frames.
      }
    }
  }
}
