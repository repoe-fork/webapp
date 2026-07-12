import { atom } from "jotai";

export const dbLoadingProgress = atom<{
  loaded: number;
  total: number;
  url: string;
} | null>(null);
