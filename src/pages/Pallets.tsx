import React, { useEffect, useState } from "react";
import { apiItens, apiPallets } from "../lib/axios";
import { SlArrowLeftCircle } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from "react";
import ErrorPopup from './CompErrorPopup.tsx';


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
  lido: unknown;
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
          .catch(() => setErro("Erro ao buscar itens dos paletes."))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setErro("Erro ao carregar paletes.");
        setPallets([]);
        setLoading(false);
      });
  }, [carga]);

  //Validação se o item pertence ao pallet
  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const totalPallets = pallets.length;

  //Validação se a etiqueta do cliente confere o kanban GDBR
  const [kanbanGDBR, setKanbanGDBR] = useState("");
  var [etiquetaCliente] = useState("12345");

  //Validação se a quantia de caixas lidas é menor que a quantidade de caixas do pallet
   const [totalCaixas, setTotalCaixas] = useState(0);
   const [caixasLidas, setCaixasLidas] = useState(0);

  //Verifica se item pertence ao pallet
  function itemPallet() {
    if (!kanbanGDBR || pallets.length === 0) {
      setErro("Nenhum pallete ou Kanban informado.");
      return;
    }

    const kanbanGDBRNumerico = kanbanGDBR.split("|")[1] || "";

    //array com kanbans de cada pallet
    const todosKanbansPallet: { pallet: string; kanbans: string[] }[] =
      pallets.map((pallet) => {
        const kanbansPallet = pallet.itens.map((item) => item.kanban);
        return { pallet: pallet.cod_palete, kanbans: kanbansPallet };
      });

    console.log("Todos os kanbans dos paletes:", todosKanbansPallet);

    let encontrado = false;
    for (const p of todosKanbansPallet) {
      if (p.kanbans.includes(kanbanGDBRNumerico)) {
        console.log(
          ` Kanban ${kanbanGDBRNumerico} encontrado no palete ${p.pallet}`
        );
        const idx = pallets.findIndex((pl) => pl.cod_palete === p.pallet);
        if (idx >= 0) setPalletIndex(idx);
        encontrado = true;
        break;
      }
    }

    if (!encontrado) {
      setErro(` Kanban ${kanbanGDBR} não encontrado em nenhum palete.`);
    }
  }

  // verifica etiqueta cliente e kanban GDBR
  function handleKanbanGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKanbanGDBR(e.target.value);
  }

  function handleEtiquetaClienteChange(e: React.ChangeEvent<HTMLInputElement>) {
    etiquetaCliente = e.target.value;
  }

  function verificaKanban() {
    if (!kanbanGDBR || !etiquetaCliente) return;

    if (etiquetaCliente.length == 5) {
      if (kanbanGDBR.includes(etiquetaCliente)) {
        console.log(
          `Kanban GDBR ${kanbanGDBR} contém Etiqueta Cliente ${etiquetaCliente}`
        );
      } else {
        setErro(
          `Kanban GDBR ${kanbanGDBR} não contém Etiqueta Cliente ${etiquetaCliente}`
        );
      }
    }
  }

  //verifica quantidade de caixas lidas (quantidade de caixas lidas menor que a quantidade de caixas total do pallet)
   function Caixas() {
     if (!palletAtual) return;

     setTotalCaixas((item) =>
       palletAtual.itens.reduce(
         (acc, item) => acc + Number(item.qtd_caixa || 0),
         0
       )
     );
     setCaixasLidas(palletAtual.itens.filter((item) => item.lido).length);

     if (caixasLidas < totalCaixas) {
       setErro(
         `Caixas lidas: ${caixasLidas}/${totalCaixas} - Ainda faltam caixas para ler.`
       );
     } else {
       console.log(
         `Caixas lidas: ${caixasLidas}/${totalCaixas} - Todas as caixas foram lidas.`
       );
     }
   }

  //verifica se há palete
  // s não lidos completamente (com itens pendentes)
   function verificaPalete() {
    if (!palletAtual) return;

    const itensPendentes = palletAtual.itens.filter((item) => !item.lido);
    if (itensPendentes.length > 0) {
      console.log(`O Palete ${palletAtual.cod_palete} possui itens pendentes.`);
    } else {
      console.log(`O Palete ${palletAtual.cod_palete} está completo.`);
      setErro(`O Palete ${palletAtual.cod_palete} está completo.`);
    }
  }

  //verifica se a carga não foi completada (com palletes pendentes)
   function Verificacarga() {
     if (pallets.length === 0) return;

     const palletesPendentes = pallets.filter((pallet) =>
       pallet.itens.some((item) => !item.lido)
     );

     if (palletesPendentes.length > 0) {
       setErro(
         `A Carga possui palete(s) pendentes: ${palletesPendentes
           .map((p) => p.cod_palete)
           .join(", ")}`
       );
     } else {
       console.log(`A Carga está completa.`);
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
        className="</main>
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
              <SlArrowLeftCircle className="text-gray-500 w-6 h-6" />
            </button>
            <Text
              as="span"
              variant="muted"
              className="text-sm sm:text-base t</Text>ext-gray-900 truncate"
            >
              <b>Carga:</b> {carga.cod_carg} – {carga.nome_cli} |{" "}
              {carga.data_col} – {carga.hora_col}
            </Text>
          </div>

          {loading && (
            <Text className="text-center text-gray-600">
              Carregando palletes...
            </Text>
          )}
          <ErrorPopup message={erro} onClose={() => setErro("")} />

          {!loading && !erro && palletAtual && (
            <>
              <div className="w-full flex flex-col gap-4 mb-6 max-w-lg">
                <input
                  type="text"
                  placeholder="Kanban GDBR"
                  className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                  onChange={handleKanbanGDBRChange}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="Etiqueta Cliente"
                    className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:o
                    utline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                    onChange={(e) => {
                      handleEtiquetaClienteChange(e);
                      verificaKanban();
                    }}
                  />
                </div>
              </div>

              <div className="max-w-lg w-full">
                <div className="text-base font-bold text-center mb-2">
                  Pallet{" "}
                  {palletAtual?.cod_palete ??
                    String(palletIndex + 1).padStart(2, "0")}
                  /{totalPallets.toString().padStart(2, "0")}
                </div>

                <div className="flex flex-col gap-2">
                  {palletAtual.itens.map((item, idx) => (
                    <Card
                      key={idx}
                      className="p-2 rounded-xl bg-white border border-gray-300 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Seq</span>
                        <span className="text-xs">{item.sequen}</span>
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
                              ? "text-orange-700"
                              : item.status === "2"
                              ? "text-green-700"
                              : item.status === "3"
                              ? "text-orange-700"
                              : ""
                          }`}
                        >
                          {item.status === "0" && "Pendente"}
                          {item.status === "1" && "Em montagem"}
                          {item.status === "2" && "Finalizado"}
                          {item.status === "3" && "Divergência"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="text-center font-bold text-lg mt-2 select-none">
                  {palletAtual.stat_pale === "0" && (
                    <span className="text-red-700">Pendente</span>
                  )}
                  {palletAtual.stat_pale === "1" && (
                    <span className="text-orange-700">Em montagem</span>
                  )}
                  {palletAtual.stat_pale === "2" && (
                    <span className="text-green-700">
                      Finalizado com divergência
                    </span>
                  )}
                  {palletAtual.stat_pale === "3" && (
                    <span className="text-orange-700">Finalizado</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-6 gap-4 max-w-xs mx-auto w-full px-4">
                <button
                  className="rounded px-3 py-2 text-base bg-gray-300 hover:bg-gray-400 disabled:opacity-50 transition"
                  disabled={palletIndex === 0}
                  onClick={() => setPalletIndex((i) => Math.max(i - 1, 0))}
                >
                  Anterior
                </button>
                <button
                  className="rounded px-3 py-2 text-base bg-gray-300 hover:bg-gray-400 disabled:opacity-50 transition"
                  disabled={palletIndex === totalPallets - 1}
                  onClick={() =>
                    setPalletIndex((i) => Math.min(i + 1, totalPallets - 1))
                  }
                >
                  Próximo
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
