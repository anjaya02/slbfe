import type { jsPDF, TextOptionsLight } from "jspdf";

type PdfDocument = InstanceType<typeof jsPDF>;

type PdfTextOptions = TextOptionsLight;

// These are the Unicode ranges used by Sinhala and Tamil characters.
const SINHALA_RANGE = /[\u0D80-\u0DFF]/u;
const TAMIL_RANGE = /[\u0B80-\u0BFF]/u;
const COMPLEX_SCRIPT_RANGE = /[\u0B80-\u0BFF\u0D80-\u0DFF]/u;

// Canvas uses pixels, but jsPDF uses points internally. These values help us
// convert between the two without changing the current PDF layout.
const PDF_POINTS_PER_CSS_PIXEL = 72 / 96;
const CANVAS_SCALE = 3;
const CANVAS_PADDING_PX = 2;

let measurementCanvas: HTMLCanvasElement | null = null;

export function containsSinhalaOrTamil(text: string): boolean {
  return COMPLEX_SCRIPT_RANGE.test(text);
}

export async function ensurePdfComplexScriptFonts(): Promise<void> {
  // document.fonts is only available inside the browser.
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  // Wait for both normal and bold fonts before starting the PDF. Otherwise the
  // first download can be created before the browser finishes loading a font.
  await Promise.all([
    document.fonts.load('400 16px "Noto Sans Sinhala"', "සිංහල"),
    document.fonts.load('700 16px "Noto Sans Sinhala"', "සිංහල"),
    document.fonts.load('400 16px "Noto Sans Tamil"', "தமிழ்"),
    document.fonts.load('700 16px "Noto Sans Tamil"', "தமிழ்"),
  ]);
}

export function splitPdfTextToSize(
  pdf: PdfDocument,
  text: string,
  maxWidth: number,
): string[] {
  const value = text ?? "";
  if (!containsSinhalaOrTamil(value)) {
    return pdf.splitTextToSize(value, maxWidth) as string[];
  }

  // The browser knows how to measure shaped Sinhala and Tamil words. jsPDF's
  // built-in font measurement does not, so canvas is used for these languages.
  const context = getMeasurementContext();
  setCanvasFont(context, pdf, value);
  const maxWidthPx = pdfUnitsToCssPixels(pdf, maxWidth);
  const paragraphs = value.split(/\r?\n/u);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    lines.push(...wrapParagraph(context, paragraph, maxWidthPx));
  }

  return lines;
}

export function drawPdfText(
  pdf: PdfDocument,
  text: string | string[],
  x: number,
  y: number,
  options: PdfTextOptions = {},
): void {
  const lines = Array.isArray(text) ? text : [text];

  if (!lines.some(containsSinhalaOrTamil)) {
    // Keep normal text as PDF text so it can still be selected and searched.
    pdf.text(text, x, y, options);
    return;
  }

  const lineHeightFactor = options.lineHeightFactor ?? 1.15;
  const lineHeight =
    (pdf.getFontSize() * lineHeightFactor) / pdf.internal.scaleFactor;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineY = y + index * lineHeight;

    if (containsSinhalaOrTamil(line)) {
      // Canvas lets the browser join and position the letters correctly.
      drawComplexScriptLine(pdf, line, x, lineY, options);
    } else {
      pdf.text(line, x, lineY, options);
    }
  }
}

export function truncatePdfText(
  pdf: PdfDocument,
  text: string,
  maxWidth: number,
): string {
  if (measurePdfTextWidth(pdf, text) <= maxWidth) {
    return text;
  }

  const ending = "...";
  const characters = splitIntoCharacters(text);

  // Remove one complete displayed character at a time. This prevents a vowel
  // sign from being separated from the Sinhala or Tamil letter it belongs to.
  while (
    characters.length > 1 &&
    measurePdfTextWidth(pdf, `${characters.join("")}${ending}`) > maxWidth
  ) {
    characters.pop();
  }

  return `${characters.join("")}${ending}`;
}

