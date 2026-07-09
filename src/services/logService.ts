import { apiLog } from "../lib/axios";

export async function atualizarOp(
    params: {
    codCarga: string; 
    codPale: string; 
    codItem: string; 
    cOperac: string;
    cData: string; 
    cHora: string; 
    cUser: string; 
    cLeit1: string;
    cLeit2: string; 
    cStatus: string; 
    Histor: string;
}) {
  const resp = await apiLog.post("", {
    codCarg: params.codCarga,
    codPale: params.codPale,
    codItem: params.codItem,
    cOperac: params.cOperac,
    cData: params.cData,
    cHora: params.cHora,
    cUser: params.cUser,
    cLeit1: params.cLeit1,
    cLeit2: params.cLeit2,
    cStatus: params.cStatus,
  });
  return resp.data;
}