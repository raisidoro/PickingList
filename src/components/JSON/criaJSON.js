const STORAGE_KEY = "TOYOTA_LEITURAS";

function getFileNameDoDia() {
  return new Date().toISOString().slice(0, 10);
}

function normalizar(valor) {
  return String(valor || "").replace(/\s+/g, "");
}

function getEstruturaPadrao() {
  return {
    carga: { pallets: [] },
    pallets: []
  };
}

function obterPaletes(estrutura) {
  const base = estrutura && typeof estrutura === "object" ? estrutura : getEstruturaPadrao();

  const paletes = Array.isArray(base.carga?.pallets)
    ? base.carga.pallets
    : Array.isArray(base.pallets)
      ? base.pallets
      : [];

  base.pallets = paletes;
  base.carga = base.carga && typeof base.carga === "object" ? base.carga : { pallets: [] };
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
      const paletes = Array.isArray(parseado.carga?.pallets)
        ? parseado.carga.pallets
        : Array.isArray(parseado.pallets)
          ? parseado.pallets
          : [];

      const estrutura = parseado && typeof parseado === "object" ? parseado : getEstruturaPadrao();
      estrutura.pallets = paletes;
      estrutura.carga = estrutura.carga && typeof estrutura.carga === "object" ? estrutura.carga : { pallets: [] };
      estrutura.carga.pallets = paletes;

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

function baixarArquivo(conteudo) {
  const nomeArquivo = `Toyota_${getFileNameDoDia()}.json`;
  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);

  return nomeArquivo;
}

export async function jsonToyota(kanban, tagRfid, skidLabel, partLabel) {
  const kanbanLimpo = String(kanban || "").trim();
  const tagRfidLimpa = String(tagRfid || "").trim();
  const skidLabelLimpo = String(skidLabel || "").trim();
  const partLabelLimpo = String(partLabel || "").trim();
  const labelDoPalete = skidLabelLimpo || partLabelLimpo;

  if (!labelDoPalete && !kanbanLimpo && !tagRfidLimpa) {
    return null;
  }

  let estrutura = lerLeiturasSalvas();

  if (!estrutura || typeof estrutura !== "object") {
    estrutura = getEstruturaPadrao();
  }

  const paletes = obterPaletes(estrutura);

  let palete = null;

  if (labelDoPalete) {
    palete = paletes.find((item) => normalizar(item?.skidLabel) === normalizar(labelDoPalete));

    if (!palete) {
      palete = { skidLabel: labelDoPalete, items: [] };
      paletes.push(palete);
    }
  } else {
    palete = paletes[paletes.length - 1] || { skidLabel: "", items: [] };
    if (!paletes.length) {
      paletes.push(palete);
    }
  }

  if (!Array.isArray(palete.items)) {
    palete.items = [];
  }

  if (labelDoPalete) {
    palete.skidLabel = labelDoPalete;
  }

  if (!kanbanLimpo && !tagRfidLimpa) {
    const conteudo = JSON.stringify(estrutura, null, 2);
    salvarLeituras(estrutura);
    return baixarArquivo(conteudo);
  }

  const caixa = {};

  if (kanbanLimpo) {
    caixa.kanban = kanbanLimpo;
  }

  if (tagRfidLimpa) {
    caixa.tagRfid = tagRfidLimpa;
  }

  let itemAtual = null;

  if (kanbanLimpo) {
    itemAtual = palete.items.find((item) => normalizar(item?.kanban) === normalizar(kanbanLimpo));
  }

  if (!itemAtual) {
    itemAtual = {
      skidLabel: palete.skidLabel || labelDoPalete || "",
      items: []
    };

    if (kanbanLimpo) {
      itemAtual.kanban = kanbanLimpo;
    }

    palete.items.push(itemAtual);
  }

  itemAtual.skidLabel = palete.skidLabel || labelDoPalete || itemAtual.skidLabel || "";

  if (Array.isArray(itemAtual.items)) {
    itemAtual.items.push(caixa);
  } else {
    itemAtual.items = [caixa];
  }

  estrutura.pallets = paletes;
  estrutura.carga = estrutura.carga && typeof estrutura.carga === "object" ? estrutura.carga : { pallets: [] };
  estrutura.carga.pallets = paletes;

  const conteudo = JSON.stringify(estrutura, null, 2);
  salvarLeituras(estrutura);

  return baixarArquivo(conteudo);
}

export function limparLeiturasToyota() {
  localStorage.removeItem(STORAGE_KEY);
}
