# Mislaka CRM Server

Backend לאפליקציית ניהול לקוחות לסוכני ביטוח. הלקוח **מועלה כקובץ** (export
שהתקבל מהמסלקה) במקום SMS/webhook — הנתונים זמינים מיד, בלי המתנה.
פרטי הרקע לפער בין ה-API הציבורי של המסלקה למה שבפועל נחוץ כאן:
[`../docs/mislaka-api-integration-plan.md`](../docs/mislaka-api-integration-plan.md).

## הרצה

```bash
cd server
cp .env.example .env      # פעם ראשונה
npm install
npm run seed               # נתוני דמה (7 לקוחות, 3 שלבים)
npm run dev                # http://localhost:4000
```

`MISLAKA_MODE=mock` (ברירת מחדל) נותן רשימת חברות ביטוח מקומית ללא
credentials. `MISLAKA_MODE=live` + `MISLAKA_TOKEN` מחברים ל-API האמיתי
(כרגע רק ל-`GET /manufacturers/list/` — ראה תוכנית האינטגרציה למה שנשאר).

## הזרימה (ממופה לשלבי ה-Pipeline)

| שלב | פעולה | Endpoint |
|-----|-------|----------|
| בטיפול | יצירת לקוח מקובץ מסלקה שהועלה | `POST /api/clients` (JSON: פרטי לקוח + תוכן הקובץ כמחרוזת) |
| בטיפול | ניוד / פתיחת מוצר לכל פוליסה בנפרד | `POST/DELETE /api/clients/:id/product-actions` |
| בטיפול | בירור צרכים | `POST /api/clients/:id/needs-assessment` |
| ממתין לחתימה | הפקת חוזה + לינק חתימה אישי | `POST /api/clients/:id/advance` |
| ממתין לחתימה | הלקוח חותם מרחוק | `GET/POST /api/sign/:token` (ציבורי) |
| הושלם | 3 פעולות אוטומטיות: אישור הצלחה/כישלון, שליחה לחברה, סגירת רשומה | קורה בתוך `POST /api/sign/:token` |

## Endpoints

- `GET  /api/health` — סטטוס + מצב (mock/live)
- `GET  /api/clients` · `GET /api/clients/:id`
- `POST /api/clients` — יוצר לקוח מקובץ מסלקה `{firstName,lastName,personId,mobile,email?,mislakaFileContent}`
- `POST /api/clients/:id/product-actions` · `DELETE .../product-actions/:actionId` — ניוד/פתיחת מוצר
- `POST /api/clients/:id/needs-assessment` — בירור צרכים
- `POST /api/clients/:id/advance` — מקדם שלב (בטיפול → ממתין לחתימה → הושלם)
- `GET  /api/sign/:token` · `POST /api/sign/:token` — עמוד/פעולת חתימה ציבוריים
- `POST /api/clients/:id/reports` · `GET /api/reports/:reportId` — דוח ללקוח (snapshot קפוא)
- `GET  /api/manufacturers` — רשימת חברות הביטוח

## נקודות קריטיות

- קובץ המסלקה מפורש ומאומת ב-`src/mislaka/parseMislakaExport.ts` (השרת הוא מקור האמת — לעולם לא לסמוך על ולידציה בצד לקוח בלבד). יש עותק תואם בצד ה-frontend (`src/lib/parseMislakaExport.ts`) רק כי מצב הדמו (GitHub Pages) רץ בלי שרת בכלל.
- אימות ה-API: header `token`. Rate limit: 100 בקשות לדקה (רלוונטי כרגע רק ל-`manufacturers/list`).

## אחסון

כרגע JSON file פשוט ב-`server/data/db.json` (מספיק לפיתוח).
לפרודקשן — להחליף ב-Postgres/SQLite (המבנה ב-`src/types.ts` כבר מוכן לכך).
