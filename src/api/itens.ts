import { api } from '../lib/axios'; 

export interface ItensGetResponse {
    cCarga: string; // enviar
    cPalete: string; // enviar
    kanban: string; 
    sequencia: string; 
    qtd_caixa: string;
    qtd_peca: string;
    embalagem: string;
    multiplo: string;
    status: string;

}

export interface ItensPostBody {
    
}

export async function getItens() {
    const response = await api.get<ItensGetResponse[]>('/PICK_ITENS');
    return response.data;
}
