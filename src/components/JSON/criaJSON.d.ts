export function jsonToyota(
  codCarg: string | number,
  tagRfid: string,
  skidLabel: string,
  tagRfidCaixa: string,
  partLabel?: string,
  opcoes?: { baixar?: boolean }
): Promise<string | null>;

export function exportarPaleteToyota(codCarg: string | number, skidLabel: string): string;

export function limparLeiturasToyota(codCarg: string | number): void;

export function ultimoSkidRegistrado(codCarg: string):{
  skidLabel: string;
  rfid: string;
} | null;