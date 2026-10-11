// A deliberately synthetic document. Never presented as a real student expense.
export function sampleReceipt(amount = "72.00"): Buffer {
  const lines = [
    "TRIPGRANT DEMO RECEIPT",
    "Synthetic data - not a real booking",
    "Student Builders Summit / Istanbul",
    "Intercity transport and event travel",
    `Total: ${amount} test tokens`,
    "For product demonstration only.",
  ];
  const stream = `BT /F1 20 Tf 50 760 Td (${lines[0]}) Tj /F1 12 Tf ${lines
    .slice(1)
    .map((line) => `0 -32 Td (${line.replace(/[()\\]/g, "")}) Tj`)
    .join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => n.toString().padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf);
}
