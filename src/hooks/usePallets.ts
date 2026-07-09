import { useEffect, useState } from "react";
import { apiItens, apiPallets } from "../lib/axios";
import type { Carga } from "../types/carga.ts";
import type { Pallet, PalletItem, PalletApi } from "../types/pallet.ts";

export function usePallets(carga: Carga | undefined) {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [palletIndex, setPalletIndex] = useState(0);

  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const totalPallets = pallets.length;

  // Busca e monta a lista de paletes detalhados
  async function refreshPallets(): Promise<Pallet[] | undefined> {
    if (!carga) return undefined;

    setLoading(true);
    setErro(null);

    try {
      const resp = await apiPallets.get("/PICK_PALETE", { params: { cCarga: carga.cod_carg } });

      const palletsApi: PalletApi[] = Array.isArray(resp.data?.paletes)
        ? resp.data.paletes
        : [];

      if (palletsApi.length === 0) {
        setErro("Nenhum palete encontrado.");
        setPallets([]);
        return [];
      }

      const palletsDetalhados = await Promise.all(
        palletsApi
          .filter((p) => !!p.cod_palete)
          .map((p) =>
            apiItens
              .get("", { params: { cCarga: carga.cod_carg, cPalet: p.cod_palete } })
              .then((respItens) => ({
                cod_palete: p.cod_palete,
                stat_pale: p.stat_pale,
                cod_lane: p.cod_lane,
                num_order: p.num_order,
                cod_grupo: p.cod_grupo,
                itens: Array.isArray(respItens.data?.itens)
                  ? respItens.data.itens.map((it: any) => ({
                    kanban: it.kanban ?? it.Kanban ?? "-",
                    sequen: it.sequen ?? it.Sequen ?? "-",
                    qtd_caixa: it.qtd_caixa ?? it.Qtd_Caixa ?? "-",
                    qtd_peca: it.qtd_peca ?? it.Qtd_Peca ?? "-",
                    embalagem: it.embalagem ?? it.Embalagem ?? "-",
                    multiplo: it.multiplo ?? it.Multiplo ?? "-",
                    status: it.status ?? it.Status ?? "-",
                    qtd_contada: it.qtd_contada ?? it.qtd_con ?? "-",
                  }))
                  : [],
              }))
          )
      );

      setPallets(palletsDetalhados);
      return palletsDetalhados;
    } catch {
      setErro("Erro ao carregar paletes.");
      setPallets([]);
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  // Carrega ao montar / trocar de carga
  useEffect(() => {
    refreshPallets();
  }, [carga]);

  // Ajusta o índice do pallet se necessário ao mudar a lista de pallets
  useEffect(() => {
    if (palletIndex > pallets.length - 1) {
      setPalletIndex(Math.max(0, pallets.length - 1));
    }
  }, [pallets, palletIndex]);

  // Ordem de visualização dos itens do palete atual
  const sortedItems: PalletItem[] = palletAtual
    ? (() => {
      const temSequencial = (it: PalletItem) => {
        const n = Number(it.sequen);
        return Number.isFinite(n) && n > 0;
      };

      return [...palletAtual.itens].sort((a, b) => {
        if (a.status === "3" && b.status !== "3") return 1;
        if (a.status !== "3" && b.status === "3") return -1;

        const aHas = temSequencial(a);
        const bHas = temSequencial(b);

        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) return Number(a.sequen) - Number(b.sequen);

        return 0;
      });
    })()
    : [];

  return {
    pallets,
    setPallets,
    loading,
    setLoading,
    erro,
    setErro,
    palletIndex,
    setPalletIndex,
    palletAtual,
    totalPallets,
    refreshPallets,
    sortedItems,
  };
}