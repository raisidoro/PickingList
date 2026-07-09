import { apiCarga } from "../lib/axios";
import type { Carga } from "../types/carga";

export async function buscarCargas(): Promise<Carga[]> {
  const resp = await apiCarga.get("");
  return resp.data?.cargas ?? [];
}

export async function iniciarCarga(codCarg: string) {
  const resp = await apiCarga.post("", { codCarg, status: "1" });
  return resp.data;
}

export async function finalizarCarga(codCarg: string) {
  const resp = await apiCarga.post("", { codCarg, status: "3" });
  return resp.data;
}