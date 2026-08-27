const STORAGE_KEY = "TOYOTA_LEITURAS";

function getFileNameDoDia() {
  return new Date().toISOString().slice(0, 10);
}

function normalizar(valor) {
  return String(valor || "").replace(/\s+/g, "");
}

function getEstruturaPadrao() {
  return {
    carga: { pallets: {} },
    pallets: {}
  };
}

function obterPaletes(estrutura) {
  const base = estrutura && typeof estrutura === "object" ? estrutura : getEstruturaPadrao();

  const paletesSalvos = base.carga?.pallets ?? base.pallets;
  const paletes = {};

  if (Array.isArray(paletesSalvos)) {
    paletesSalvos.forEach((palete, indice) => {
      const chave = normalizar(palete?.skidLabel) || `palete_${indice + 1}`;
      paletes[chave] = palete;
    });
  } else if (paletesSalvos && typeof paletesSalvos === "object") {
    Object.assign(paletes, paletesSalvos);
  }

  base.pallets = paletes;
  base.carga = base.carga && typeof base.carga === "object" ? base.carga : { pallets: {} };
  base.carga.pallets = paletes;

  return paletes;
}

function lerLeiturasSalvas() {
  try {
    const valorSalvo = localStorage.getItem(STORAGE_KEY);

    if (!valorSalvo) {
      return getEstruturaPadrao();
    }

    const parseado = JSON.parse(valorSalvo);

    if (parseado && typeof parseado === "object") {
      const estrutura = parseado && typeof parseado === "object" ? parseado : getEstruturaPadrao();
      obterPaletes(estrutura);

      return estrutura;
    }

    return getEstruturaPadrao();
  } catch (error) {
    throw new Error("Não foi possível acessar as leituras salvas no navegador.", { cause: error });
  }
}

function salvarLeituras(conteudo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conteudo, null, 2));
  } catch (error) {
    throw new Error("Não foi possível salvar o arquivo de leitura no navegador.", { cause: error });
  }
}

function baixarArquivo(conteudo, nomeArquivo = `Toyota_${getFileNameDoDia()}.json`) {
  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);

  return nomeArquivo;
}

export async function jsonToyota(kanban, tagRfid, skidLabel, partLabel, opcoes = {}) {
  const kanbanLimpo = String(kanban || "").trim();
  const tagRfidLimpa = String(tagRfid || "").trim();
  const skidLabelLimpo = String(skidLabel || "").trim();
  const partLabelLimpo = String(partLabel || "").trim();
  const labelDoPalete = skidLabelLimpo;

  if (!labelDoPalete && !kanbanLimpo && !tagRfidLimpa) {
    return null;
  }

  let estrutura = lerLeiturasSalvas();

  if (!estrutura || typeof estrutura !== "object") {
    estrutura = getEstruturaPadrao();
  }

  const paletes = obterPaletes(estrutura);

  let palete = null;
  let chavePalete = "";

  if (labelDoPalete) {
    chavePalete = normalizar(labelDoPalete);
    palete = paletes[chavePalete];

    if (!palete) {
      palete = { skidLabel: labelDoPalete, items: {} };
      paletes[chavePalete] = palete;
    }
  } else {
    const chavesPaletes = Object.keys(paletes);
    chavePalete = chavesPaletes[chavesPaletes.length - 1] || "palete_1";
    palete = paletes[chavePalete] || { skidLabel: "", items: {} };
    if (!paletes[chavePalete]) {
      paletes[chavePalete] = palete;
    }
  }

  if (!palete.items || typeof palete.items !== "object" || Array.isArray(palete.items)) {
    palete.items = {};
  }

  if (labelDoPalete) {
    palete.skidLabel = labelDoPalete;
  }

  if (!kanbanLimpo && !tagRfidLimpa) {
    const conteudo = JSON.stringify(estrutura, null, 2);
    salvarLeituras(estrutura);
    return opcoes.baixar === false ? null : baixarArquivo(conteudo);
  }

  const caixa = {};

  if (partLabelLimpo) {
    caixa.partLabel = partLabelLimpo;
  }

  if (kanbanLimpo) {
    caixa.kanban = kanbanLimpo;
  }

  if (tagRfidLimpa) {
    caixa.tagRfid = tagRfidLimpa;
  }

  let itemAtual = null;

  if (kanbanLimpo) {
    itemAtual = Object.values(palete.items)
      .find((item) => normalizar(item?.kanban) === normalizar(kanbanLimpo));
  }

  if (!itemAtual) {
    itemAtual = {
      skidLabel: palete.skidLabel || labelDoPalete || "",
      items: {}
    };

    if (kanbanLimpo) {
      itemAtual.kanban = kanbanLimpo;
    }

    const chaveItem = kanbanLimpo || `item_${Object.keys(palete.items).length + 1}`;
    palete.items[chaveItem] = itemAtual;
  }

  itemAtual.skidLabel = palete.skidLabel || labelDoPalete || itemAtual.skidLabel || "";

  if (!itemAtual.items || typeof itemAtual.items !== "object" || Array.isArray(itemAtual.items)) {
    itemAtual.items = {};
  }
  itemAtual.items[String(Object.keys(itemAtual.items).length + 1)] = caixa;

  estrutura.pallets = paletes;
  estrutura.carga = estrutura.carga && typeof estrutura.carga === "object" ? estrutura.carga : { pallets: {} };
  estrutura.carga.pallets = paletes;

  const conteudo = JSON.stringify(estrutura, null, 2);
  salvarLeituras(estrutura);

  return opcoes.baixar === false ? null : baixarArquivo(conteudo);
}

export function exportarPaleteToyota(skidLabel) {
  const estrutura = lerLeiturasSalvas();
  const paletes = obterPaletes(estrutura);
  const palete = paletes[normalizar(skidLabel)];

  if (!palete) {
    throw new Error(`Nenhuma leitura encontrada para o palete ${skidLabel}.`);
  }

  const conteudo = JSON.stringify({
    carga: { pallets: { [normalizar(skidLabel)]: palete } },
    pallets: { [normalizar(skidLabel)]: palete }
  }, null, 2);
  const nomeSeguro = normalizar(skidLabel).replace(/[^a-zA-Z0-9_-]/g, "_");

  salvarLeituras(estrutura);
  return baixarArquivo(conteudo, `Toyota_${getFileNameDoDia()}.json`);
}

export function limparLeiturasToyota() {
  localStorage.removeItem(STORAGE_KEY);
}
