import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { BlockNode, DocumentModel, InlineNode } from "@/features/formatter/model/types";
import { getTemplateConfig } from "@/features/formatter/templates";

export async function renderDocx(doc: DocumentModel): Promise<Blob> {
  const template = getTemplateConfig(doc.meta.templateId);
  const paragraphs = blocksToParagraphs(doc.blocks, template.fontSize, template.paragraphSpacingAfter, template.headingSpacingAfter);

  const file = new DocxDocument({
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return Packer.toBlob(file);
}

function blocksToParagraphs(
  blocks: BlockNode[],
  fontSize: number,
  paragraphSpacingAfter: number,
  headingSpacingAfter: number,
  leftIndent = 0,
): Paragraph[] {
  const result: Paragraph[] = [];

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
      block.items.forEach((item, itemIndex) => {
        item.blocks.forEach((childBlock) => {
          if (childBlock.type === "paragraph") {
            result.push(
              new Paragraph({
                children: inlineToRuns(childBlock.inlines, fontSize),
                spacing: { after: paragraphSpacingAfter },
                bullet: block.ordered ? undefined : { level: 0 },
                numbering: block.ordered
                  ? {
                      reference: "ordered-list",
                      level: 0,
                      instance: 1,
                    }
                  : undefined,
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

          result.push(...blocksToParagraphs([childBlock], fontSize, paragraphSpacingAfter, headingSpacingAfter, leftIndent));
        });

        if (itemIndex === block.items.length - 1) {
          result.push(new Paragraph({ text: "", spacing: { after: 80 } }));
        }
      });
      continue;
    }

    if (block.type === "blockquote") {
      result.push(...blocksToParagraphs(block.blocks, fontSize, paragraphSpacingAfter, headingSpacingAfter, leftIndent + 600));
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

function inlineToRuns(inlines: InlineNode[], fontSize: number): TextRun[] {
  return inlines.map((inline) => {
    if (inline.type === "lineBreak") {
      return new TextRun({ text: "", break: 1, size: fontSize });
    }
    return new TextRun({
      text: inline.value,
      bold: inline.marks?.bold,
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
