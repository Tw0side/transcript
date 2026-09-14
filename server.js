const express = require("express");
const path = require("path");
const { generateDocxBuffer } = require("./generators/docxGenerator");
const { generatePdfBuffer } = require("./generators/pdfGenerator");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function safeFileName(name) {
  return (name || "transcript").replace(/[^a-z0-9_\-]+/gi, "_");
}

app.post("/api/generate/docx", async (req, res) => {
  try {
    const buffer = await generateDocxBuffer(req.body);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName(req.body.studentName)}_transcript.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate DOCX", details: err.message });
  }
});

app.post("/api/generate/pdf", async (req, res) => {
  try {
    const buffer = await generatePdfBuffer(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName(req.body.studentName)}_transcript.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF", details: err.message });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Transcript portal running on port ${PORT}`));
