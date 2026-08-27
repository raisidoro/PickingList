export function jsonToyota(
  kanban: string,
  tagRfid: string,
  skidLabel: string,
  partLabel?: string,
  opcoes?: { baixar?: boolean }
): Promise<string | null>;

export function exportarPaleteToyota(skidLabel: string): string;

export function limparLeiturasToyota(): void;