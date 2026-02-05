function normalizeEgyptPhone(input) {
  if (input === null || input === undefined) return null;

  const raw = String(input).trim();
  if (!raw) return null;

  // Keep digits and leading +
  let cleaned = raw
    .replace(/\s+/g, "")
    .replace(/[()\-]/g, "")
    .replace(/[^+\d]/g, "");

  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);

  // Common Egyptian formats:
  // 01XXXXXXXXX -> +201XXXXXXXXX
  // 201XXXXXXXXX -> +201XXXXXXXXX
  // +201XXXXXXXXX -> +201XXXXXXXXX
  if (cleaned.startsWith("+")) {
    // ok
  } else if (cleaned.startsWith("20")) {
    cleaned = "+" + cleaned;
  } else if (cleaned.startsWith("0")) {
    cleaned = "+20" + cleaned.slice(1);
  }

  // Validate Egypt country code
  if (!cleaned.startsWith("+20")) return null;

  const digits = cleaned.replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;

  // Egypt mobile numbers: national significant number typically 10 digits after country code
  // +20 + 10 digits => total digits (excluding +) = 12
  // We'll accept 11-12 digits after 20? but enforce at least +201XXXXXXXXX (starts with +201)
  if (!cleaned.startsWith("+201")) return null;

  // Minimum length: +201 + 8 digits => but real is 9 digits after 201? (01 + 9 digits => 10 digits after +20)
  // Enforce +20 + 10 digits => length with + is 13
  if (cleaned.length !== 13) return null;

  return cleaned;
}

module.exports = { normalizeEgyptPhone };
