import jsPDF from "jspdf";

import {
  containsSinhalaOrTamil,
  drawPdfText,
  ensurePdfComplexScriptFonts,
  splitPdfTextToSize,
  truncatePdfText,
} from "./pdf-complex-text";

describe("PDF complex-script text", () => {
  it("detects Sinhala and Tamil without treating English as complex script", () => {
    expect(containsSinhalaOrTamil("සිංහල පැමිණිල්ල")).toBeTrue();
    expect(containsSinhalaOrTamil("தமிழ் முறைப்பாடு")).toBeTrue();
    expect(containsSinhalaOrTamil("English complaint")).toBeFalse();
  });

  it("loads the bundled Sinhala and Tamil font faces", async () => {
    await ensurePdfComplexScriptFonts();

    expect(
      document.fonts.check('400 16px "Noto Sans Sinhala"', "සිංහල"),
    ).toBeTrue();
    expect(
      document.fonts.check('400 16px "Noto Sans Tamil"', "தமிழ்"),
    ).toBeTrue();
  });

  it("uses browser canvas rendering for Sinhala and Tamil PDF text", () => {
    const pdf = new jsPDF({ unit: "mm" });
    const addImage = spyOn(pdf, "addImage").and.callFake(() => pdf);

    drawPdfText(pdf, "සිංහල පැමිණිල්ල", 10, 20);
    drawPdfText(pdf, "தமிழ் முறைப்பாடு", 10, 30);

    expect(addImage).toHaveBeenCalledTimes(2);
  });

  it("keeps ordinary PDF text as searchable vector text", () => {
    const pdf = new jsPDF({ unit: "mm" });
    const text = spyOn(pdf, "text").and.callThrough();
    const addImage = spyOn(pdf, "addImage").and.callFake(() => pdf);

    drawPdfText(pdf, "English complaint", 10, 20);

    expect(text).toHaveBeenCalled();
    expect(addImage).not.toHaveBeenCalled();
  });

  it("wraps and truncates complex-script text using shaped canvas widths", () => {
    const pdf = new jsPDF({ unit: "mm" });
    pdf.setFontSize(9);
    const value = "විදේශ රැකියා පැමිණිල්ල පිළිබඳ විස්තරය";

    const lines = splitPdfTextToSize(pdf, value, 25);
    const truncated = truncatePdfText(pdf, value, 20);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length > 0)).toBeTrue();
    expect(truncated).toMatch(/\.\.\.$/u);
  });
});
