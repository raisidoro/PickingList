import React, { useEffect, useState } from "react";
import { apiItens, apiPallets } from "../lib/axios";
import { MdArrowBack } from "react-icons/md";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { TfiReload } from "react-icons/tfi";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from "react";
import ErrorPopup from '../components/CompErrorPopup.tsx';

const textVariants = {
  default: "text-xl sm:text-2xl",
  muted: "text-xl sm:text-2xl text-gray-500",
  heading: "text-xl sm:text-2xl",
  blast: "text-2xl sm:text-3xl",
  title: "text-3xl sm:text-4xl",
} as const;

type Variant = keyof typeof textVariants;

type TextProps = {
  as?: keyof JSX.IntrinsicElements;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
};

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

interface PalletItem {
  kanban: string;
  sequen: string;
  qtd_caixa: string;
  qtd_peca: string;
  embalagem: string;
  multiplo: string;
  status: string;
}

interface Pallet {
  cod_palete: string;
  stat_pale: string;
  itens: PalletItem[];
  cod_lane: string;
  cod_grupo: string;
  num_order: string;
}

function Text({
  as = "span",
  variant = "default",
  className = "",
  children,
  ...props
}: TextProps) {
  const Component = as;
  return React.createElement(
    Component,
    {
      className: `${textVariants[variant]} ${className}`,
      ...props,
    },
    children
  );
}

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-gray-100 shadow-md rounded-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default function PalletViewSingle() {
  const navigate = useNavigate();
  const location = useLocation();
  const carga = location.state?.carga as Carga | undefined;
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [palletIndex, setPalletIndex] = useState(0);
  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const totalPallets = pallets.length;

  // ordem de visualização dos itens 
  const sortedItems = palletAtual
    ? (() => {
        const temSequencial = (it: PalletItem) => {
          const n = Number(it.sequen);
          return Number.isFinite(n) && n > 0;
        };

        return [...palletAtual.itens].sort((a, b) => {
          // finalizados por último
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

  // Ajusta o índice do pallet se necessário ao mudar a lista de pallets
  useEffect(() => {
    if (palletIndex > pallets.length - 1) {
      setPalletIndex(Math.max(0, pallets.length - 1));
    }
  }, [pallets, palletIndex]);

  if (!carga) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-gray-200 to-gray-300">
        <span className="text-red-600 text-lg">Carga não informada!</span>
      </main>
    );
  }

  // Carrega os paletes da API de acordo com a carga
  useEffect(() => {
    setLoading(true);
    setErro(null);

    apiPallets
      .get("/PICK_PALETE", { params: { cCarga: carga.cod_carg } })
      .then((resp) => {
        const palletsApi: PalletApi[] = Array.isArray(resp.data?.paletes)
          ? resp.data.paletes
          : [];
        if (palletsApi.length === 0) {
          setErro("Nenhum palete encontrado.");
          setPallets([]);
          setLoading(false);
          return;
        }
        Promise.all(
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
                      }))
                    : [],
                }))
            )
        )
          .then((palletsDetalhados) => {
            setPallets(palletsDetalhados);
          })
          .catch(() => {
            setErro("Erro ao buscar itens dos paletes.");
          })
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setErro("Erro ao carregar paletes.");
        setPallets([]);
        setLoading(false);
      });
  }, [carga]);

  //Função para definir a cor da borda 
  function getStatusColor(status: string) {
    switch (status) {
      case "0":
        return "bg-gray-100 border-gray-300 text-black";
      case "1":
        return "bg-orange-200 border-orange-400 text-black";
      case "3":
        return "bg-green-200 border-green-400 text-black";
    }
  }

  return (
    <main
      className="
      fixed inset-0 flex items-center justify-center
      bg-gradient-to-b from-gray-200 to-gray-300
      p-0 sm:p-4
      "
    >
      <Card
        className="
        w-full h-full max-w-full max-h-full flex flex-col items-center justify-start
        p-0 shadow-lg bg-white rounded-none
        sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] overflow-hidden
        "
      >
        <div className="w-full flex flex-col gap-4 h-full p-3 sm:gap-6 sm:p-6 overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => navigate("/Carga")}
              className="focus:outline-none"
              title="Voltar"
            >
              <MdArrowBack className="text-gray-500 w-6 h-6" />
            </button>
            <Text
              as="span"
              variant="muted"
              className="text-sm sm:text-base text-gray-900 truncate"
            >
              <b>Carga:</b> {carga.cod_carg} – {carga.nome_cli} |{" "}
              {carga.data_col} – {carga.hora_col}
            </Text>
          </div>

          <div className="flex justify-between items-center px-4">
            <span onClick={() => window.location.reload()}>
              <TfiReload className="text-gray-500 w-6 h-6 cursor-pointer" />
            </span>
          </div>

          {loading && (
            <Text className="text-center text-gray-600">
              Carregando paletes...
            </Text>
          )}

          {erro && (
            <ErrorPopup
              message={erro}
              onClose={() => setErro(null)}
            />
          )}

          {!loading && !erro && palletAtual && (
            <>
              <div className="flex items-center justify-center">
                <span className="text-blue-800 text-sm"> MODO DE VISUALIZAÇÃO </span>
              </div>
              <div className="max-w-lg w-full flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setPalletIndex(i => Math.max(i - 1, 0));
                  }}
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0 disabled:opacity-50"
                  disabled={palletIndex === 0}
                  title="Palete Anterior"
                >
                  <GoChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="flex flex-col gap-2">
                  <div className="text-xl">
                    <strong>Lane: </strong> {palletAtual.cod_lane} | <strong>Group: </strong> {palletAtual.cod_grupo}
                  </div>
                  <div className="text-xl">
                    <strong>Order: </strong> {palletAtual.num_order}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPalletIndex(i => Math.min(i + 1, totalPallets - 1));
                  }}
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0 disabled:opacity-50"
                  disabled={palletIndex === totalPallets - 1}
                  title="Próximo Palete"
                >
                  <GoChevronRight className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="max-w-lg w-full">
                <div className="text-base font-bold text-center mb-2">
                  Palete{" "}
                  {palletAtual?.cod_palete ??
                    String(palletIndex + 1).padStart(2, "0")}/{totalPallets.toString().padStart(2, "0")}
                </div>
                <div className="text-center font-bold text-lg mt-2 select-none">
                  {palletAtual.stat_pale === "0" && (
                    <span className="text-red-700">Pendente</span>
                  )}
                  {palletAtual.stat_pale === "1" && (
                    <span className="text-orange-700">Em montagem</span>
                  )}
                  {palletAtual.stat_pale === "2" && (
                    <span className="text-orange-700">
                      Finalizado com divergência
                    </span>
                  )}
                  {palletAtual.stat_pale === "3" && (
                    <span className="text-green-700">Finalizado</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {sortedItems.map((item, idx) => (
                    <Card
                      key={idx}
                      className={`p-2 rounded-xl ${getStatusColor(item.status)} shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Seq</span>
                        <span className="text-xs">
                          {item.sequen === "0" ? "-" : item.sequen}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Kanban</span>
                        <span
                          className="text-xs truncate max-w-[90px]"
                          title={item.kanban}
                        >
                          {item.kanban}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Cxs</span>
                        <span className="text-xs">{item.qtd_caixa}</span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Peças</span>
                        <span className="text-xs">{item.qtd_peca}</span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Embal.</span>
                        <span
                          className="text-xs truncate max-w-[80px]"
                          title={item.embalagem}
                        >
                          {item.embalagem}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Múltiplo</span>
                        <span className="text-xs">{item.multiplo}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-semibold text-xs">Status</span>
                        <span
                          className={`font-bold text-xs ${
                            item.status === "0"
                              ? "text-red-700"
                              : item.status === "1"
                              ? "text-yellow-700"
                              : item.status === "2"
                              ? "text-orange-700"
                              : item.status === "3"
                              ? "text-green-700"
                              : ""
                          }`}
                        >
                          {item.status === "0" && "Pendente"}
                          {item.status === "1" && "Em montagem"}
                          {item.status === "2" && "Divergência"}
                          {item.status === "3" && "Finalizado"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
