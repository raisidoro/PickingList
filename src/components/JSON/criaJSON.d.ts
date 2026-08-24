export function jsonToyota(
  kanban: string,
  tagRfid: string,
  skidLabel: string,
  partLabel?: string
): Promise<string | null>;

export function limparLeiturasToyota(): void;