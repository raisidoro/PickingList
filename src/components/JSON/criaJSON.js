import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

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
    const valorSalvo = localStorage.getItem(getStorageKey(codCarg));
    if (!valorSalvo) return getEstruturaPadrao();

    const parseado = JSON.parse(valorSalvo);
    if (parseado && typeof parseado === "object" && Array.isArray(parseado.skids)) {
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
    localStorage.setItem(getStorageKey(codCarg), JSON.stringify(conteudo, null, 2));
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

async function baixarArquivo(conteudo, codCarg, sufixo = "") {
  const carga = limparNomeArquivo(codCarg);
  const sufixoLimpo = sufixo ? `-${limparNomeArquivo(sufixo)}` : "";
  const nome = `conciliacao-rfid-${carga}${sufixoLimpo}.json`;
  const path = `ConciliacaoRFID/${nome}`;

  // 1) Capacitor (APK)
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Filesystem.checkPermissions();
      if (perm.publicStorage !== "granted") {
        await Filesystem.requestPermissions();
      }
    } catch (_) { }

    const destinos = [Directory.Documents, Directory.External];
    let ultimoErro;

    for (const directory of destinos) {
      try {
        const res = await Filesystem.writeFile({
          path,
          data: conteudo,
          directory,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        console.log("Arquivo salvo em:", res.uri);
        return nome;
      } catch (e) {
        console.warn(`Falha ao salvar em ${directory}:`, e);
        ultimoErro = e;
      }
    }
    throw new Error(
      `Não foi possível salvar o arquivo no coletor: ${ultimoErro?.message ?? ultimoErro}`
    );
  }

  // 2) Ponte Kotlin
  if (window.AndroidBridge?.salvarArquivo) {
    const ok = window.AndroidBridge.salvarArquivo(nome, conteudo);
    if (ok === false || ok === "false") {
      throw new Error("Falha ao salvar o arquivo no coletor.");
    }
    return nome;
  }

  const blob = new Blob([conteudo], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return nome;
}

function ultimoSkid(estrutura, qrCodeNormalizado) {
  for (let i = estrutura.skids.length - 1; i >= 0; i--) {
    if (normalizar(estrutura.skids[i].qrCode) === qrCodeNormalizado) {
      return estrutura.skids[i];
    }
  }
  return null;
}

export async function registrarSkidLabel(codCarg, qrCode, rfid = "", opcoes = {}) {
  const qrCodeLimpo = String(qrCode || "").trim();
  const rfidLimpo = String(rfid || "").trim();

  if (!qrCodeLimpo && !rfidLimpo) {
    return null;
  }

  const estrutura = lerLeiturasSalvas(codCarg);
  const qrCodeNormalizado = normalizar(qrCodeLimpo);

  let skid = qrCodeLimpo ? ultimoSkid(estrutura, qrCodeNormalizado) : null;

  if (!skid || skid.parts.length > 0) {
    skid = { qrCode: qrCodeLimpo, rfid: rfidLimpo, parts: [] };
    estrutura.skids.push(skid);
  } else {
    if (qrCodeLimpo) skid.qrCode = qrCodeLimpo;
    if (rfidLimpo) skid.rfid = rfidLimpo;
  }

  salvarLeituras(codCarg, estrutura);

  if (opcoes.baixar === true) {
    return baixarArquivo(JSON.stringify(estrutura, null, 2), codCarg);
  }
  return null;
}

export async function jsonToyota(
  codCarg,
  tagRfidPalete,
  skidLabel,
  tagRfidCaixa,
  partLabel = "",
  opcoes = {}
) {
  const rfidPalete = String(tagRfidPalete || "").trim();
  const qrCodeSkid = String(skidLabel || "").trim();
  const rfidCaixa = String(tagRfidCaixa || "").trim();
  const qrCodePart = String(partLabel || "").trim();

  if (!qrCodeSkid && !rfidPalete) {
    throw new Error("Skid do palete não informado para gravar a leitura.");
  }
  if (!rfidCaixa && !qrCodePart) {
    throw new Error("Nenhum dado da caixa (RFID/etiqueta) para gravar a leitura.");
  }

  const estrutura = lerLeiturasSalvas(codCarg);

  let skid = qrCodeSkid
    ? ultimoSkid(estrutura, normalizar(qrCodeSkid))
    : estrutura.skids[estrutura.skids.length - 1];

  if (!skid) {
    skid = { qrCode: qrCodeSkid, rfid: rfidPalete, parts: [] };
    estrutura.skids.push(skid);
  }

  if (!Array.isArray(skid.parts)) skid.parts = [];

  const part = {};
  if (qrCodePart) part.qrCode = qrCodePart;
  if (rfidCaixa) part.rfid = rfidCaixa;
  skid.parts.push(part);

  if (qrCodeSkid) skid.qrCode = qrCodeSkid;
  if (rfidPalete) skid.rfid = rfidPalete;

  salvarLeituras(codCarg, estrutura);

  if (opcoes.baixar === true) {
    return baixarArquivo(JSON.stringify(estrutura, null, 2), codCarg);
  }
  return null;
}

export function registrarRfidSkid(codCarg, skidLabel, rfid) {
  const qrCodeSkid = String(skidLabel || "").trim();
  const rfidLimpo = String(rfid || "").trim();

  if (!qrCodeSkid) return null;

  const estrutura = lerLeiturasSalvas(codCarg);
  const skid = ultimoSkid(estrutura, normalizar(qrCodeSkid));

  if (!skid) {
    throw new Error(`Nenhum SKID encontrado para o QR Code ${qrCodeSkid}.`);
  }

  skid.rfid = rfidLimpo;
  salvarLeituras(codCarg, estrutura);

  return baixarArquivo(JSON.stringify(estrutura, null, 2), codCarg);
}

export function exportarPaleteToyota(codCarg, skidLabel) {
  const estrutura = lerLeiturasSalvas(codCarg);
  const skidNormalizado = normalizar(skidLabel);

  const skids = estrutura.skids.filter(
    (skid) => normalizar(skid.qrCode) === skidNormalizado
  );

  if (skids.length === 0) {
    throw new Error(
      `Nenhuma leitura encontrada para o SKID ${skidLabel} na carga ${codCarg}.`
    );
  }

  return baixarArquivo(JSON.stringify({ skids }, null, 2), codCarg);
}

export function exportarToyota(codCarg, opcoes = {}) {
  if (!codCarg) throw new Error("Código da carga não informado.");

  const estrutura = lerLeiturasSalvas(codCarg);

  if (!estrutura.skids.length) {
    throw new Error(`Nenhuma leitura encontrada para a carga ${codCarg}.`);
  }

  return baixarArquivo(JSON.stringify(estrutura, null, 2), codCarg, opcoes.sufixo);
}

export function limparLeiturasToyota(codCarg) {
  localStorage.removeItem(getStorageKey(codCarg));
}

export function ultimoSkidRegistrado(codCarg) {
  const estrutura = lerLeiturasSalvas(codCarg);
  const skid = estrutura.skids[estrutura.skids.length - 1];
  if (!skid || (!skid.qrCode && !skid.rfid)) return null;

  return { skidLabel: skid.qrCode || "", rfid: skid.rfid || "" };
}