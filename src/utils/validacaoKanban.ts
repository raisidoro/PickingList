import type { PalletItem } from "../types/pallet.ts";

export const KANBAN_REGEX = /^X\|([A-Z]-\d{3})\|(\d{4})?$/i;
export const KANBAN_REGEX_FULL = /^X\|([A-Z]-\d{3})\|(\d{4})(?:\|.*)?$/i;
export const ETIQUETA_REGEX = /^[A-Z]-\d{3}$/i;

export function parseKanban(kanban: string) {
  const match = kanban.match(KANBAN_REGEX_FULL);
  if (!match) return null;
  return { parte1: match[1], parte2: match[2], concatenado: `${match[1]}${match[2]}` };
}

export function encontraItensComKanban(itens: PalletItem[], kanbanOriginal: string, concatenado: string, parte1: string) {
  return itens.filter(item => {
    const raw = (item.kanban ?? "").toString();
    const digits = raw.replace(/\D/g, "");
    return raw === kanbanOriginal || digits === concatenado || raw.includes(parte1);
  });
}