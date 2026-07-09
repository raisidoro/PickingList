import { apiPallets } from "../lib/axios";
import type { PalletApi } from "../types/pallet";

export async function buscarPaletesPorCarga(codCarg: string): Promise<PalletApi[]> {
  const resp = await apiPallets.get("/PICK_PALETE", { params: { cCarga: codCarg } });
  return Array.isArray(resp.data?.paletes) ? resp.data.paletes : [];
}

export async function atualizarStatusPaleteApi(codCarg: string, codPale: string, status: string) {
  const resp = await apiPallets.post("", { codCarg, codPale, status });
  return resp.data;
}