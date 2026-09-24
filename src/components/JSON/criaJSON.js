
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || "http://localhost:3000/enviar-email";
const EMAIL_API_KEY = '3m@!lauT0m@t1c0';

// Converte string (JSON) para base64 preservando caracteres UTF-8 (acentos etc.)
function stringParaBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binario = "";
  bytes.forEach((b) => {
    binario += String.fromCharCode(b);
  });
  return btoa(binario);
}

// função de teste pra enviar JSON no fim dos paletes
export async function enviarPaleteEmailTeste(codCarg, skidLabel, opcoes = {}) {
  const estrutura = lerLeiturasSalvas(codCarg);
  const skidNormalizado = normalizar(skidLabel);

  const skids = estrutura.skids.filter(
    (skid) => normalizar(skid.qrCode) === skidNormalizado
  );

  if (skids.length === 0) {
    throw new Error(`Nenhuma leitura encontrada para o SKID ${skidLabel}.`);
  }

  const conteudo = JSON.stringify({ skids }, null, 2);
  const nomeArquivo = `conciliacao-rfid-${limparNomeArquivo(codCarg)}-${limparNomeArquivo(skidLabel)}.json`;

  const payload = {
    subject: opcoes.subject || `[TESTE] Conciliação RFID - Carga ${codCarg} - Palete ${skidLabel}`,
    body: opcoes.body || `Envio de teste: palete ${skidLabel} finalizado na carga ${codCarg}.`,
    recipients: opcoes.recipients,
    attachments: [
      {
        filename: nomeArquivo,
        content: stringParaBase64(conteudo),
        encoding: "base64",
        contentType: "application/json",
      },
    ],
  };

  const resposta = await fetch(EMAIL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": EMAIL_API_KEY },
    body: JSON.stringify(payload),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.error || `Falha ao enviar e-mail (status ${resposta.status}).`);
  }
  return dados;
}

export async function enviarConciliacaoPorEmail(codCarg, opcoes = {}) {
  if (!codCarg) {
    throw new Error("Código da carga não informado.");
  }

  const estrutura = lerLeiturasSalvas(codCarg);

  if (!estrutura.skids.length) {
    throw new Error(
      `Nenhuma leitura encontrada para a carga ${codCarg}. Nada para enviar.`
    );
  }

  const conteudo = JSON.stringify(estrutura, null, 2);
  const nomeArquivo = `conciliacao-rfid-${limparNomeArquivo(codCarg)}.json`;

  const payload = {
    subject: opcoes.subject || `Conciliação RFID - Carga ${codCarg}`,
    body:
      opcoes.body ||
      `Segue em anexo o arquivo de conciliação RFID referente à carga ${codCarg}.\n\n` +
      `Total de SKIDs: ${estrutura.skids.length}`,
    recipients: opcoes.recipients, // opcional; se omitido, backend usa DEFAULT_RECIPIENT
    attachments: [
      {
        filename: nomeArquivo,
        content: stringParaBase64(conteudo),
        encoding: "base64",
        contentType: "application/json",
      },
    ],
  };

  let resposta;
  try {
    resposta = await fetch(EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": EMAIL_API_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      "Não foi possível conectar ao serviço de envio de e-mail.",
      { cause: error }
    );
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      dados.error || `Falha ao enviar e-mail (status ${resposta.status}).`
    );
  }

  return dados;
}

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

export async function exportarToyota(codCarg, opcoes = {}) {
  if (!codCarg) {
    throw new Error("Código da carga não informado.");
  }

  const estrutura = lerLeiturasSalvas(codCarg);

  if (!estrutura.skids.length) {
    throw new Error(
      `Nenhuma leitura encontrada para a carga ${codCarg}.`
    );
  }

  const conteudo = JSON.stringify(estrutura, null, 2);
  const nomeArquivo = baixarArquivo(conteudo, codCarg);

  if (opcoes.enviarEmail === true) {
    await enviarConciliacaoPorEmail(codCarg, opcoes.emailOpcoes);
  }

  return nomeArquivo;
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