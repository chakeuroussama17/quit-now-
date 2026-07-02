import { create } from 'zustand';

/** Cross-tab UI state — the log sheet opens from the tab bar's center button. */
interface UiState {
  logSheetOpen: boolean;
  setLogSheetOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  logSheetOpen: false,
  setLogSheetOpen: (logSheetOpen) => set({ logSheetOpen }),
}));
