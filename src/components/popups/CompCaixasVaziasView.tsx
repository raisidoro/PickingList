import Modal from "react-modal";
import { useState, useEffect } from "react";
import { apiPallets, apiVzias } from "../../lib/axios";
import { useLocation } from "react-router-dom";

Modal.setAppElement("#root");

interface CaixasVaziasViewProps {
  palletIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export interface Carga {
  cod_carg: string;
  cod_cli: string;
  nome_cli: string;
  data_col: string;
  hora_col: string;
  qtd_pale: string;
  stat_col: string;
}

interface PalletApi {
  cod_palete: string;
  num_order: string;
  cod_doca: string;
  sup_doc: string;
  cod_grupo: string;
  cod_lane: string;
  stat_pale: string;
}

interface Pallet {
  cod_palete: string;
  stat_pale: string;
  cod_lane: string;
  cod_grupo: string;
  num_order: string;
}

interface VaziaItem {
  cod_emb: string;
  qtd_total: number;
  status: string;
  qtd_restante: number;
}

export default function CaixasVaziasView({
  palletIndex,
  isOpen,
  onClose,
}: CaixasVaziasViewProps) {
  const location = useLocation();
  const carga = location.state?.carga as Carga | undefined;

  const [pallets, setPallets] = useState<Pallet[]>([]);
  const palletIndexFinal = palletIndex ?? 0;
  const palletAtual = pallets.length > 0 ? pallets[palletIndexFinal] : undefined;

  const [vaziasItens, setVaziasItens] = useState<VaziaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega paletes e caixas vazias
  useEffect(() => {
    if (!isOpen || !carga) return;

    const init = async () => {
      try {
        setLoading(true);
        setErro(null);

        const respPallets = await apiPallets.get("/PICK_PALETE", {
          params: { cCarga: carga.cod_carg },
        });

        const palletsApi: PalletApi[] = Array.isArray(respPallets.data?.paletes)
          ? respPallets.data.paletes
          : [];

        if (palletsApi.length === 0) {
          setErro("Nenhum palete encontrado.");
          return;
        }

        const mapped = palletsApi.map((p) => ({
          cod_palete: p.cod_palete,
          stat_pale: p.stat_pale,
          cod_lane: p.cod_lane,
          cod_grupo: p.cod_grupo,
          num_order: p.num_order,
        }));
        setPallets(mapped);

        const palletAtualLocal = palletsApi[palletIndexFinal];
        if (palletAtualLocal) {
          await carregarVaziasItens(carga.cod_carg, palletAtualLocal.cod_palete);
        }
      } catch (e) {
        setErro("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isOpen, carga, palletIndexFinal]);

  // Recarrega vazias quando palletAtual mudar
  useEffect(() => {
    if (!isOpen || !palletAtual || !carga) return;

    carregarVaziasItens(carga.cod_carg, palletAtual.cod_palete);
  }, [isOpen, palletAtual?.cod_palete, carga]);

  const carregarVaziasItens = async (codCarga: string, codPalete: string) => {
    try {
      setLoading(true);
      const response = await apiVzias.get("/PICK_VZIA", {
        params: { cCarga: codCarga, cPalet: codPalete },
      });

      if (response.data?.error && response.data.error.includes("Registro(s) não encontrado(s)")) {
        setVaziasItens([]);
        return;
      }

      const itensVazios: VaziaItem[] = Array.isArray(response.data?.itens)
        ? response.data.itens.map((item: any) => ({
            cod_emb: item.cod_emb ?? "-",
            qtd_total: Number(item.qtd_total ?? "0"),
            status: String(item.status ?? "0"),
            qtd_restante: Number(item.qtd_restante ?? "0"),
          }))
        : [];

      setVaziasItens(itensVazios);
    } catch (error) {
      setErro("Erro ao carregar caixas vazias.");
    } finally {
      setLoading(false);
    }
  };

  function getStatusColor(status: string | undefined) {
    switch (status) {
      case "0":
        return "bg-gray-100 border-gray-300 text-black";
      case "1":
        return "bg-orange-200 border-orange-400 text-black";
      case "3":
        return "bg-green-200 border-green-400 text-black";
      default:
        return "bg-gray-100 border-gray-300 text-black";
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      contentLabel="Caixas Vazias"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">
          Pré-visualização de caixas vazias
        </h2>

        {carga && palletAtual && (
          <p className="text-xs text-gray-600 text-center">
            Carga {carga.cod_carg} · Palete {palletAtual.cod_palete}
            <br />
            Cliente {carga.nome_cli} - Data {carga.data_col} · Hora {carga.hora_col}
          </p>
        )}

        {loading && (
          <p className="text-gray-700 text-center text-sm">
            Carregando caixas vazias...
          </p>
        )}

        {!loading && vaziasItens.length === 0 && !erro && (
          <p className="text-gray-700 text-center text-sm">
            Nenhuma caixa vazia encontrada para este palete.
          </p>
        )}

        {erro && (
          <p className="text-red-600 text-center text-sm">{erro}</p>
        )}

        {!loading && vaziasItens.length > 0 && (
          <div className="w-full max-w-xs mx-auto">
            <p className="text-center text-gray-700 font-semibold text-xs mb-2">
              Embalagem | Total | Lidas
            </p>
            <div className="flex flex-col items-center gap-1.5">
              {vaziasItens.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-center h-11 ${getStatusColor(
                    item.status
                  )} rounded-full px-3 py-2.5`}
                >
                  <p className="text-lg font-bold text-blue-600 min-w-[65px] text-center">
                    {item.cod_emb}
                  </p>
                  <p className="text-lg font-bold text-blue-600 min-w-[25px] text-center mx-1">
                    {item.qtd_total}
                  </p>
                  <p className="text-lg font-bold text-blue-600 min-w-[25px] text-center mx-1">
                    {item.qtd_total - item.qtd_restante}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}
