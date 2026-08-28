function getStorageKey(codCarg) {
  const cargaLimpa = String(codCarg || "SEM_CARGA").trim();
  return `TOYOTA_LEITURAS_${cargaLimpa}`;
}

function getFileNameDoDia() {
  return new Date().toISOString().slice(0, 10);
}

function normalizar(valor) {
  return String(valor || "").replace(/\s+/g, "");
}

function getEstruturaPadrao() {
  return { pallets: [] };
}

function lerLeiturasSalvas(codCarg) {
  try {
    const chave = getStorageKey(codCarg);
    const valorSalvo = localStorage.getItem(chave);
    if (!valorSalvo) return getEstruturaPadrao();

    const parseado = JSON.parse(valorSalvo);
    if (parseado && typeof parseado === "object" && Array.isArray(parseado.pallets)) {
      return parseado;
    }
    return getEstruturaPadrao();
  } catch (error) {
    throw new Error("Não foi possível acessar as leituras salvas no navegador.", { cause: error });
  }
}

function salvarLeituras(codCarg, conteudo) {
  try {
    const chave = getStorageKey(codCarg);
    localStorage.setItem(chave, JSON.stringify(conteudo, null, 2));
  } catch (error) {
    throw new Error("Não foi possível salvar o arquivo de leitura no navegador.", { cause: error });
  }
}

function baixarArquivo(conteudo, nomeArquivo) {
  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);

  return nomeArquivo;
}

function nomeArquivoCarga(codCarg) {
  const cargaLimpa = normalizar(codCarg) || "SEM_CARGA";
  return `Toyota_${cargaLimpa}_${getFileNameDoDia()}.json`;
}

function ultimoGrupoDoSkid(estrutura, skidLabelNormalizado) {
  for (let i = estrutura.pallets.length - 1; i >= 0; i--) {
    if (normalizar(estrutura.pallets[i].skidLabel) === skidLabelNormalizado) {
      return estrutura.pallets[i];
    }
  }
  return null;
}

// Registra/garante um grupo vazio pronto para os itens do palete.
// NÃO grava a tagRfid do skid no JSON — serve só pra abrir o palete.
export async function registrarSkidLabel(codCarg, skidLabel, opcoes = {}) {
  const skidLabelLimpo = String(skidLabel || "").trim();
  if (!skidLabelLimpo) return null;

  const estrutura = lerLeiturasSalvas(codCarg);
  const skidNormalizado = normalizar(skidLabelLimpo);

  let grupo = ultimoGrupoDoSkid(estrutura, skidNormalizado);
  if (!grupo || grupo.items.length > 0) {
    grupo = { items: [], skidLabel: skidLabelLimpo };
    estrutura.pallets.push(grupo);
  }

  salvarLeituras(codCarg, estrutura);
  const conteudo = JSON.stringify(estrutura, null, 2);
  return opcoes.baixar === false ? null : baixarArquivo(conteudo, nomeArquivoCarga(codCarg));
}

// Registra a leitura de uma caixa/item.
// "partLabel" é gravado no campo "kanban" do JSON (nome do campo mantido, valor é o partLabel).
export async function jsonToyota(codCarg, tagRfid, skidLabel, partLabel, opcoes = {}) {
  const tagRfidLimpa = String(tagRfid || "").trim();
  const skidLabelLimpo = String(skidLabel || "").trim();
  const partLabelLimpo = String(partLabel || "").trim();

  if (!skidLabelLimpo && !tagRfidLimpa && !partLabelLimpo) {
    return null;
  }

  const estrutura = lerLeiturasSalvas(codCarg);
  const skidNormalizado = normalizar(skidLabelLimpo);

  let grupo = skidLabelLimpo
    ? ultimoGrupoDoSkid(estrutura, skidNormalizado)
    : estrutura.pallets[estrutura.pallets.length - 1];

  if (!grupo) {
    grupo = { items: [], skidLabel: skidLabelLimpo };
    estrutura.pallets.push(grupo);
  }

  if (!Array.isArray(grupo.items)) {
    grupo.items = [];
  }

  const ultimoItem = grupo.items[grupo.items.length - 1];
  const kanbanMudou = grupo.items.length > 0
    && normalizar(ultimoItem?.kanban) !== normalizar(partLabelLimpo);

  if (kanbanMudou) {
    grupo = { items: [], skidLabel: skidLabelLimpo || grupo.skidLabel };
    estrutura.pallets.push(grupo);
  }

  const caixa = {};
  if (partLabelLimpo) caixa.kanban = partLabelLimpo;
  if (tagRfidLimpa) caixa.tagRfid = tagRfidLimpa;

  grupo.items.push(caixa);
  if (skidLabelLimpo) grupo.skidLabel = skidLabelLimpo;

  salvarLeituras(codCarg, estrutura);
  const conteudo = JSON.stringify(estrutura, null, 2);

  return opcoes.baixar === false ? null : baixarArquivo(conteudo, nomeArquivoCarga(codCarg));
}

export function exportarPaleteToyota(codCarg, skidLabel) {
  const estrutura = lerLeiturasSalvas(codCarg);
  const skidNormalizado = normalizar(skidLabel);
  const grupos = estrutura.pallets.filter((p) => normalizar(p.skidLabel) === skidNormalizado);

  if (grupos.length === 0) {
    throw new Error(`Nenhuma leitura encontrada para o palete ${skidLabel} na carga ${codCarg}.`);
  }

  const conteudo = JSON.stringify({ pallets: grupos }, null, 2);
  return baixarArquivo(conteudo, nomeArquivoCarga(codCarg));
}

export function limparLeiturasToyota(codCarg) {
  localStorage.removeItem(getStorageKey(codCarg));
}

