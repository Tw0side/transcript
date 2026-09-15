const PDFDocument = require("pdfkit");

// 2.54 cm = 72 points (1 cm ≈ 28.3465 pt)
const PAGE_MARGIN = 72;
const PAGE_WIDTH = 612; // US Letter, points
const USABLE_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

// Extra top offset for letterhead space
const LETTERHEAD_OFFSET = 80;

const FONT_REGULAR = "Times-Roman";
const FONT_BOLD = "Times-Bold";
const FONT_SIZE = 12;

// Draws one table row with independent bold/align per column, returns new y.
function drawRow(doc, x, y, colWidths, cells) {
  // cells: [{ text, bold, align }]
  let maxH = 22;
  colWidths.forEach((w, i) => {
    const c = cells[i] || { text: "" };
    doc.font(c.bold ? FONT_BOLD : FONT_REGULAR).fontSize(FONT_SIZE);
    const h = doc.heightOfString(String(c.text ?? ""), {
      width: w - 10,
      align: c.align || "left",
    });
    maxH = Math.max(maxH, h + 12);
  });

  let cx = x;
  colWidths.forEach((w, i) => {
    const c = cells[i] || { text: "" };
    // Non-bold table borders (thin line)
    doc.lineWidth(0.5).rect(cx, y, w, maxH).stroke();
    doc
      .font(c.bold ? FONT_BOLD : FONT_REGULAR)
      .fontSize(FONT_SIZE)
      .fillColor("black")
      .text(String(c.text ?? ""), cx + 5, y + 6, {
        width: w - 10,
        align: c.align || "left",
      });
    cx += w;
  });
  return y + maxH;
}

function checkPageBreak(doc, y, needed) {
  const bottom = doc.page.height - PAGE_MARGIN;
  if (y + needed > bottom) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function generatePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margin: PAGE_MARGIN,
        bufferPages: true,
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      let y = PAGE_MARGIN + LETTERHEAD_OFFSET;
      const x = PAGE_MARGIN;

      // ---- Title ----
      doc
        .font(FONT_BOLD)
        .fontSize(FONT_SIZE)
        .text("Transcript Certificate", x, y, {
          width: USABLE_WIDTH,
          align: "center",
        });
      y += 32;

      // ---- Info table ----
      const labelW = 180;
      const valW = USABLE_WIDTH - labelW;
      const halfValW = valW / 2;

      y = drawRow(doc, x, y, [labelW, valW], [
        { text: "Name of the Student", bold: true },
        { text: data.studentName || "" },
      ]);
      y = drawRow(doc, x, y, [labelW, valW], [
        { text: "Program Name", bold: true },
        { text: data.programName || "" },
      ]);
      y = drawRow(doc, x, y, [labelW, valW], [
        { text: "Program Duration", bold: true },
        { text: data.programDuration || "" },
      ]);
      y = drawRow(doc, x, y, [labelW, halfValW, halfValW], [
        { text: "Program Date", bold: true },
        { text: "Start Date", bold: true, align: "center" },
        { text: "End Date", bold: true, align: "center" },
      ]);
      y = drawRow(doc, x, y, [labelW, halfValW, halfValW], [
        { text: "" },
        { text: data.startDate || "" },
        { text: data.endDate || "" },
      ]);
      y = drawRow(doc, x, y, [labelW, valW], [
        { text: "Overall Grade", bold: true },
        { text: data.overallGrade || "" },
      ]);
      y = drawRow(doc, x, y, [labelW, valW], [
        { text: "Final Result", bold: true },
        { text: data.finalResult || "" },
      ]);

      y += 20;

      // ---- Results table (variant-specific) ----
      if (data.variant === "marks") {
        const w = [35, 140, 65, 65, 65, 72, 70]; // sums to 512 = USABLE_WIDTH
        y = checkPageBreak(doc, y, 30);
        y = drawRow(doc, x, y, w, [
          { text: "Sl No.", bold: true, align: "center" },
          { text: "Topics", bold: true },
          { text: "Duration (Hr)", bold: true, align: "center" },
          { text: "Total Marks", bold: true, align: "center" },
          { text: "Pass Marks", bold: true, align: "center" },
          { text: "Marks Gained", bold: true, align: "center" },
          { text: "Grade", bold: true, align: "center" },
        ]);
        (data.rows || []).forEach((r, i) => {
          y = checkPageBreak(doc, y, 24);
          y = drawRow(doc, x, y, w, [
            { text: String(i + 1), bold: true, align: "center" },
            { text: r.topic || "" },
            { text: r.duration || "", align: "center" },
            { text: r.totalMarks || "", align: "center" },
            { text: r.passMarks || "", align: "center" },
            { text: r.marksGained || "", align: "center" },
            { text: r.grade || "", align: "center" },
          ]);
        });
      } else {
        const w = [35, 170, 80, 85, 80, 62]; // sums to 512 = USABLE_WIDTH
        y = checkPageBreak(doc, y, 30);
        y = drawRow(doc, x, y, w, [
          { text: "Sl No.", bold: true, align: "center" },
          { text: "Program Name", bold: true },
          { text: "Attendance", bold: true, align: "center" },
          { text: "Participation", bold: true, align: "center" },
          { text: "Assignment", bold: true, align: "center" },
          { text: "Overall Grade", bold: true, align: "center" },
        ]);
        (data.rows || []).forEach((r, i) => {
          y = checkPageBreak(doc, y, 24);
          y = drawRow(doc, x, y, w, [
            { text: String(i + 1), bold: true, align: "center" },
            { text: r.programName || "" },
            { text: r.attendance || "", align: "center" },
            { text: r.participation || "", align: "center" },
            { text: r.assignment || "", align: "center" },
            { text: r.overallGrade || "", align: "center" },
          ]);
        });
      }

      y += 60;
      y = checkPageBreak(doc, y, 80);

      doc.font(FONT_BOLD).fontSize(FONT_SIZE).text(data.signatoryName || "", x, y);
      y += 16;
      doc.font(FONT_REGULAR).fontSize(FONT_SIZE).text(data.signatoryTitle || "", x, y);
      y += 22;
      doc.font(FONT_BOLD).fontSize(FONT_SIZE).text("Date: ", x, y, { continued: true });
      doc.font(FONT_REGULAR).text(data.issueDate || "");

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePdfBuffer };
