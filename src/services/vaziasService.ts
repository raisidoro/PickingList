import { apiVzias } from "../lib/axios";

export async function buscarCaixasVazias(cCarga: string, cPalet: string) {
  const resp = await apiVzias.get("", { params: { cCarga, cPalet } });
  return Array.isArray(resp.data?.itens) ? resp.data.itens : [];
}

export function temCaixasVaziasPendentes(itens: any[]) {
  return itens.some((it) => String(it.status) !== "3");
}