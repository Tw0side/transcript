const PDFDocument = require("pdfkit");

// 2.54 cm = 72 points
const PAGE_MARGIN = 72;
const PAGE_WIDTH = 612; // US Letter
const USABLE_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2; // 468

// Letterhead offset — pushes everything down
const LETTERHEAD_OFFSET = 80;

const FONT_REGULAR = "Times-Roman";
const FONT_BOLD = "Times-Bold";
const FONT_SIZE = 12;
const CELL_PAD_X = 5;
const CELL_PAD_Y = 6;

// ---- helpers ---------------------------------------------------------------

function cellHeight(doc, text, width, font, size, align) {
  doc.font(font).fontSize(size);
  return doc.heightOfString(String(text ?? ""), {
    width: width - CELL_PAD_X * 2,
    align: align || "left",
  });
}

// Draw a single bordered cell
function drawCell(doc, x, y, w, h, cell) {
  doc.lineWidth(0.5).rect(x, y, w, h).stroke();
  const size = cell.size || FONT_SIZE;
  doc
    .font(cell.bold ? FONT_BOLD : FONT_REGULAR)
    .fontSize(size)
    .fillColor("black")
    .text(String(cell.text ?? ""), x + CELL_PAD_X, y + CELL_PAD_Y, {
      width: w - CELL_PAD_X * 2,
      align: cell.align || "left",
      lineBreak: cell.nowrap ? false : true,
    });
}

// Draw a row of cells with independent widths; returns new y
function drawRow(doc, x, y, colWidths, cells) {
  let maxH = 22;
  colWidths.forEach((w, i) => {
    const c = cells[i] || { text: "" };
    const h =
      cellHeight(
        doc,
        c.text,
        w,
        c.bold ? FONT_BOLD : FONT_REGULAR,
        c.size || FONT_SIZE,
        c.align
      ) +
      CELL_PAD_Y * 2;
    maxH = Math.max(maxH, h);
  });

  let cx = x;
  colWidths.forEach((w, i) => {
    drawCell(doc, cx, y, w, maxH, cells[i] || { text: "" });
    cx += w;
  });
  return y + maxH;
}

// Draw a row where some cells span multiple columns.
// spans: array of { col, span, cell } — col is 0-based index into colWidths
function drawRowSpans(doc, x, y, colWidths, spans) {
  let maxH = 22;
  spans.forEach((s) => {
    const w = colWidths.slice(s.col, s.col + s.span).reduce((a, b) => a + b, 0);
    const c = s.cell || { text: "" };
    const h =
      cellHeight(
        doc,
        c.text,
        w,
        c.bold ? FONT_BOLD : FONT_REGULAR,
        c.size || FONT_SIZE,
        c.align
      ) +
      CELL_PAD_Y * 2;
    maxH = Math.max(maxH, h);
  });

  spans.forEach((s) => {
    const w = colWidths.slice(s.col, s.col + s.span).reduce((a, b) => a + b, 0);
    const cx = x + colWidths.slice(0, s.col).reduce((a, b) => a + b, 0);
    drawCell(doc, cx, y, w, maxH, s.cell || { text: "" });
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

// ---- main generator --------------------------------------------------------

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

      // ---- Info table (3 columns) ----
      // col 1 = labels, col 2 = value-left, col 3 = value-right
      const infoW = [200, 134, 134]; // sums to 468

      // Name of the Student | value (span 2)
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "Name of the Student", bold: true, nowrap: true } },
        { col: 1, span: 2, cell: { text: data.studentName || "" } },
      ]);

      // Program Name | value (span 2)
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "Program Name", bold: true, nowrap: true } },
        { col: 1, span: 2, cell: { text: data.programName || "" } },
      ]);

      // Program Duration | value (span 2)
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "Program Duration", bold: true, nowrap: true } },
        { col: 1, span: 2, cell: { text: data.programDuration || "" } },
      ]);

      // Program Date | Start Date | End Date  (header row)
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "Program Date", bold: true, nowrap: true } },
        { col: 1, span: 1, cell: { text: "Start Date", bold: true, align: "center", nowrap: true } },
        { col: 2, span: 1, cell: { text: "End Date", bold: true, align: "center", nowrap: true } },
      ]);

      // value row for dates
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "" } },
        { col: 1, span: 1, cell: { text: data.startDate || "", align: "center" } },
        { col: 2, span: 1, cell: { text: data.endDate || "", align: "center" } },
      ]);

      // Overall Grade | value (span 2)
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "Overall Grade", bold: true, nowrap: true } },
        { col: 1, span: 2, cell: { text: data.overallGrade || "" } },
      ]);

      // Final Result | value (span 2)
      y = drawRowSpans(doc, x, y, infoW, [
        { col: 0, span: 1, cell: { text: "Final Result", bold: true, nowrap: true } },
        { col: 1, span: 2, cell: { text: data.finalResult || "" } },
      ]);

      y += 20;

      // ---- Results table ----
      if (data.variant === "marks") {
        // Rebalanced to 468 total
        const ww = [30, 128, 60, 60, 60, 65, 65];
        y = checkPageBreak(doc, y, 30);
        y = drawRow(doc, x, y, ww, [
          { text: "Sl No.", bold: true, align: "center", nowrap: true },
          { text: "Topics", bold: true, nowrap: true },
          { text: "Duration (Hr)", bold: true, align: "center", nowrap: true },
          { text: "Total Marks", bold: true, align: "center", nowrap: true },
          { text: "Pass Marks", bold: true, align: "center", nowrap: true },
          { text: "Marks Gained", bold: true, align: "center", nowrap: true },
          { text: "Grade", bold: true, align: "center", nowrap: true },
        ]);
        (data.rows || []).forEach((r, i) => {
          y = checkPageBreak(doc, y, 24);
          y = drawRow(doc, x, y, ww, [
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
        // non-marks variant — widened Participation / Attendance columns
        const ww = [30, 121, 87, 87, 80, 63]; // sums to 468
        y = checkPageBreak(doc, y, 30);
        y = drawRow(doc, x, y, ww, [
          { text: "Sl No.", bold: true, align: "center", nowrap: true },
          { text: "Program Name", bold: true, nowrap: true },
          { text: "Attendance", bold: true, align: "center", nowrap: true },
          { text: "Participation", bold: true, align: "center", nowrap: true },
          { text: "Assignment", bold: true, align: "center", nowrap: true },
          { text: "Overall Grade", bold: true, align: "center", nowrap: true },
        ]);
        (data.rows || []).forEach((r, i) => {
          y = checkPageBreak(doc, y, 24);
          y = drawRow(doc, x, y, ww, [
            { text: String(i + 1), bold: true, align: "center" },
            { text: r.programName || "" },
            { text: r.attendance || "", align: "center" },
            { text: r.participation || "", align: "center" },
            { text: r.assignment || "", align: "center" },
            { text: r.overallGrade || "", align: "center" },
          ]);
        });
      }

      // ---- Signature block ----
      y += 60;
      y = checkPageBreak(doc, y, 80);
 
      doc.font(FONT_BOLD).fontSize(FONT_SIZE).text(data.signatoryName || "", x, y);
      y += 18;
      doc.font(FONT_REGULAR).fontSize(FONT_SIZE).text(data.signatoryTitle || "", x, y);
      y += 24;
      doc.font(FONT_BOLD).fontSize(FONT_SIZE).text("Date: ", x, y, { continued: true });
      doc.font(FONT_REGULAR).text(data.issueDate || "");

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePdfBuffer };
