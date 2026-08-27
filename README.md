# Mislaka — CRM לסוכני ביטוח

מערכת ניהול תהליך לקוח לסוכן ביטוח, בנויה סביב צנרת (pipeline) של 4 שלבים:
**ממתין לאישור מסלקה → אושר (נתונים התקבלו) → ממתין לחתימה → נשלח לחברת הביטוח**.

🔗 **דמו חי (נתוני דמה, ללא שרת):** ראו את הלינק שסופק בסוף הריפו / ב-About של ה-repo ב-GitHub.

## מה יש כאן

- **צנרת Kanban** עם כרטיס-לקוח מלא (מודל) הכולל: נתוני מסלקה (צבירה/דמי ניהול/מסלול לכל מוצר), בירור צרכים, החלטות ניוד/פתיחת מוצר לכל מוצר בנפרד, חתימה דיגיטלית מרחוק, והפקת דוח ללקוח (snapshot קפוא, לינק לשיתוף + PDF).
- **אינטגרציית Mislaka-API** (Nobel Digital/Swiftness) — מצב `mock` מקומי לפיתוח חינמי, מצב `live` עם token אמיתי.
- **חתימה מרחוק** — לינק אישי ללקוח, חוזר אוטומטית ומקדם את התהליך.

## מבנה

```
src/            frontend — React 19 + Vite + Tailwind v4 + zustand + motion
server/         backend — Express + TypeScript, מדבר מול Mislaka-API (mock/live)
```

## הרצה מקומית (עם שרת אמיתי)

שני תהליכים במקביל:

```bash
cd server && cp .env.example .env && npm install && npm run seed && npm run dev
```
```bash
npm install && npm run dev
```

Frontend: http://localhost:5199 · Backend: http://localhost:4000

פרטים נוספים על ה-API וה-webhook: [server/README.md](server/README.md).

## דמו סטטי (ללא שרת, לשיתוף)

`src/lib/demoDb.ts` הוא "שרת" מדומה שרץ כולו בזיכרון הדפדפן — אותם נתונים, אותה זרימה
(כולל השהיית מסלקה מדומה, חתימה, הפקת דוחות), בלי צורך ב-backend. משמש לבניית
הדמו שרץ ב-GitHub Pages.

```bash
npm run build:demo   # בונה ל-dist/ עם VITE_DEMO_MODE=1 ו-base path לריפו
npm run deploy:pages  # בונה ומפרסם ל-gh-pages branch
```

**מגבלה:** נתוני הדמו נשמרים ב-`localStorage` של הדפדפן — לינק שנוצר (דוח/חתימה)
עובד ברענון ובטאב חדש **באותו דפדפן**, אך לא משותף בין דפדפנים/מכשירים שונים
(אין שרת אמיתי מאחורי הדמו).
