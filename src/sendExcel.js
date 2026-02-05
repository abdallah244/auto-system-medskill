require("dotenv").config();

const fs = require("fs");
const path = require("path");

const pLimitModule = require("p-limit");
const pLimit = pLimitModule?.default || pLimitModule;

const { readExcelContacts } = require("./lib/readExcelContacts");
const { normalizeEgyptPhone } = require("./lib/normalizeEgyptPhone");
const { createWhatsAppCloudClient } = require("./lib/whatsappCloud");
const { renderTemplate } = require("./lib/template");
const { buildTemplateVars } = require("./lib/buildTemplateVars");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
  return s;
}

async function main() {
  const args = parseArgs(process.argv);

  const filePath = args.file || process.env.EXCEL_FILE;
  if (!filePath) {
    console.error("Missing --file <path> or EXCEL_FILE in .env");
    process.exit(1);
  }

  const sheetName = args.sheet || process.env.SHEET_NAME;
  const phoneColumn = args.phoneColumn || process.env.PHONE_COLUMN;
  const nameColumn = args.nameColumn || process.env.NAME_COLUMN;

  const dryRun =
    String(args["dry-run"] ?? process.env.DRY_RUN ?? "false").toLowerCase() ===
    "true";

  const requestDelayMs = Number(
    args.delay ?? process.env.REQUEST_DELAY_MS ?? 400,
  );
  const concurrency = Number(args.concurrency ?? process.env.CONCURRENCY ?? 1);

  const messageTemplate =
    args.message || process.env.DEFAULT_MESSAGE || "مرحبا {{name}}";

  const { contacts } = readExcelContacts(filePath, {
    sheetName,
    phoneColumn,
    nameColumn,
  });

  console.log(`Loaded ${contacts.length} contacts from Excel`);

  const client = dryRun ? null : createWhatsAppCloudClient(process.env);
  const limit = pLimit(Math.max(1, concurrency));

  const outDir = path.join(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsPath = path.join(outDir, `results-${stamp}.csv`);
  const header = [
    "row",
    "raw_phone",
    "normalized_phone",
    "name",
    "status",
    "message_id",
    "error",
  ].join(",");
  fs.writeFileSync(resultsPath, header + "\n", "utf8");

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const tasks = contacts.map((c) =>
    limit(async () => {
      const normalized = normalizeEgyptPhone(c.phone);
      if (!normalized) {
        skipped++;
        fs.appendFileSync(
          resultsPath,
          [
            c.row,
            csvEscape(c.phone),
            "",
            csvEscape(c.name),
            "SKIPPED",
            "",
            csvEscape("Invalid phone"),
          ].join(",") + "\n",
          "utf8",
        );
        return;
      }

      const body = renderTemplate(messageTemplate, {
        ...buildTemplateVars(c, normalized),
      });

      if (dryRun) {
        sent++;
        fs.appendFileSync(
          resultsPath,
          [
            c.row,
            csvEscape(c.phone),
            normalized,
            csvEscape(c.name),
            "DRY_RUN",
            "",
            "",
          ].join(",") + "\n",
          "utf8",
        );
        return;
      }

      const res = await client.sendTextMessage(normalized, body);
      if (res.ok) {
        sent++;
        const messageId = res.data?.messages?.[0]?.id || "";
        fs.appendFileSync(
          resultsPath,
          [
            c.row,
            csvEscape(c.phone),
            normalized,
            csvEscape(c.name),
            "SENT",
            csvEscape(messageId),
            "",
          ].join(",") + "\n",
          "utf8",
        );
      } else {
        failed++;
        fs.appendFileSync(
          resultsPath,
          [
            c.row,
            csvEscape(c.phone),
            normalized,
            csvEscape(c.name),
            "FAILED",
            "",
            csvEscape(`${res.error?.status || ""} ${res.error?.message || ""}`),
          ].join(",") + "\n",
          "utf8",
        );
      }

      if (requestDelayMs > 0) await sleep(requestDelayMs);
    }),
  );

  await Promise.all(tasks);

  console.log(
    `Done. sent=${sent} failed=${failed} skipped=${skipped}. Results: ${resultsPath}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
