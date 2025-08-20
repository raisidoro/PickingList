import { apiCarga } from '../lib/axios';

export interface CargaGetResponse {
  cod_carg: string;  
  cod_cli: string;
  nome_cli: string;
  data_col: string;
  hora_col: string;
  qtd_pale: string;
  stat_col: string;
}

export interface CargaPostBody {
  codCarg: string;   
  status: string;
}

export async function getCargas() {
  const response = await apiCarga.get<{ cargas: CargaGetResponse[] }>('/PICK_CARGA');
  return response.data.cargas;
}

export async function updateCargaStatus(body: CargaPostBody) {
  const response = await apiCarga.post('/', body);
  return response.data; 
}
