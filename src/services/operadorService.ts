import { apiOperadores } from "../lib/axios";

export async function autenticarOperador(cMat: string, cPass: string) {
  const resp = await apiOperadores.get("", { params: { cNfc: "-", cMat, cPass } });
  return resp.data;
}