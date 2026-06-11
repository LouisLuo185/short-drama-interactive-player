import { create } from "zustand";
import type { DanmuImportStatus, DanmuItem } from "./danmuTypes";

export type DanmuStoreState = {
  allDanmuItems: DanmuItem[];
  currentEpisodeDanmuItems: DanmuItem[];
  importStatus: DanmuImportStatus;
  importMessage: string | null;
  isDanmuVisible: boolean;
  setAllDanmuItems: (items: DanmuItem[]) => void;
  setCurrentEpisodeDanmuItems: (items: DanmuItem[]) => void;
  clearCurrentEpisodeDanmuItems: () => void;
  clearAllDanmuItems: () => void;
  setImportResult: (status: DanmuImportStatus, message: string | null) => void;
  setDanmuVisible: (visible: boolean) => void;
};

export const useDanmuStore = create<DanmuStoreState>((set) => ({
  allDanmuItems: [],
  currentEpisodeDanmuItems: [],
  importStatus: "idle",
  importMessage: null,
  isDanmuVisible: true,
  setAllDanmuItems: (allDanmuItems) => set({ allDanmuItems }),
  setCurrentEpisodeDanmuItems: (currentEpisodeDanmuItems) =>
    set({ currentEpisodeDanmuItems }),
  clearCurrentEpisodeDanmuItems: () => set({ currentEpisodeDanmuItems: [] }),
  clearAllDanmuItems: () =>
    set({
      allDanmuItems: [],
      currentEpisodeDanmuItems: [],
      importStatus: "idle",
      importMessage: null
    }),
  setImportResult: (importStatus, importMessage) => set({ importStatus, importMessage }),
  setDanmuVisible: (isDanmuVisible) => set({ isDanmuVisible })
}));
