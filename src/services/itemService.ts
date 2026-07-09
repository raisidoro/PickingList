import { apiItens } from "../lib/axios";

export async function buscarItens(cCarga: string, cPalet: string) {
  const resp = await apiItens.get("", { params: { cCarga, cPalet } });
  return Array.isArray(resp.data?.itens) ? resp.data.itens : [];
}

export async function lerCaixa(params: { codCarg: string; codPale: string; codKanb: string; codSequ: string | number; qtdrest: number; }) {
  const resp = await apiItens.post("", { ...params, operac: "1" });
  return resp.data;
}

export async function finalizarItemApi(params: { codCarg: string; codPale: string; codKanb: string; codSequ: string | number; qtdrest: number; }) {
  const resp = await apiItens.post("", { ...params, operac: "3" });
  return resp.data;
}