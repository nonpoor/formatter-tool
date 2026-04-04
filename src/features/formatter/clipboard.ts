import type { DocumentModel } from "@/features/formatter/model/types";
import { type ClipboardPayload, renderClipboardPayload } from "@/features/formatter/renderers/clipboard";

export async function writeClipboardPayload(payload: ClipboardPayload): Promise<void> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return;
  }

  if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
    const item = new ClipboardItem({
      "text/html": new Blob([payload.html], { type: "text/html" }),
      "text/plain": new Blob([payload.text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload.text);
    return;
  }

  throw new Error("当前环境不支持自动复制，请手动复制结果。");
}

export async function copyOptimizedToClipboard(doc: DocumentModel): Promise<void> {
  const payload = renderClipboardPayload(doc);
  await writeClipboardPayload(payload);
}
