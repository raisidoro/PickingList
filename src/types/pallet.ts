export interface PalletApi {
  cod_palete: string;
  num_order: string;
  cod_doca: string;
  sup_doc: string;
  cod_grupo: string;
  cod_lane: string;
  stat_pale: string;
}

export interface PalletItem {
  lido?: boolean;
  kanban: string;
  sequen: number | string;
  qtd_caixa: number | string;
  qtd_peca: number | string;
  embalagem: string;
  multiplo: string;
  status: string;
  qtd_contada?: number | string;
}

export interface Pallet {
  cod_palete: string;
  stat_pale: string;
  itens: PalletItem[];
  cod_lane: string;
  cod_grupo: string;
  num_order: string;
}

export interface CaixasVazias {
  message: string | null;
  matricula?: string | null;
  onClose: (finalized?: boolean) => void;
  onRespond: (response: string) => void;
  palletIndex?: number;
}

export interface VaziaItem {
  cod_emb: string;
  qtd_total: number;
  status: string;
  qtd_restante: number;
}