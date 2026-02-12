import Modal from "react-modal";
import { useEffect, useMemo, useState } from "react";
import { apiPallets, apiVzias } from "../lib/axios";

Modal.setAppElement("#root");

export interface Carga {
  cod_carg: string;
  cod_cli: string;
  nome_cli: string;
  data_col: string;
  hora_col: string;
  qtd_pale: string;
  stat_col: string;
}

interface CompCaixasVaziasCargaProps {
  isOpen: boolean;
  onClose: () => void;
  carga: Carga;
}

interface PalletApi {
  cod_palete: string;
  stat_pale: string;
}

interface VaziaItem {
  cod_emb: string;
  qtd_total: number;
  qtd_restante: number;
  status: string; // "0" pendente, "1" em progresso, "3" finalizado
}

type Aggregado = {
  cod_emb: string;
  total: number;
  lidas: number;
  restante: number;
};

export default function CompCaixasVaziasCarga({
  isOpen,
  onClose,
  carga,
}: CompCaixasVaziasCargaProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<{ cod_palete: string; itens: VaziaItem[] }[]>([]);

  // Carrega todos os paletes da carga e, para cada um, carrega suas vazias
  useEffect(() => {
    if (!isOpen || !carga?.cod_carg) return;

    (async () => {
      try {
        setLoading(true);
        setErro(null);

        // 1) Paletes da carga
        const respPallets = await apiPallets.get("/PICK_PALETE", {
          params: { cCarga: carga.cod_carg },
        });

        const paletesApi: PalletApi[] = Array.isArray(respPallets.data?.paletes)
          ? respPallets.data.paletes.map((p: any) => ({
              cod_palete: String(p.cod_palete ?? ""),
              stat_pale: String(p.stat_pale ?? "0"),
            }))
          : [];

        if (paletesApi.length === 0) {
          setDetalhe([]);
          setErro("Nenhum palete encontrado para esta carga.");
          return;
        }

        // 2) Vazias por palete (paralelo)
        const results = await Promise.allSettled(
          paletesApi.map(async (p) => {
            const r = await apiVzias.get("/PICK_VZIA", {
              params: { cCarga: carga.cod_carg, cPalet: p.cod_palete },
            });

            if (r.data?.error && String(r.data.error).includes("Registro(s) não encontrado(s)")) {
              return { cod_palete: p.cod_palete, itens: [] as VaziaItem[] };
            }

            const itens: VaziaItem[] = Array.isArray(r.data?.itens)
              ? r.data.itens.map((it: any) => ({
                  cod_emb: String(it.cod_emb ?? "-"),
                  qtd_total: Number(it.qtd_total ?? 0),
                  qtd_restante: Number(it.qtd_restante ?? 0),
                  status: String(it.status ?? "0"),
                }))
              : [];

            return { cod_palete: p.cod_palete, itens };
          })
        );

        const detalheOk = results.map((res, i) => {
          if (res.status === "fulfilled") return res.value;
          console.error("Erro ao buscar vazias do palete:", paletesApi[i]?.cod_palete, res.reason);
          return { cod_palete: paletesApi[i]?.cod_palete ?? `PAL-${i}`, itens: [] as VaziaItem[] };
        });

        setDetalhe(detalheOk);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar caixas vazias da carga.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, carga?.cod_carg]);

  // Agregação por embalagem (somatório em toda a carga)
  const agregados: Aggregado[] = useMemo(() => {
    const map = new Map<string, Aggregado>();

    for (const pal of detalhe) {
      for (const it of pal.itens) {
        const lidas = Math.max(0, it.qtd_total - it.qtd_restante);
        const key = it.cod_emb;

        const ag = map.get(key) ?? {
          cod_emb: key,
          total: 0,
          lidas: 0,
          restante: 0,
        };

        ag.total += it.qtd_total;
        ag.lidas += lidas;
        ag.restante += it.qtd_restante;

        map.set(key, ag);
      }
    }

    const arr = Array.from(map.values());
    // Ordena por código de embalagem
    arr.sort((a, b) => a.cod_emb.localeCompare(b.cod_emb));
    return arr;
  }, [detalhe]);

  // KPIs (opcional)
  const kpis = useMemo(() => {
    const totalEmb = agregados.length;
    const totalQtd = agregados.reduce((s, a) => s + a.total, 0);
    const totalLidas = agregados.reduce((s, a) => s + a.lidas, 0);
    const totalRest = agregados.reduce((s, a) => s + a.restante, 0);
    return { totalEmb, totalQtd, totalLidas, totalRest };
  }, [agregados]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick
      shouldCloseOnEsc
      contentLabel="Caixas Vazias da Carga"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">
          Caixas vazias da carga
        </h2>

        <p className="text-xs text-gray-600 text-center">
          Carga {carga.cod_carg} · Cliente {carga.nome_cli}
          <br />
          Data {carga.data_col} · Hora {carga.hora_col}
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-600">Emb. distintas</div>
            <div className="text-base font-bold text-blue-700">{kpis.totalEmb}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-600">Qtde total</div>
            <div className="text-base font-bold text-blue-700">{kpis.totalQtd}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-600">Lidas</div>
            <div className="text-base font-bold text-blue-700">{kpis.totalLidas}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[10px] text-gray-600">Restantes</div>
            <div className="text-base font-bold text-blue-700">{kpis.totalRest}</div>
          </div>
        </div>

        {/* Corpo */}
        {loading && (
          <p className="text-gray-700 text-center text-sm">Carregando caixas vazias...</p>
        )}

        {!loading && erro && (
          <p className="text-red-600 text-center text-sm">{erro}</p>
        )}

        {!loading && !erro && agregados.length === 0 && (
          <p className="text-gray-700 text-center text-sm">
            Nenhuma caixa vazia encontrada para esta carga.
          </p>
        )}

        {!loading && !erro && agregados.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-[52vh] overflow-auto">
            <p className="text-center text-gray-700 font-semibold text-xs">
              Embalagem | Total | Lidas | Restante
            </p>
            {agregados.map((a) => (
              <div
                key={a.cod_emb}
                className="flex items-center justify-between h-11 rounded-full px-3 py-2.5 border bg-gray-50 border-gray-200"
              >
                <p className="text-sm font-bold text-blue-600 w-[80px] text-center truncate" title={a.cod_emb}>
                  {a.cod_emb}
                </p>
                <p className="text-sm font-bold text-blue-600 w-[40px] text-center">{a.total}</p>
                <p className="text-sm font-bold text-blue-600 w-[40px] text-center">{a.lidas}</p>
                <p className="text-sm font-bold text-blue-600 w-[56px] text-center">{a.restante}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 block mx-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}