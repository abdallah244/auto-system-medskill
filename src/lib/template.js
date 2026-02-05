function renderTemplate(template, variables) {
  let out = String(template ?? "");
  for (const [key, value] of Object.entries(variables || {})) {
    const safe = value === null || value === undefined ? "" : String(value);
    out = out.replace(
      new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g"),
      safe,
    );
  }
  return out;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

module.exports = { renderTemplate };
