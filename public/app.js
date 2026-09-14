const rowsContainer = document.getElementById("rowsContainer");
const addRowBtn = document.getElementById("addRowBtn");
const statusMsg = document.getElementById("statusMsg");

const FIELD_DEFS = {
  assessment: [
    { key: "programName", label: "Program Name", placeholder: "Technovalley Certified SOC Professional (TCSP)" },
    { key: "attendance", label: "Attendance", placeholder: "A" },
    { key: "participation", label: "Participation", placeholder: "A" },
    { key: "assignment", label: "Assignment", placeholder: "A" },
    { key: "overallGrade", label: "Overall Grade", placeholder: "A" }
  ],
  marks: [
    { key: "topic", label: "Topic", placeholder: "Technovalley Certified SOC Professional (TCSP)" },
    { key: "duration", label: "Duration (Hr)", placeholder: "60 Hr" },
    { key: "totalMarks", label: "Total Marks", placeholder: "100" },
    { key: "passMarks", label: "Pass Marks", placeholder: "90" },
    { key: "marksGained", label: "Marks Gained", placeholder: "97" },
    { key: "grade", label: "Grade", placeholder: "A+" }
  ]
};

function currentVariant() {
  return document.querySelector('input[name="variant"]:checked').value;
}

function makeRowBlock(variant, values = {}) {
  const div = document.createElement("div");
  div.className = "row-block";
  div.dataset.variant = variant;

  const fieldsWrap = document.createElement("div");
  fieldsWrap.className = "row-fields";

  FIELD_DEFS[variant].forEach((f) => {
    const label = document.createElement("label");
    label.style.fontWeight = "500";
    label.textContent = f.label;
    const input = document.createElement("input");
    input.type = "text";
    input.name = f.key;
    input.placeholder = f.placeholder;
    input.value = values[f.key] || "";
    label.appendChild(input);
    fieldsWrap.appendChild(label);
  });

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-row";
  removeBtn.textContent = "Remove row";
  removeBtn.onclick = () => div.remove();

  div.appendChild(fieldsWrap);
  div.appendChild(removeBtn);
  return div;
}

function renderRowsForVariant(variant, keepData = true) {
  const existingData = keepData ? collectRows() : [];
  rowsContainer.innerHTML = "";
  if (existingData.length === 0) {
    rowsContainer.appendChild(makeRowBlock(variant));
  } else {
    existingData.forEach(() => rowsContainer.appendChild(makeRowBlock(variant)));
  }
}

function collectRows() {
  return Array.from(rowsContainer.querySelectorAll(".row-block")).map((block) => {
    const obj = {};
    block.querySelectorAll("input").forEach((inp) => { obj[inp.name] = inp.value; });
    return obj;
  });
}

document.querySelectorAll('input[name="variant"]').forEach((radio) => {
  radio.addEventListener("change", () => renderRowsForVariant(currentVariant(), false));
});

addRowBtn.addEventListener("click", () => {
  rowsContainer.appendChild(makeRowBlock(currentVariant()));
});

// initial row
renderRowsForVariant(currentVariant(), false);

function collectFormData() {
  const form = document.getElementById("transcriptForm");
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.rows = collectRows();
  return data;
}

async function downloadFile(endpoint, filenameFallback) {
  statusMsg.textContent = "Generating...";
  try {
    const data = collectFormData();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || "Server error");
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? match[1] : filenameFallback;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    statusMsg.textContent = "Done.";
  } catch (err) {
    console.error(err);
    statusMsg.textContent = "Failed: " + err.message;
  }
}

document.getElementById("downloadDocx").addEventListener("click", () => {
  downloadFile("/api/generate/docx", "transcript.docx");
});
document.getElementById("downloadPdf").addEventListener("click", () => {
  downloadFile("/api/generate/pdf", "transcript.pdf");
});
