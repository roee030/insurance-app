import { create } from "zustand";
import type {
  AgentProfile,
  AnswerBankEntry,
  Discount,
  PrimaryManufacturer,
  Settings,
} from "@/domain/types";
import { api } from "@/lib/api";

interface SettingsState {
  settings: Settings | null;
  loading: boolean;

  load: () => Promise<void>;
  saveAgentProfile: (profile: AgentProfile) => Promise<void>;
  saveAnswerBankEntry: (entry: AnswerBankEntry) => Promise<void>;
  deleteAnswerBankEntry: (id: string) => Promise<void>;
  saveDiscount: (discount: Discount) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  saveManufacturer: (m: PrimaryManufacturer) => Promise<void>;
  deleteManufacturer: (id: string) => Promise<void>;
}

export const useSettings = create<SettingsState>((set) => ({
  settings: null,
  loading: true,

  load: async () => {
    const settings = await api.getSettings();
    set({ settings, loading: false });
  },

  saveAgentProfile: async (profile) => {
    const settings = await api.saveAgentProfile(profile);
    set({ settings });
  },

  saveAnswerBankEntry: async (entry) => {
    const settings = await api.saveAnswerBankEntry(entry);
    set({ settings });
  },

  deleteAnswerBankEntry: async (id) => {
    const settings = await api.deleteAnswerBankEntry(id);
    set({ settings });
  },

  saveDiscount: async (discount) => {
    const settings = await api.saveDiscount(discount);
    set({ settings });
  },

  deleteDiscount: async (id) => {
    const settings = await api.deleteDiscount(id);
    set({ settings });
  },

  saveManufacturer: async (m) => {
    const settings = await api.saveManufacturer(m);
    set({ settings });
  },

  deleteManufacturer: async (id) => {
    const settings = await api.deleteManufacturer(id);
    set({ settings });
  },
}));
