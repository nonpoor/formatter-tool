export interface MathSpanInfo {
  detected: boolean;
  spanCount: number;
}

export interface MathMaskResult extends MathSpanInfo {
  maskedText: string;
  spans: string[];
}

const TOKEN_PREFIX = "CDXMSPAN";
const TOKEN_SUFFIX = "END";

export function analyzeMathSpans(input: string): MathSpanInfo {
  const result = maskMathSpans(input);
  return {
    detected: result.detected,
    spanCount: result.spanCount,
  };
}

export function maskMathSpans(input: string): MathMaskResult {
  const spans: string[] = [];
  let maskedText = "";
  let cursor = 0;

  while (cursor < input.length) {
    const match = matchMathSpanAt(input, cursor);
    if (!match) {
      maskedText += input[cursor];
      cursor += 1;
      continue;
    }

    spans.push(match.content);
    maskedText += tokenFor(spans.length - 1);
    cursor = match.end;
  }

  return {
    maskedText,
    spans,
    detected: spans.length > 0,
    spanCount: spans.length,
  };
}

export function restoreMathSpans(input: string, spans: string[]): string {
  let restored = input;
  for (let index = 0; index < spans.length; index += 1) {
    restored = restored.split(tokenFor(index)).join(spans[index]);
  }
  return restored;
}

export function transformTextPreservingMath(input: string, transform: (maskedText: string) => string): string {
  const masked = maskMathSpans(input);
  const transformed = transform(masked.maskedText);
  if (!masked.detected) {
    return transformed;
  }
  return restoreMathSpans(transformed, masked.spans);
}

function tokenFor(index: number): string {
  return `${TOKEN_PREFIX}${index}${TOKEN_SUFFIX}`;
}

function matchMathSpanAt(input: string, index: number): { content: string; end: number } | null {
  if (isEscaped(input, index)) {
    return null;
  }

  if (input.startsWith("$$", index)) {
    const close = findClosing(input, index + 2, "$$");
    if (close !== null) {
      const end = close + 2;
      return { content: input.slice(index, end), end };
    }
  }

  if (input.startsWith("\\[", index)) {
    const close = findClosing(input, index + 2, "\\]");
    if (close !== null) {
      const end = close + 2;
      return { content: input.slice(index, end), end };
    }
  }

  if (input.startsWith("\\(", index)) {
    const close = findClosing(input, index + 2, "\\)", false);
    if (close !== null) {
      const end = close + 2;
      return { content: input.slice(index, end), end };
    }
  }

  if (input[index] === "$" && input[index + 1] !== "$") {
    const close = findInlineDollarClosing(input, index + 1);
    if (close !== null) {
      const end = close + 1;
      return { content: input.slice(index, end), end };
    }
  }

  return null;
}

function findClosing(input: string, start: number, closer: string, allowNewline = true): number | null {
  let cursor = start;
  while (cursor <= input.length - closer.length) {
    if (!allowNewline && input[cursor] === "\n") {
      return null;
    }
    if (input.startsWith(closer, cursor) && !isEscaped(input, cursor)) {
      return cursor;
    }
    cursor += 1;
  }
  return null;
}

function findInlineDollarClosing(input: string, start: number): number | null {
  let cursor = start;
  while (cursor < input.length) {
    if (input[cursor] === "\n") {
      return null;
    }
    if (input[cursor] === "$" && !isEscaped(input, cursor)) {
      const prev = input[cursor - 1];
      const next = input[cursor + 1];
      if (prev !== "$" && next !== "$") {
        const content = input.slice(start, cursor).trim();
        return content.length > 0 ? cursor : null;
      }
    }
    cursor += 1;
  }
  return null;
}

function isEscaped(input: string, index: number): boolean {
  let cursor = index - 1;
  let slashCount = 0;
  while (cursor >= 0 && input[cursor] === "\\") {
    slashCount += 1;
    cursor -= 1;
  }
  return slashCount % 2 === 1;
}
