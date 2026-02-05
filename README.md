# Auto WhatsApp (Excel -> WhatsApp Cloud API)

نظام أوتوميشن بسيط يقرأ ملف Excel ويبعث رسالة واتساب للأرقام المصرية عبر **WhatsApp Cloud API**.

## 1) تجهيز WhatsApp Cloud API

هتحتاج من Meta:

- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

وحطهم في `.env`.

## 2) شكل ملف Excel

أي Sheet فيها Header row.

يفضل يكون عندك عمود واحد للأرقام باسم مثلًا:

- `phone` أو `mobile` أو `whatsapp`
- أو بالعربي: `رقم` / `موبايل` / `واتساب`

وممكن عمود اسم:

- `name` أو `اسم`

### مثال

| name  | phone         |
| ----- | ------------- |
| Ahmed | 01012345678   |
| Mona  | +201112223334 |

## 3) تطبيع الأرقام المصرية

النظام بيحوّل الأرقام لصيغة E.164:

- `010XXXXXXXX` -> `+2010XXXXXXXX`
- `2010XXXXXXXX` -> `+2010XXXXXXXX`
- `+2010XXXXXXXX` تفضل زي ما هي

أي رقم غير صالح هيتم **تخطيه**.

## 4) إرسال من خلال CLI

### القالب (Template) وقراءة الأعمدة تلقائيًا

النظام بيقرأ **كل صف** في الإكسيل ويبني متغيرات للقالب من:

- متغيرات جاهزة:
  - `{{name}}` (لو عندك عمود اسم وتم اكتشافه)
  - `{{phone}}` (الرقم بعد التطبيع: `+20...`)
  - `{{raw_phone}}` (الرقم كما هو في الإكسيل)
  - `{{row}}` (رقم الصف في الإكسيل)

- أي عمود في الإكسيل تقدر تستخدمه مباشرة باسم الـ Header:
  - لو عندك عمود اسمه `city` استخدم: `{{city}}`
  - لو عندك عمود اسمه `Full Name` استخدم: `{{Full Name}}`
  - لو عمود بالعربي `اسم` استخدم: `{{اسم}}`

وكمان بيعمل نسخة “مبسطة” من اسم العمود (حروف صغيرة + `_` بدل المسافات)، مثال:

- `Full Name` -> `{{full_name}}`

مثال قالب:

```text
مرحباً {{name}}
مدينتك: {{city}}
رقمك: {{phone}}
```

### Dry-run (من غير إرسال فعلي)

1. خليك على `DRY_RUN=true` في `.env`
2. شغّل:

```bash
npm run send:excel -- --file "path/to/contacts.xlsx" --sheet "Sheet1"
```

### إرسال فعلي

- غيّر `DRY_RUN=false` في `.env`
- شغّل نفس الأمر.

النتائج هتتسجل في `out/results-*.csv`.

## 5) سيرفر (رفع Excel وإرسال)

شغّل السيرفر:

```bash
npm start
```

ثم ارفع ملف Excel:

- `POST /api/send-excel`
- `multipart/form-data`
- field اسمها `file`
- optional fields: `message`, `sheetName`, `dryRun`, `phoneColumn`, `nameColumn`

مثال PowerShell:

```powershell
curl -F "file=@contacts.xlsx" -F "dryRun=true" -F "message=مرحبا {{name}}" http://localhost:3000/api/send-excel
```
