const fs = require("fs");
const path = require("path");

/**
 * Extract text from PDF or DOCX file
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    try {
      const pdfParse = require("pdf-parse");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    } catch (err) {
      console.error("PDF parse error:", err.message);
      return "";
    }
  }

  if (ext === ".doc" || ext === ".docx") {
    try {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    } catch (err) {
      console.error("DOCX parse error:", err.message);
      return "";
    }
  }

  // Plain text fallback
  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf-8").trim();
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { extractText };
