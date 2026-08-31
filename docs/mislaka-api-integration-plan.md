# תוכנית אינטגרציית Mislaka-API — מה יש, מה חסר, מה קודם

מקור: https://docs.mislaka-api.co.il/ (נקרא ואומת במלואו — Base URL
`https://mislaka-api.co.il/api`, auth header `token`, 100 req/min).

מטרת המסמך: לרשום את **כל** ה-endpoints שהמסלקה מציעה, ולסמן לכל אחד אם
אנחנו **כבר משתמשים**, **צריכים בקרוב**, **נחמד שיהיה**, או **לא רלוונטי**
— על בסיס מה שהאפליקציה שלנו כבר עושה (`server/src/mislaka/*`,
`ProductActionsPanel`, `SignatureSection`, `NeedsAssessment`, `ReportsSection`).

---

## 🔴 עדיפות 1 — הפער הכי חשוב: ניוד לא באמת קורה

**הבעיה:** ב-`ProductActionsPanel` הסוכן "מנייד" מוצר — אבל זו רק רשומה
פנימית אצלנו (`productActions[]`). שום דבר לא נשלח בפועל למסלקה/ליצרן.
כדי שניוד יהיה **אמיתי** (מה שהסוכן בראיון תיאר: "לוחץ לנייד... יוצרת
לשונית חדשה"), חייבים:

| Endpoint | שיטה | לשם מה |
|---|---|---|
| `POST /api/transaction` (`type: "1700"`) | POST | **מינוי סוכן / ניוד** — זו הבקשה שבפועל מעבירה את הלקוח ליצרן היעד. פרמטרים: `manufacturer`, `form_type` (B1/B2), `power_of_attorney_file_url`, `identification_file_url`, `product_data[]`. |
| `GET /api/transaction/{id}` | GET | מעקב סטטוס הבקשה (pending/finished/failed) — להציג בכרטיס הלקוח. |

**מיפוי ל-קוד:** ברגע ש-`ProductAction.kind === "transfer"` ומסומן כ"סופי"
(אחרי חתימה) → לשלוח `1700` בפועל. דורש גם קובץ הרשאה חתום (POA) — ראה
עדיפות 2 למקור הקובץ.

---

## 🔴 עדיפות 1 — לאחד את שני עולמות החתימה

**הבעיה:** בנינו מנגנון חתימה משלנו (`signRequest.token`, `/sign/:token`)
שהוא simulation בלבד. למסלקה יש שירות **חתימה מרחוק אמיתי**:

| Endpoint | שיטה | לשם מה |
|---|---|---|
| `POST /api/forms` (`type: "formA"`) | POST | שולח את **נספח א'** (טופס ההיכרות/הסכמה) לחתימה מרחוק אמיתית ב-SMS/מייל. |
| `GET /api/forms/{formId}` | GET | סטטוס + מטא-דאטה של החתימה (מי חתם, IP, דפדפן, מתי). |
| `GET /forms/{formId}/files/` | GET | **הורדת ה-PDF החתום בפועל** — זה מה שצריך לצרף ל-1700 כ-`identification_file_url`. |

**החלטה נדרשת:** להחליף את ה-signature הפנימי שלנו ב-Forms API האמיתי,
או להשאיר את שלנו לחתימת ה"הסכמה שלנו" ולהוסיף `formA`/`harb` כשלב
נפרד לפני שליחת ה-1700 בפועל (כי היצרן דורש קובץ הרשאה חתום אמיתי, לא
משהו שיצרנו).

---

## 🟠 עדיפות 2 — קיים, אבל שווה לחזק

| Endpoint | שיטה | סטטוס אצלנו |
|---|---|---|
| `POST /api/leads-page/create` | POST | ✅ בשימוש (`live.ts createLeadPage`) — שולח SMS + מפעיל 9100 |
| `POST /api/transaction` (`type:"9100"`) | POST | ✅ מופעל דרך `send9100Process` בקריאה הקודמת |
| `GET /api/transaction/{id}/polisot/` | GET | ✅ בשימוש (`getPolisot`) |
| `GET /api/transaction/{id}/polisot/data` | GET | ✅ בשימוש (`getPolisotData`) — נשמר ב-`mislaka.raw` |
| Webhook נכנס (`/api/webhooks/mislaka`) | — | ✅ בשימוש, כולל משיכה מיידית (מגבלת 7 ימים) |
| `GET /api/manufacturers/list/` | GET | ⚠️ **הפונקציה קיימת בקוד (`getManufacturers`) אבל ה-UI לא משתמש בה** — `ProductActionsPanel`/`ProductForm` עדיין עם רשימת חברות **קשיחה** (`COMPANIES` array). **תיקון קל, שווה לעשות:** לטעון את הרשימה האמיתית מה-API בזמן ריצה. |

---

## 🟡 עדיפות 3 — נחמד שיהיה, לא חוסם

| Endpoint | שיטה | לשם מה |
|---|---|---|
| `POST /api/transaction` (`type:"9401"`) | POST | **בקשת מידע ממעסיק** — כרגע ב-`NeedsAssessment` שדה "מעסיק" הוא טקסט חופשי שהסוכן מזין. אפשר להפוך לאימות/העשרה אוטומטית. |
| `POST /api/transactions` (רשימה) | POST | מסך "כל הבקשות למסלקה" למעקב/ביקורת (audit) — לא קיים כרגע. |
| `GET /transaction/{id}/files/{fileType}` (PDF/XLS/ZIP) | GET | הורדת הקובץ **המקורי** מהמסלקה — כרגע אנחנו רק מציגים `polisot` כ-JSON, לא את הקובץ הגולמי. שווה כאופציה בדוח ("הורד קובץ מקור"). |
| `GET /production/{id}/files/dat/{time}` | GET | קבצי production גולמיים (dat/json) — עומק טכני, כנראה לא נדרש. |
| `GET /api/transaction/{id}/masked` | GET | **מומלץ ע"י המסלקה עצמה** לביצוע אחרי משיכת נתונים — מטמיע PII בצד שלהם. אנחנו כבר שומרים את הכל אצלנו (`mislaka.raw`), אז שווה להריץ את זה + `DELETE /transaction/{id}/files/` כ"ניקיון" תקופתי (job), לצמצום חשיפה. |
| `POST /api/forms` (`type:"harb"`, הר הביטוח) | POST | טופס הרשאה ספציפי ל"הר הביטוח" — variant של formA, לא קריטי אם 9100 מספיק. |
| `POST /api/forms` (policy-copy, `manager_id`) | POST | העתקי פוליסות מיצרן ספציפי — שימושי אם `polisot` לא מספק מסמך מקור מלא ליצרן מסוים. |

---

## ⚪ לא רלוונטי לאפליקציה שלנו (כרגע)

| Endpoint | הערה |
|---|---|
| `POST /api/transaction` (`type:"CarInsuranceHistory"`) + `GET .../carInsuranceHistory/{id}` | ביטוח **רכב** — האפליקציה שלנו פנסיונית/חיסכון, לא רכב. להתעלם אלא אם יורחב scope. |
| `harBituach` transaction type + `GET .../harBituach/{id}` (מידע מפורש) | חופף במידה רבה למה ש-`polisot` כבר נותן לנו; רק אם נזדקק למבנה נתונים ייעודי של "הר הביטוח" שלא זהה ל-polisot. |
| Postman Collection / Connectika / Zapier / Make | כלי אינטגרציה חיצוניים — לא רלוונטי, אנחנו קוראים ל-API ישירות. |

---

## סדר עבודה מומלץ

1. **מנפחים את רשימת החברות** מ-`GET /api/manufacturers/list/` בפועל (win קטן, קיים כבר בקוד השרת).
2. **מחליטים על עולם החתימה** — Forms API אמיתי (formA) לפני שליחת 1700, או משאירים את שלנו + formA כשכבה נוספת.
3. **מחברים 1700 בפועל** לרגע שההחלטה "ניוד" מאושרת וחתומה — זה הצעד שהופך את "ניוד" מ-UI-בלבד לפעולה אמיתית מול המסלקה/היצרן.
4. **(אופציונלי) ניקיון תקופתי** — `masked` + `delete files` אחרי ששמרנו את הנתונים אצלנו, בהתאם להמלצת האבטחה של המסלקה.
