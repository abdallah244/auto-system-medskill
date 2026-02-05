const xlsx = require("xlsx");

const DEFAULT_PHONE_HEADERS = [
  "phone",
  "mobile",
  "number",
  "whatsapp",
  "msisdn",
  "رقم",
  "موبايل",
  "هاتف",
  "واتساب",
  "رقم_واتساب",
];

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickColumn(headers, preferredHeader) {
  const normalized = headers.map((h) => normalizeHeader(h));

  if (preferredHeader) {
    const idx = normalized.indexOf(normalizeHeader(preferredHeader));
    if (idx !== -1) return headers[idx];
  }

  for (const candidate of DEFAULT_PHONE_HEADERS) {
    const idx = normalized.indexOf(normalizeHeader(candidate));
    if (idx !== -1) return headers[idx];
  }

  return null;
}

function readExcelContacts(filePath, options = {}) {
  const { sheetName, phoneColumn, nameColumn } = options;

  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const selectedSheetName = sheetName || workbook.SheetNames[0];
  if (!selectedSheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[selectedSheetName];
  if (!sheet) throw new Error(`Sheet not found: ${selectedSheetName}`);

  const rows = xlsx.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) return { sheetName: selectedSheetName, contacts: [] };

  const headers = Object.keys(rows[0]);
  const phoneKey = pickColumn(headers, phoneColumn);
  if (!phoneKey) {
    throw new Error(
      `Could not detect phone column. Headers found: ${headers.join(", ")}. Set PHONE_COLUMN in .env or pass phoneColumn.`,
    );
  }

  const nameKey = nameColumn
    ? headers.find((h) => normalizeHeader(h) === normalizeHeader(nameColumn))
    : headers.find((h) =>
        ["name", "full name", "اسم", "الاسم"].includes(normalizeHeader(h)),
      );

  const contacts = rows
    .map((r, index) => {
      const phone = r[phoneKey];
      const name = nameKey ? r[nameKey] : "";
      return {
        row: index + 2, // +2 because sheet_to_json starts after header row
        phone,
        name,
        data: r,
      };
    })
    .filter((c) => String(c.phone || "").trim() !== "");

  return { sheetName: selectedSheetName, contacts };
}

module.exports = { readExcelContacts };
