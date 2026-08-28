export function jsonToyota(
  codCarg: string | number,
  tagRfid: string,
  skidLabel: string,
  partLabel?: string,
  opcoes?: { baixar?: boolean }
): Promise<string | null>;

export function exportarPaleteToyota(codCarg: string | number, skidLabel: string): string;

export function limparLeiturasToyota(codCarg: string | number): void;