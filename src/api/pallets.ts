import { apiPallets } from '../lib/axios';

export interface PalletsGetResponse{
    cod_palete: string;
    num_order: string;
    cod_doca: string;
    sup_doc: string;
    cod_grupo: string;
    cod_lane: string;
    stat_pale: string;
}

export interface PalletsPostBody{
    codCarg: string;
    codPale: string;
    status: string;
}

export async function getPallets() {
    const response = await apiPallets.get<PalletsGetResponse[]>('/PICK_PALETE');
    return response.data;
}