function drawComplexScriptLine(
  pdf: PdfDocument,
  text: string,
  x: number,
  baselineY: number,
  options: PdfTextOptions,
): void {
  const align = options.align ?? "left";
  const fontSizePx = pdf.getFontSize() / PDF_POINTS_PER_CSS_PIXEL;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    // This is only a fallback for browsers where canvas is unavailable.
    pdf.text(text, x, baselineY, { align });
    return;
  }

  // First measure the shaped text, then resize the canvas to fit it.
  setCanvasFont(context, pdf, text, CANVAS_SCALE);
  const metrics = context.measureText(text);
  const padding = CANVAS_PADDING_PX * CANVAS_SCALE;
  const ascent =
    metrics.actualBoundingBoxAscent || fontSizePx * CANVAS_SCALE * 0.85;
  const descent =
    metrics.actualBoundingBoxDescent || fontSizePx * CANVAS_SCALE * 0.25;
  canvas.width = Math.max(1, Math.ceil(metrics.width + padding * 2));
  canvas.height = Math.max(1, Math.ceil(ascent + descent + padding * 2));

  // Resizing clears the canvas settings, so the font must be set again.
  setCanvasFont(context, pdf, text, CANVAS_SCALE);
  context.fillStyle = pdf.getTextColor();
  context.textBaseline = "alphabetic";
  context.fillText(text, padding, padding + ascent);

  let width = cssPixelsToPdfUnits(pdf, canvas.width / CANVAS_SCALE);
  const height = cssPixelsToPdfUnits(pdf, canvas.height / CANVAS_SCALE);
  if (options.maxWidth && width > options.maxWidth) {
    width = options.maxWidth;
  }

  const baselineOffset = cssPixelsToPdfUnits(
    pdf,
    (padding + ascent) / CANVAS_SCALE,
  );
  let imageX = x;
  if (align === "center") {
    imageX -= width / 2;
  } else if (align === "right") {
    imageX -= width;
  }

  // Add only the shaped language line as an image. The rest of the PDF stays
  // as regular PDF text.
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    imageX,
    baselineY - baselineOffset,
    width,
    height,
    undefined,
    "FAST",
  );
}

function measurePdfTextWidth(pdf: PdfDocument, text: string): number {
  if (!containsSinhalaOrTamil(text)) {
    return pdf.getTextWidth(text);
  }

  const context = getMeasurementContext();
  setCanvasFont(context, pdf, text);
  return cssPixelsToPdfUnits(pdf, context.measureText(text).width);
}

function wrapParagraph(
  context: CanvasRenderingContext2D,
  paragraph: string,
  maxWidthPx: number,
): string[] {
  if (!paragraph) {
    return [""];
  }

  const words = paragraph.split(/(\s+)/u).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine}${word}` : word.trimStart();

    if (!currentLine || context.measureText(candidate).width <= maxWidthPx) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine.trimEnd());
    const nextWord = word.trimStart();

    if (context.measureText(nextWord).width <= maxWidthPx) {
      currentLine = nextWord;
      continue;
    }

    // A long word without spaces still needs to fit inside a table cell.
    const chunks = breakLongWord(context, nextWord, maxWidthPx);
    lines.push(...chunks.slice(0, -1));
    currentLine = chunks.at(-1) ?? "";
  }

  if (currentLine || !lines.length) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
}

function breakLongWord(
  context: CanvasRenderingContext2D,
  word: string,
  maxWidthPx: number,
): string[] {
  const chunks: string[] = [];
  let chunk = "";

  for (const character of splitIntoCharacters(word)) {
    const candidate = `${chunk}${character}`;

    if (chunk && context.measureText(candidate).width > maxWidthPx) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }

  if (chunk) {
    chunks.push(chunk);
  }

  return chunks;
}

function splitIntoCharacters(text: string): string[] {
  // Intl.Segmenter keeps a base letter and its marks together as one item.
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }

  return Array.from(text);
}

function getMeasurementContext(): CanvasRenderingContext2D {
  if (!measurementCanvas) {
    measurementCanvas = document.createElement("canvas");
  }

  const context = measurementCanvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas text rendering is unavailable");
  }
  return context;
}

function setCanvasFont(
  context: CanvasRenderingContext2D,
  pdf: PdfDocument,
  text: string,
  scale = 1,
): void {
  const fontStyle = pdf.getFont().fontStyle;
  const weight = fontStyle.includes("bold") ? 700 : 400;
  const sizePx = (pdf.getFontSize() / PDF_POINTS_PER_CSS_PIXEL) * scale;
  const families = getFontFamilies(text);
  context.font = `${weight} ${sizePx}px ${families}`;
}

function getFontFamilies(text: string): string {
  // Put the detected language first, but keep the other font as a fallback for
  // mixed Sinhala and Tamil text.
  if (SINHALA_RANGE.test(text)) {
    return '"Noto Sans Sinhala", "Noto Sans Tamil", sans-serif';
  }
  if (TAMIL_RANGE.test(text)) {
    return '"Noto Sans Tamil", "Noto Sans Sinhala", sans-serif';
  }
  return "sans-serif";
}

function pdfUnitsToCssPixels(pdf: PdfDocument, units: number): number {
  return (units * pdf.internal.scaleFactor) / PDF_POINTS_PER_CSS_PIXEL;
}

function cssPixelsToPdfUnits(pdf: PdfDocument, pixels: number): number {
  return (pixels * PDF_POINTS_PER_CSS_PIXEL) / pdf.internal.scaleFactor;
}
