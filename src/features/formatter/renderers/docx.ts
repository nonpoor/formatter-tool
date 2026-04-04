import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { BlockNode, DocumentModel, InlineNode } from "@/features/formatter/model/types";
import { docxDefaults } from "@/features/formatter/config/policies";

export async function renderDocx(doc: DocumentModel): Promise<Blob> {
  const children = blocksToDocxChildren(
    doc.blocks,
    docxDefaults.fontSize,
    docxDefaults.paragraphSpacingAfter,
    docxDefaults.headingSpacingAfter,
  );

  const file = new DocxDocument({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(file);
}

function blocksToDocxChildren(
  blocks: BlockNode[],
  fontSize: number,
  paragraphSpacingAfter: number,
  headingSpacingAfter: number,
  leftIndent = 0,
): Array<Paragraph | Table> {
  const result: Array<Paragraph | Table> = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      result.push(
        new Paragraph({
          heading: headingLevel(block.level),
          children: inlineToRuns(block.inlines, fontSize),
          spacing: { after: headingSpacingAfter },
          indent: leftIndent > 0 ? { left: leftIndent } : undefined,
        }),
      );
      continue;
    }

    if (block.type === "paragraph") {
      result.push(
        new Paragraph({
          children: inlineToRuns(block.inlines, fontSize),
          spacing: { after: paragraphSpacingAfter },
          indent: leftIndent > 0 ? { left: leftIndent } : undefined,
        }),
      );
      continue;
    }

    if (block.type === "list") {
      const orderedStart = block.ordered ? block.start ?? 1 : 1;
      block.items.forEach((item, itemIndex) => {
        item.blocks.forEach((childBlock) => {
          if (childBlock.type === "paragraph") {
            const numberedPrefix = block.ordered ? `${orderedStart + itemIndex}. ` : "";
            result.push(
              new Paragraph({
                children: block.ordered
                  ? [new TextRun({ text: numberedPrefix, size: fontSize }), ...inlineToRuns(childBlock.inlines, fontSize)]
                  : inlineToRuns(childBlock.inlines, fontSize),
                spacing: { after: paragraphSpacingAfter },
                bullet: block.ordered ? undefined : { level: 0 },
                indent: leftIndent > 0 ? { left: leftIndent } : undefined,
              }),
            );
            return;
          }

          if (childBlock.type === "heading") {
            result.push(
              new Paragraph({
                children: inlineToRuns(childBlock.inlines, fontSize),
                spacing: { after: paragraphSpacingAfter },
                indent: { left: leftIndent + 720 },
              }),
            );
            return;
          }

          if (childBlock.type === "preformatted") {
            result.push(
              new Paragraph({
                spacing: { after: paragraphSpacingAfter },
                indent: { left: leftIndent + 720 },
                children: [
                  new TextRun({
                    text: childBlock.text,
                    font: "Consolas",
                    size: fontSize,
                  }),
                ],
              }),
            );
            return;
          }

          result.push(...blocksToDocxChildren([childBlock], fontSize, paragraphSpacingAfter, headingSpacingAfter, leftIndent));
        });

        if (itemIndex === block.items.length - 1) {
          result.push(new Paragraph({ text: "", spacing: { after: 80 } }));
        }
      });
      continue;
    }

    if (block.type === "blockquote") {
      result.push(...blocksToDocxChildren(block.blocks, fontSize, paragraphSpacingAfter, headingSpacingAfter, leftIndent + 600));
      continue;
    }

    if (block.type === "table") {
      result.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: block.headers.map((cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: inlineToRuns(cell, fontSize, true),
                    }),
                  ],
                }),
              ),
            }),
            ...block.rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: inlineToRuns(cell, fontSize),
                          }),
                        ],
                      }),
                  ),
                }),
            ),
          ],
        }),
      );
      continue;
    }

    result.push(
      new Paragraph({
        spacing: { after: paragraphSpacingAfter },
        indent: leftIndent > 0 ? { left: leftIndent } : undefined,
        children: [
          new TextRun({
            text: block.text,
            font: "Consolas",
            size: fontSize,
          }),
        ],
      }),
    );
  }

  return result;
}

function inlineToRuns(inlines: InlineNode[], fontSize: number, forceBold = false): TextRun[] {
  return inlines.map((inline) => {
    if (inline.type === "lineBreak") {
      return new TextRun({ text: "", break: 1, size: fontSize });
    }
    return new TextRun({
      text: inline.value,
      bold: forceBold || inline.marks?.bold,
      italics: inline.marks?.italic,
      size: fontSize,
    });
  });
}

function headingLevel(level: 1 | 2 | 3) {
  if (level === 1) {
    return HeadingLevel.HEADING_1;
  }
  if (level === 2) {
    return HeadingLevel.HEADING_2;
  }
  return HeadingLevel.HEADING_3;
}
