const STORAGE_KEY = "TOYOTA_LEITURAS";

function getFileNameDoDia() {
  return new Date().toISOString().slice(0, 10);
}

function normalizar(valor) {
  return String(valor || "").replace(/\s+/g, "");
}

function lerLeiturasSalvas() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (error) {
    throw new Error("Não foi possível acessar as leituras salvas no navegador.", { cause: error });
  }
}

function salvarLeituras(conteudo) {
  try {
    localStorage.setItem(STORAGE_KEY, conteudo);
  } catch (error) {
    throw new Error("Não foi possível salvar o arquivo de leitura no navegador.", { cause: error });
  }
}

function baixarArquivo(conteudo) {
  const nomeArquivo = `Toyota_${getFileNameDoDia()}.txt`;
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);

  return nomeArquivo;
}

export async function jsonToyota(kanban, tagRfid, skidLabel, partLabel) {
  const valores = [kanban, tagRfid, skidLabel, partLabel].map(normalizar);
  const leitura = valores.filter(Boolean).join("\n");

  if (!leitura) return null;

  const conteudo = `${lerLeiturasSalvas()}${leitura}\n`;
  salvarLeituras(conteudo);

  return baixarArquivo(conteudo);
}

export function limparLeiturasToyota() {
  localStorage.removeItem(STORAGE_KEY);
}
