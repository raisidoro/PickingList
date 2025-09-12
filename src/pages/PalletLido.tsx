import React, { useEffect, useState } from 'react';
import { apiItens, apiPallets } from '../lib/axios';
import { SlArrowLeftCircle } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from 'react';

const kanbanLaura = 1;

export default function PalletLido(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  // Estados
  const [pallets, setPallets] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const kanbanGdbr = kanbanLaura;

  // Aqui imagino que a "carga" venha via location.state
  const carga = location.state?.carga;

  useEffect(() => {
    if (!carga?.cod_carg) {
      setErro("Carga não encontrada.");
      setLoading(false);
      return;
    }

    // Buscar pallets
    apiPallets
      .get("/PICK_PALETE", { params: { cCarga: carga.cod_carg } })
      .then((resp) => {
        const palletsApi: any[] = Array.isArray(resp.data?.paletes)
          ? resp.data.paletes
          : [];

        if (palletsApi.length === 0) {
          setErro("Nenhum pallet encontrado.");
          setPallets([]);
          setLoading(false);
          return;
        }

        // Buscar itens de cada pallet
        return Promise.all(
          palletsApi
            .filter((p) => !!p.cod_palete)
            .map((p) =>
              apiItens
                .get("", {
                  params: { cCarga: carga.cod_carg, cPalet: p.cod_palete },
                })
                .then((respItens) => ({
                  cod_palete: p.cod_palete,
                  stat_pale: p.stat_pale,
                  itens: Array.isArray(respItens.data?.itens)
                    ? respItens.data.itens.map((it: any) => ({
                      kanban: it.kanban ?? it.Kanban ?? "-",
                    }))
                    : [],
                }))
            )
        );
      })
      .then((palletsDetalhados) => {
        if (!palletsDetalhados) return;

        setPallets(palletsDetalhados);
        setLoading(false);

        // Array com todos os kanbans
        const todosKanbans = palletsDetalhados.flatMap((pallet) =>
          pallet.itens.map((item) => item.kanban)
        );
        console.log("Todos os kanbans:", todosKanbans);

        if (todosKanbans.includes(String(kanbanGdbr))) {
          alert("Kanban encontrado com sucesso!");
        } else {
          alert("Kanban não encontrado!");
        }
      })
      .catch((err) => {
        console.error(err);
        setErro("Erro ao buscar pallets.");
        setLoading(false);
      });
  }, [carga, kanbanGdbr]);
}