import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
 
// ---------------------------------------------------------------------------
// Validação de variáveis de ambiente obrigatórias (falha rápido na subida)
// ---------------------------------------------------------------------------
const REQUIRED_ENV = ["SMTP_USER", "SMTP_PASS", "API_KEY"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Variável de ambiente ausente: ${key}`);
    process.exit(1);
  }
}
 
const {
  SMTP_HOST = "smtp.office365.com",
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  API_KEY,
  ALLOWED_ORIGINS = "",
  DEFAULT_RECIPIENT = "laura.andrela@gdbr-tg.com.br",
  PORT = "3000",
} = process.env;
 
const MAX_RECIPIENTS = 20;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB por anexo (base64)
 
const app = express();
 
// Necessário se o app rodar atrás de um reverse proxy (nginx, IIS, etc.)
app.set("trust proxy", 1);
 
app.use(helmet());
app.use(express.json({ limit: "15mb" }));
 
// CORS restrito apenas às origens permitidas (lista separada por vírgula no .env)
const allowedOrigins = ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
  })
);
 
// Rate limiting: no máximo 30 requisições por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
});
app.use("/enviar-email", limiter);
 
// ---------------------------------------------------------------------------
// Autenticação simples via API key (header: x-api-key)
// Para algo mais robusto, considere Azure AD App Registration + JWT.
// ---------------------------------------------------------------------------
function authenticate(req, res, next) {
  const key = req.get("x-api-key");
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
}
 
// ---------------------------------------------------------------------------
// Transporter SMTP
// - pool: true reaproveita conexões em vez de abrir uma nova a cada envio
// - TLS com validação de certificado habilitada (nunca desative em produção)
// - Removido o forçamento de SSLv3 (protocolo obsoleto/inseguro)
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: false, // STARTTLS na porta 587
  pool: true,
  maxConnections: 3,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
});
 
// Verifica a conexão SMTP já na subida do servidor, falhando cedo se algo
// estiver errado com as credenciais/host.
transporter.verify((err) => {
  if (err) {
    console.error("[FATAL] Falha ao conectar no SMTP:", err.message);
    process.exit(1);
  }
  console.log("[OK] Conexão SMTP verificada com sucesso.");
});
 
// ---------------------------------------------------------------------------
// Helpers de validação
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
// Remove quebras de linha para evitar header injection em campos de texto
// que vão para cabeçalhos de e-mail (subject, from, to).
function sanitizeHeaderField(value) {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}
 
function validateRecipients(recipients) {
  const list = Array.isArray(recipients) && recipients.length
    ? recipients
    : [DEFAULT_RECIPIENT];
 
  if (list.length > MAX_RECIPIENTS) {
    throw new Error(`Máximo de ${MAX_RECIPIENTS} destinatários por envio.`);
  }
 
  for (const addr of list) {
    if (typeof addr !== "string" || !EMAIL_REGEX.test(addr)) {
      throw new Error(`Endereço de e-mail inválido: ${addr}`);
    }
  }
 
  return list.map(sanitizeHeaderField);
}
 
function validateAttachments(attachments) {
  if (attachments === undefined) return undefined;
  if (!Array.isArray(attachments)) {
    throw new Error("attachments deve ser um array.");
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Máximo de ${MAX_ATTACHMENTS} anexos por envio.`);
  }
 
  return attachments.map((att, i) => {
    if (!att || typeof att.filename !== "string" || typeof att.content !== "string") {
      throw new Error(`Anexo inválido no índice ${i}: filename e content são obrigatórios.`);
    }
    // Tamanho aproximado do binário decodificado a partir do base64
    const approxBytes = (att.content.length * 3) / 4;
    if (approxBytes > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Anexo "${att.filename}" excede o limite de ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB.`);
    }
    return {
      filename: sanitizeHeaderField(att.filename),
      content: att.content,
      encoding: att.encoding || "base64",
      contentType: att.contentType || "application/octet-stream",
    };
  });
}
 
// ---------------------------------------------------------------------------
// Rota principal
// ---------------------------------------------------------------------------
app.post("/enviar-email", authenticate, async (req, res, next) => {
  try {
    const { subject, body, recipients, attachments } = req.body ?? {};
 
    const to = validateRecipients(recipients);
    const parsedAttachments = validateAttachments(attachments);
 
    const mailOptions = {
      from: SMTP_USER,
      to: to.join(", "),
      subject: sanitizeHeaderField(subject || "Leituras do dia"),
      text: typeof body === "string" ? body : "",
      attachments: parsedAttachments,
    };
 
    await transporter.sendMail(mailOptions);
 
    res.json({ status: "ok", message: "Email enviado", to });
  } catch (error) {
    next(error);
  }
});
 
// ---------------------------------------------------------------------------
// Middleware de erro centralizado
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error("[ERRO]", err.message);
 
  // Erros de validação (gerados por nós) retornam 400; o resto é 500
  const isValidationError = /obrigat|inválid|excede|Máximo/.test(err.message);
  res.status(isValidationError ? 400 : 500).json({
    error: isValidationError ? err.message : "Erro interno ao enviar email",
  });
});
 
app.listen(Number(PORT), () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});