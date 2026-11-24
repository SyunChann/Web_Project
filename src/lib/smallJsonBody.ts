export async function readSmallJson(request: Request, limit = 1024): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > limit) throw Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw Error("INVALID_JSON");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { void reader.cancel().catch(() => {}); throw Error("BODY_TOO_LARGE"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw Error("INVALID_JSON"); }
}
