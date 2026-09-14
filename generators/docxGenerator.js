const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, VerticalAlign, HeadingLevel, BorderStyle
} = require("docx");

// ---- helpers ----------------------------------------------------------

const CELL_MARGIN = { top: 80, bottom: 80, left: 100, right: 100 };

function textCell(text, { bold = false, width, align = AlignmentType.LEFT, columnSpan, shading } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGIN,
    shading: shading ? { fill: shading } : undefined,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? ""), bold })]
      })
    ]
  });
}

function infoRow(label, value, widths) {
  return new TableRow({
    children: [
      textCell(label, { bold: true, width: widths[0] }),
      textCell(value, { width: widths[1] + widths[2] })
    ]
  });
}

// ---- main builder -------------------------------------------------------

/**
 * data = {
 *   studentName, programName, programDuration, startDate, endDate,
 *   overallGrade, finalResult,
 *   variant: "assessment" | "marks",
 *   rows: [ {...columns depend on variant} ],
 *   signatoryName, signatoryTitle, issueDate
 * }
 */
function buildDocument(data) {
  const fullWidth = 9350; // total table width in DXA (~6.5in usable)
  const infoWidths = [2800, 3275, 3275];

  // ---- top info table ----
  const infoTable = new Table({
    width: { size: fullWidth, type: WidthType.DXA },
    columnWidths: infoWidths,
    rows: [
      infoRow("Name of the Student", data.studentName, infoWidths),
      infoRow("Program Name", data.programName, infoWidths),
      infoRow("Program Duration", data.programDuration, infoWidths),
      new TableRow({
        children: [
          textCell("Program Date", { bold: true, width: infoWidths[0] }),
          textCell("Start Date", { bold: true, width: infoWidths[1], align: AlignmentType.CENTER }),
          textCell("End Date", { bold: true, width: infoWidths[2], align: AlignmentType.CENTER })
        ]
      }),
      new TableRow({
        children: [
          textCell("", { width: infoWidths[0] }),
          textCell(data.startDate, { width: infoWidths[1] }),
          textCell(data.endDate, { width: infoWidths[2] })
        ]
      }),
      infoRow("Overall Grade", data.overallGrade, infoWidths),
      infoRow("Final Result", data.finalResult, infoWidths)
    ]
  });

  // ---- second table (variant-specific) ----
  let resultsTable;
  if (data.variant === "marks") {
    const w = [700, 2650, 1400, 1200, 1200, 1200, 1000];
    const headerRow = new TableRow({
      children: [
        textCell("Sl No.", { bold: true, width: w[0], align: AlignmentType.CENTER }),
        textCell("Topics", { bold: true, width: w[1] }),
        textCell("Duration (Hr)", { bold: true, width: w[2], align: AlignmentType.CENTER }),
        textCell("Total Marks", { bold: true, width: w[3], align: AlignmentType.CENTER }),
        textCell("Pass Marks", { bold: true, width: w[4], align: AlignmentType.CENTER }),
        textCell("Marks Gained", { bold: true, width: w[5], align: AlignmentType.CENTER }),
        textCell("Grade", { bold: true, width: w[6], align: AlignmentType.CENTER })
      ]
    });
    const dataRows = data.rows.map((r, i) => new TableRow({
      children: [
        textCell(i + 1, { bold: true, width: w[0], align: AlignmentType.CENTER }),
        textCell(r.topic, { width: w[1] }),
        textCell(r.duration, { width: w[2], align: AlignmentType.CENTER }),
        textCell(r.totalMarks, { width: w[3], align: AlignmentType.CENTER }),
        textCell(r.passMarks, { width: w[4], align: AlignmentType.CENTER }),
        textCell(r.marksGained, { width: w[5], align: AlignmentType.CENTER }),
        textCell(r.grade, { width: w[6], align: AlignmentType.CENTER })
      ]
    }));
    resultsTable = new Table({ width: { size: fullWidth, type: WidthType.DXA }, columnWidths: w, rows: [headerRow, ...dataRows] });
  } else {
    const w = [700, 3100, 1400, 1400, 1400, 1350];
    const headerRow = new TableRow({
      children: [
        textCell("Sl No.", { bold: true, width: w[0], align: AlignmentType.CENTER }),
        textCell("Program Name", { bold: true, width: w[1] }),
        textCell("Attendance", { bold: true, width: w[2], align: AlignmentType.CENTER }),
        textCell("Participation", { bold: true, width: w[3], align: AlignmentType.CENTER }),
        textCell("Assignment", { bold: true, width: w[4], align: AlignmentType.CENTER }),
        textCell("Overall Grade", { bold: true, width: w[5], align: AlignmentType.CENTER })
      ]
    });
    const dataRows = data.rows.map((r, i) => new TableRow({
      children: [
        textCell(i + 1, { bold: true, width: w[0], align: AlignmentType.CENTER }),
        textCell(r.programName, { width: w[1] }),
        textCell(r.attendance, { width: w[2], align: AlignmentType.CENTER }),
        textCell(r.participation, { width: w[3], align: AlignmentType.CENTER }),
        textCell(r.assignment, { width: w[4], align: AlignmentType.CENTER }),
        textCell(r.overallGrade, { width: w[5], align: AlignmentType.CENTER })
      ]
    }));
    resultsTable = new Table({ width: { size: fullWidth, type: WidthType.DXA }, columnWidths: w, rows: [headerRow, ...dataRows] });
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 } } // US Letter
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "Transcript Certificate", bold: true, size: 28 })]
        }),
        infoTable,
        new Paragraph({ text: "", spacing: { after: 300 } }),
        resultsTable,
        new Paragraph({ text: "", spacing: { after: 600 } }),
        new Paragraph({ text: "", spacing: { after: 600 } }),
        new Paragraph({ children: [new TextRun({ text: data.signatoryName, bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: data.signatoryTitle })] }),
        new Paragraph({ spacing: { before: 200 }, children: [
          new TextRun({ text: "Date: ", bold: true }),
          new TextRun({ text: data.issueDate })
        ]})
      ]
    }]
  });

  return doc;
}

async function generateDocxBuffer(data) {
  const doc = buildDocument(data);
  return Packer.toBuffer(doc);
}

module.exports = { generateDocxBuffer };
