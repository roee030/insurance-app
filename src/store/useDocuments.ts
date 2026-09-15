import { create } from "zustand";
import type { DocumentField, SignDocument } from "@/domain/types";
import { api } from "@/lib/api";

interface DocumentsState {
  documents: SignDocument[];
  loading: boolean;

  load: () => Promise<void>;
  upload: (input: {
    title: string;
    fileName: string;
    fileContent: string;
    clientId?: string;
  }) => Promise<SignDocument>;
  saveFields: (id: string, fields: DocumentField[]) => Promise<void>;
  send: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useDocuments = create<DocumentsState>((set, get) => ({
  documents: [],
  loading: true,

  load: async () => {
    const documents = await api.listDocuments();
    set({ documents, loading: false });
  },

  upload: async (input) => {
    const doc = await api.uploadDocument(input);
    set({ documents: [doc, ...get().documents] });
    return doc;
  },

  saveFields: async (id, fields) => {
    const updated = await api.saveDocumentFields(id, fields);
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? updated : d)) }));
  },

  send: async (id) => {
    const updated = await api.sendDocument(id);
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? updated : d)) }));
  },

  remove: async (id) => {
    await api.deleteDocument(id);
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },
}));
