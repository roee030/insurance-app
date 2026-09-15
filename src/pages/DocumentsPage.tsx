import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  FileText,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { DocumentField, SignDocument } from "@/domain/types";
import { useDocuments } from "@/store/useDocuments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const FIELD_TYPES: { value: DocumentField["type"]; label: string }[] = [
  { value: "signature", label: "חתימה" },
  { value: "text", label: "טקסט" },
  { value: "checkbox", label: "תיבת סימון" },
];

const FIELD_SOURCES: { value: DocumentField["source"]; label: string }[] = [
  { value: "manual", label: "מולא ע״י הלקוח" },
  { value: "client_name", label: "אוטומטי — שם לקוח" },
  { value: "client_id", label: "אוטומטי — ת.ז לקוח" },
  { value: "agent_name", label: "אוטומטי — שם סוכן" },
  { value: "date", label: "אוטומטי — תאריך" },
];

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:application/pdf;base64," prefix — only the payload is stored
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DocumentsPage() {
  const { documents, loading, load, upload } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fileContent = await readAsBase64(file);
      await upload({ title: file.name.replace(/\.pdf$/i, ""), fileName: file.name, fileContent });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700"
      >
        <ArrowRight className="size-4" /> חזרה לצנרת
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
            <FileText className="size-5 text-slate-500" /> מסמכים לחתימה מרחוק
          </h1>
          <p className="text-xs text-slate-500">
            העלאת PDF, הגדרת שדות למילוי/חתימה, ושליחת קישור ללקוח
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void onPickFile(e)}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="size-4" /> {uploading ? "מעלה…" : "העלה PDF"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-800">
        זו הכנת קרקע בלבד: ניתן להעלות PDF, להגדיר שדות ולשלוח קישור חתימה
        ללקוח. מיקום ויזואלי של השדות על גבי דף ה-PDF, והזרקת הערכים בפועל
        חזרה לתוך הקובץ — עדיין לא מומשו.
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">טוען…</div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-slate-400">
          אין עדיין מסמכים. העלה PDF כדי להתחיל.
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((d) => (
            <DocumentCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </main>
  );
}

function DocumentCard({ doc }: { doc: SignDocument }) {
  const saveFields = useDocuments((s) => s.saveFields);
  const send = useDocuments((s) => s.send);
  const remove = useDocuments((s) => s.remove);
  const [fields, setFields] = useState(doc.fields);
  const [copied, setCopied] = useState(false);

  const addField = () => {
    setFields((f) => [
      ...f,
      { id: crypto.randomUUID(), type: "text", label: "", source: "manual", required: true },
    ]);
  };
  const patchField = (id: string, p: Partial<DocumentField>) => {
    setFields((f) => f.map((x) => (x.id === id ? { ...x, ...p } : x)));
  };
  const removeField = (id: string) => {
    setFields((f) => f.filter((x) => x.id !== id));
  };

  const dirty = JSON.stringify(fields) !== JSON.stringify(doc.fields);
  const signLink = `${window.location.origin}${window.location.pathname}#/docsign/${doc.token}`;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-slate-800">{doc.title}</div>
          <div className="text-[11px] text-slate-500">{doc.fileName}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {doc.completedAt ? (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              נחתם ע״י {doc.signerName}
            </span>
          ) : doc.sentAt ? (
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-700">
              נשלח, ממתין לחתימה
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              טיוטה
            </span>
          )}
          <button
            onClick={() => void remove(doc.id)}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-1.5">
            <input
              value={f.label}
              onChange={(e) => patchField(f.id, { label: e.target.value })}
              placeholder="תווית שדה (לדוגמה: חתימת לקוח)"
              className="h-8 flex-1 rounded-md border border-line bg-white px-2 text-[12px] text-slate-900 outline-none placeholder:text-slate-400"
            />
            <select
              value={f.type}
              onChange={(e) => patchField(f.id, { type: e.target.value as DocumentField["type"] })}
              className="h-8 rounded-md border border-line bg-white px-1.5 text-[11px] text-slate-600"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={f.source}
              onChange={(e) =>
                patchField(f.id, { source: e.target.value as DocumentField["source"] })
              }
              className="h-8 rounded-md border border-line bg-white px-1.5 text-[11px] text-slate-600"
            >
              {FIELD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-slate-500">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => patchField(f.id, { required: e.target.checked })}
              />
              חובה
            </label>
            <button
              onClick={() => removeField(f.id)}
              className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={addField}
          className="inline-flex items-center gap-1 text-[11px] text-cyan-700 hover:underline"
        >
          <Plus className="size-3" /> הוסף שדה
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty}
          onClick={() => void saveFields(doc.id, fields)}
        >
          שמור שדות
        </Button>
        <Button
          size="sm"
          variant={doc.sentAt ? "subtle" : "primary"}
          onClick={() => void send(doc.id)}
        >
          <Send className="size-3.5" /> {doc.sentAt ? "נשלח" : "שלח לחתימה"}
        </Button>
        {doc.sentAt && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(signLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-slate-600 hover:border-cyan-500/50",
            )}
          >
            <Copy className="size-3.5" /> {copied ? "הועתק!" : "העתק קישור"}
          </button>
        )}
      </div>
    </div>
  );
}
