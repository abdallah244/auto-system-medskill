require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { readExcelContacts } = require("./lib/readExcelContacts");
const { normalizeEgyptPhone } = require("./lib/normalizeEgyptPhone");
const { createWhatsAppCloudClient } = require("./lib/whatsappCloud");
const { renderTemplate } = require("./lib/template");
const { buildTemplateVars } = require("./lib/buildTemplateVars");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const app = express();
app.use(express.json({ limit: "2mb" }));

const uploadDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/send-excel", upload.single("file"), async (req, res) => {
  const tmpPath = req.file?.path;
  const originalName = req.file?.originalname;

  if (!tmpPath)
    return res.status(400).json({ ok: false, error: "Missing file" });

  const sheetName = req.body.sheetName || process.env.SHEET_NAME;
  const phoneColumn = req.body.phoneColumn || process.env.PHONE_COLUMN;
  const nameColumn = req.body.nameColumn || process.env.NAME_COLUMN;

  const dryRun =
    String(req.body.dryRun ?? process.env.DRY_RUN ?? "false").toLowerCase() ===
    "true";

  const requestDelayMs = Number(process.env.REQUEST_DELAY_MS ?? 400);
  const concurrency = 1; // keep API safe in server mode

  const messageTemplate =
    req.body.message || process.env.DEFAULT_MESSAGE || "مرحبا {{name}}";

  try {
    const { contacts } = readExcelContacts(tmpPath, {
      sheetName,
      phoneColumn,
      nameColumn,
    });

    const client = dryRun ? null : createWhatsAppCloudClient(process.env);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Sequential send in server mode to avoid rate-limit surprises
    for (const c of contacts) {
      const normalized = normalizeEgyptPhone(c.phone);
      if (!normalized) {
        skipped++;
        continue;
      }

      const body = renderTemplate(messageTemplate, {
        ...buildTemplateVars(c, normalized),
      });

      if (!dryRun) {
        const result = await client.sendTextMessage(normalized, body);
        if (result.ok) sent++;
        else failed++;
      } else {
        sent++;
      }

      if (requestDelayMs > 0) await sleep(requestDelayMs);
    }

    return res.json({
      ok: true,
      file: originalName,
      total: contacts.length,
      sent,
      failed,
      skipped,
      dryRun,
      sheetName: sheetName || null,
      concurrency,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
