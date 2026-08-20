export function isHttpSuccess(status?: number): boolean {
  return typeof status === "number" && status >= 200 && status < 300;
}

export function isSuccessfulApiPayload(data: unknown): boolean {
  if (typeof data !== "string") return false;

  const normalized = data.trim();

  return normalized === "Gravado com sucesso"
    || normalized === "Gravado com sucessoGravado com sucesso"
    || normalized === "Kanban finalizado"
    || normalized.includes("Gravado com sucesso")
    || normalized.includes("Kanban finalizado");
}

export function isSuccessfulResponse(data: unknown, status?: number): boolean {
  if (isSuccessfulApiPayload(data)) return true;

  if (isHttpSuccess(status) && !(typeof data === "object" && data && "Erro" in data)) {
    return true;
  }

  return false;
}
