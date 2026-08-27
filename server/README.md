# Mislaka API Server

תשתית Backend שמחברת את האפליקציה ל-Mislaka-API (Nobel Digital / Swiftness).
היא שולחת ללקוח SMS עם קישור אישי למסלקה, מקבלת חזרה את המידע דרך **Webhook**
ברגע שהלקוח מאשר, ושומרת אותו אצלנו (כי המסלקה מוחקת את הנתונים אחרי 7 ימים).

## הרצה

```bash
cd server
cp .env.example .env      # פעם ראשונה
npm install
npm run dev               # http://localhost:4000
```

ברירת המחדל היא `MISLAKA_MODE=mock` — סימולטור מקומי, ללא עלות וללא credentials.
למעבר ל-API האמיתי: הגדר `MISLAKA_MODE=live`, `MISLAKA_TOKEN` ו-`MISLAKA_SENDER_ID`.

## הזרימה (ממופה לשלבי ה-Pipeline)

| שלב | פעולה | Endpoint פנימי | קריאת Mislaka |
|-----|-------|----------------|----------------|
| ① → ② | הוספת לקוח + שליחת SMS | `POST /api/clients` | `POST /leads-page/create` (inform:true) |
| ③ | המידע חוזר אוטומטית | `POST /api/webhooks/mislaka` | webhook נכנס → `GET …/polisot/data` |
| ④ | בחירת מוצר | `POST /api/clients/:id/product` | — |
| ⑤/⑥ | קידום שלב | `POST /api/clients/:id/advance` | (בהמשך: `POST /transaction` 1700) |

## Endpoints

- `GET  /api/health` — סטטוס + מצב (mock/live)
- `GET  /api/clients` · `GET /api/clients/:id`
- `POST /api/clients` — יוצר לקוח **ושולח SMS** `{firstName,lastName,personId,mobile,email?}`
- `POST /api/clients/:id/product` — שומר מוצר נבחר
- `POST /api/clients/:id/advance` — מקדם שלב אחד
- `POST /api/clients/:id/simulate-approval` — (mock בלבד) מפעיל webhook ידנית
- `POST /api/webhooks/mislaka` — **מקבל את ה-callback מהמסלקה**
- `GET  /api/webhooks/logs` — יומן ה-webhooks שהתקבלו
- `GET  /api/manufacturers` — רשימת חברות הביטוח

## נקודות קריטיות מהתיעוד

- **שמירת 7 ימים בלבד** אצל המסלקה → אנחנו מושכים ושומרים מיד ב-webhook.
- **Webhook = POST** מהמסלקה אלינו → חייב `PUBLIC_BASE_URL` שהוא HTTPS ציבורי בפרודקשן.
- Rate limit: 100 בקשות לדקה. אימות: header `token`.

## אחסון

כרגע JSON file פשוט ב-`server/data/db.json` (מספיק לפיתוח).
לפרודקשן — להחליף ב-Postgres/SQLite (המבנה ב-`src/types.ts` כבר מוכן לכך).
