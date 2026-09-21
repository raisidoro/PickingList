function getStorageKey(codCarg) {
  const cargaLimpa = String(codCarg || "SEM_CARGA").trim();
  return `TOYOTA_LEITURAS_${cargaLimpa}`;
}

function normalizar(valor) {
  return String(valor || "").replace(/\s+/g, "");
}

function getEstruturaPadrao() {
  return { skids: [] };
}

function lerLeiturasSalvas(codCarg) {
  try {
    const chave = getStorageKey(codCarg);
    const valorSalvo = localStorage.getItem(chave);

    if (!valorSalvo) return getEstruturaPadrao();

    const parseado = JSON.parse(valorSalvo);

    if (
      parseado &&
      typeof parseado === "object" &&
      Array.isArray(parseado.skids)
    ) {
      return parseado;
    }

    return getEstruturaPadrao();
  } catch (error) {
    throw new Error(
      "Não foi possível acessar as leituras salvas no navegador.",
      { cause: error }
    );
  }
}

function salvarLeituras(codCarg, conteudo) {
  try {
    const chave = getStorageKey(codCarg);

    localStorage.setItem(
      chave,
      JSON.stringify(conteudo, null, 2)
    );
  } catch (error) {
    throw new Error(
      "Não foi possível salvar o arquivo de leitura no navegador.",
      { cause: error }
    );
  }
}

function limparNomeArquivo(valor) {
  return String(valor || "SEM_CARGA")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function baixarArquivo(conteudo, codCarg) {
  const carga = limparNomeArquivo(codCarg);

  const blob = new Blob([conteudo], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `conciliacao-rfid-${carga}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  return link.download;
}

function ultimoSkid(estrutura, qrCodeNormalizado) {
  for (let i = estrutura.skids.length - 1; i >= 0; i--) {
    if (
      normalizar(estrutura.skids[i].qrCode) === qrCodeNormalizado
    ) {
      return estrutura.skids[i];
    }
  }

  return null;
}

export async function registrarSkidLabel(
  codCarg,
  qrCode,
  rfid = "",
  opcoes = {}
) {
  const qrCodeLimpo = String(qrCode || "").trim();
  const rfidLimpo = String(rfid || "").trim();

  if (!qrCodeLimpo && !rfidLimpo) {
    return null;
  }

  const estrutura = lerLeiturasSalvas(codCarg);
  const qrCodeNormalizado = normalizar(qrCodeLimpo);

  let skid = qrCodeLimpo
    ? ultimoSkid(estrutura, qrCodeNormalizado)
    : null;

  if (!skid || skid.parts.length > 0) {
    skid = {
      qrCode: qrCodeLimpo,
      rfid: rfidLimpo,
      parts: [],
    };

    estrutura.skids.push(skid);
  } else {
    if (qrCodeLimpo) skid.qrCode = qrCodeLimpo;
    if (rfidLimpo) skid.rfid = rfidLimpo;
  }

  salvarLeituras(codCarg, estrutura);

  if (opcoes.baixar === true) {
    const conteudo = JSON.stringify(estrutura, null, 2);
    return baixarArquivo(conteudo, codCarg);
  }

  return null;
}

export async function jsonToyota(
  codCarg,
  tagRfidPalete,
  skidLabel,
  tagRfidCaixa,
  partLabel,
  opcoes = {}
) {
  const rfidPalete = String(tagRfidPalete || "").trim();
  const qrCodeSkid = String(skidLabel || "").trim();
  const rfidCaixa = String(tagRfidCaixa || "").trim();
  const qrCodePart = String(partLabel || "").trim();

  if (!qrCodeSkid || !qrCodePart || !rfidCaixa || !rfidPalete) {
    return null;
  }

  const estrutura = lerLeiturasSalvas(codCarg);

  let skid = qrCodeSkid
    ? ultimoSkid(estrutura, normalizar(qrCodeSkid))
    : estrutura.skids[estrutura.skids.length - 1];

  if (!skid) {
    skid = {
      qrCode: qrCodeSkid,
      rfid: rfidPalete,
      parts: [],
    };

    estrutura.skids.push(skid);
  }

  if (!Array.isArray(skid.parts)) {
    skid.parts = [];
  }

  const part = {};

  if (qrCodePart) {
    part.qrCode = qrCodePart;
  }

  if (rfidCaixa) {
    part.rfid = rfidCaixa;
  }

  skid.parts.push(part);

  if (qrCodeSkid) {
    skid.qrCode = qrCodeSkid;
  }

  if (rfidPalete) {
    skid.rfid = rfidPalete;
  }

  salvarLeituras(codCarg, estrutura);

  // Só baixa se for solicitado explicitamente
  if (opcoes.baixar === true) {
    const conteudo = JSON.stringify(estrutura, null, 2);
    return baixarArquivo(conteudo, codCarg);
  }

  return null;
}

export function registrarRfidSkid(codCarg, skidLabel, rfid) {
  const qrCodeSkid = String(skidLabel || "").trim();
  const rfidLimpo = String(rfid || "").trim();

  if (!qrCodeSkid) {
    return null;
  }

  const estrutura = lerLeiturasSalvas(codCarg);

  const skid = ultimoSkid(
    estrutura,
    normalizar(qrCodeSkid)
  );

  if (!skid) {
    throw new Error(
      `Nenhum SKID encontrado para o QR Code ${qrCodeSkid}.`
    );
  }

  skid.rfid = rfidLimpo;

  salvarLeituras(codCarg, estrutura);

  const conteudo = JSON.stringify(estrutura, null, 2);

  return baixarArquivo(conteudo, codCarg);
}

export function exportarPaleteToyota(codCarg, skidLabel) {
  const estrutura = lerLeiturasSalvas(codCarg);
  const skidNormalizado = normalizar(skidLabel);

  const skids = estrutura.skids.filter(
    (skid) =>
      normalizar(skid.qrCode) === skidNormalizado
  );

  if (skids.length === 0) {
    throw new Error(
      `Nenhuma leitura encontrada para o SKID ${skidLabel} na carga ${codCarg}.`
    );
  }

  const conteudo = JSON.stringify(
    {
      skids,
    },
    null,
    2
  );

  return baixarArquivo(conteudo, codCarg);
}

export function exportarToyota(codCarg) {
  if (!codCarg) {
    throw new Error("Código da carga não informado.");
  }

  const estrutura = lerLeiturasSalvas(codCarg);

  if (!estrutura.skids.length) {
    throw new Error(
      `Nenhuma leitura encontrada para a carga ${codCarg}.`
    );
  }

  const conteudo = JSON.stringify(
    estrutura,
    null,
    2
  );

  return baixarArquivo(conteudo, codCarg);
}

export function limparLeiturasToyota(codCarg) {
  localStorage.removeItem(
    getStorageKey(codCarg)
  );
}

export function ultimoSkidRegistrado(codCarg) {
  const estrutura = lerLeiturasSalvas(codCarg);
  const skid = estrutura.skids[estrutura.skids.length - 1];

  if (!skid || !skid.qrCode || !skid.rfid) return null;

  return { skidLabel: skid.qrCode, rfid: skid.rfid };
}