import { apiVzias } from '../lib/axios';

export interface CaixasGetResponse {
  embalagem: string;
  quantidade: number;
}

export interface CaixasPostBody {
  cCarga: string;   
  cPalet: string;
}

export async function getCaixas() {
  const response = await apiVzias.get<CaixasGetResponse[]>('/PICK_VZIA');
  return response.data;
}

export async function updateCargaStatus(body: CaixasPostBody) {
  const response = await apiVzias.post('/PICK_VZIA', body);
  return response.data; 
}