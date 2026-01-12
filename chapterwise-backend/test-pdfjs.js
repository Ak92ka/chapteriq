import fs from "fs";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

async function readPdf(filePath, startPage, endPage) {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    // Safety checks
    const from = Math.max(1, startPage);
    const to = Math.min(pdf.numPages, endPage);

    if (from > to) {
      throw new Error("Invalid page range");
    }

    let extractedText = "";

    for (let i = from; i <= to; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      extractedText += pageText + "\n\n";
    }

    console.log(`Extracted text (pages ${from}-${to}):\n`, extractedText);
    return extractedText;

  } catch (err) {
    console.error("Failed to read PDF:", err);
  }
}

// ✅ Extract pages 2–3 only
readPdf(
  "C:/Users/super/Downloads/random_paragraph.pdf",
  2,
  3
);
