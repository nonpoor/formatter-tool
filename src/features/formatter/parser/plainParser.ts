import type { BlockNode, InlineNode } from "@/features/formatter/model/types";
import { createInlineFromTextWithBreak } from "@/features/formatter/utils";

export function parsePlainInput(input: string): BlockNode[] {
  const normalized = input.replace(/\r\n/g, "\n");
  const blocks: BlockNode[] = [];
  const segments = splitByBlankLines(normalized);

  for (const lines of segments) {
    if (lines.length === 0) {
      continue;
    }

    const table = parsePipeTable(lines) ?? parseTsvTable(lines);
    if (table) {
      blocks.push(table);
      continue;
    }

    const hasPipeLikePattern = looksLikePipeTable(lines);
    const segmentText = lines.join("\n").trim();
    if (!segmentText) {
      continue;
    }

    if (hasPipeLikePattern) {
      blocks.push({
        type: "preformatted",
        text: segmentText,
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      inlines: createInlineFromTextWithBreak(segmentText),
    });
  }

  return blocks;
}

function splitByBlankLines(input: string): string[][] {
  const lines = input.split("\n");
  const segments: string[][] = [];
  let current: string[] = [];

  for (const rawLine of lines) {
    if (rawLine.trim() === "") {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push(rawLine);
  }

  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
}

function parsePipeTable(lines: string[]): BlockNode | null {
  if (lines.length < 2) {
    return null;
  }

  const header = splitPipeRow(lines[0]);
  if (!header) {
    return null;
  }

  const separator = splitPipeRow(lines[1]);
  if (!separator || separator.length !== header.length || !separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) {
    return null;
  }

  const rowsRaw = lines.slice(2);
  const rows: InlineNode[][][] = [];
  for (const line of rowsRaw) {
    const row = splitPipeRow(line);
    if (!row || row.length !== header.length) {
      return null;
    }
    rows.push(row.map((cell) => createInlineFromTextWithBreak(cell.trim())));
  }

  return {
    type: "table",
    headers: header.map((cell) => createInlineFromTextWithBreak(cell.trim())),
    rows,
  };
}

function splitPipeRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return null;
  }

  const parts = trimmed.split("|").map((cell) => cell.trim());
  if (parts[0] === "") {
    parts.shift();
  }
  if (parts[parts.length - 1] === "") {
    parts.pop();
  }
  if (parts.length < 2) {
    return null;
  }
  return parts;
}

function looksLikePipeTable(lines: string[]): boolean {
  return lines.some((line) => line.includes("|"));
}

function parseTsvTable(lines: string[]): BlockNode | null {
  if (lines.length < 2) {
    return null;
  }

  if (!lines.every((line) => line.includes("\t"))) {
    return null;
  }

  const rows = lines.map((line) => line.split("\t"));
  const width = rows[0].length;
  if (width < 2 || !rows.every((row) => row.length === width)) {
    return null;
  }

  return {
    type: "table",
    headers: rows[0].map((cell) => createInlineFromTextWithBreak(cell.trim())),
    rows: rows.slice(1).map((row) => row.map((cell) => createInlineFromTextWithBreak(cell.trim()))),
  };
}
