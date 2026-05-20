import Papa from "papaparse";

const HEADER_ALIASES = {
  "student name": "name",
  student_name: "name",
  student: "name",
  name: "name",
  "teacher name": "name",
  teacher_name: "name",
  email: "email",
  grade: "grade",
  "period/advisory": "period",
  "period advisory": "period",
  advisory: "period",
  period: "period",
  class: "period",
  house: "house",
  role: "role",
};

function normalizeHeader(header) {
  const key = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return HEADER_ALIASES[key] || key.replace(/\s+/g, "_");
}

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
  );
}

export function parseCsvFile(file, requiredFields = []) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: (result) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0].message));
          return;
        }

        const rows = result.data.map(cleanRow).filter((row) => Object.values(row).some(Boolean));
        const missing = requiredFields.filter((field) => !rows.some((row) => row[field]));
        if (missing.length) {
          reject(new Error(`Missing required CSV field: ${missing.join(", ")}`));
          return;
        }

        resolve(rows);
      },
      error: (error) => reject(error),
    });
  });
}
