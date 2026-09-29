export function jsonToyota(
  codCarg: string | number,
  tagRfid: string,
  skidLabel: string,
  partLabel?: string,
  opcoes?: { baixar?: boolean }
): Promise<string | null>;

export function exportarPaleteToyota(codCarg: string | number, skidLabel: string): string;

export function limparLeiturasToyota(codCarg: string | number): void;


palete

if (status === "3") {
  try {
    // Baixa o JSON acumulado da carga (todos os paletes lidos até agora)
    const nomeArquivo = exportarToyota(carga.cod_carg, {
      sufixo: `ate-palete-${palletAtual.cod_palete.trim()}`,
    });
    console.log("JSON acumulado baixado:", nomeArquivo);
  } catch (error) {
    console.error("Erro ao exportar JSON acumulado da carga:", error);
    setErro("Palete finalizado, mas não foi possível gerar o JSON.");
  }
  skidPaleteRef.current = null;
}