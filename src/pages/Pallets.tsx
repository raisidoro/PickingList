import React, { useEffect, useState } from "react";
import { apiItens, apiPallets } from "../lib/axios";
import { SlArrowLeftCircle } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from "react";

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
          setErro("Nenhum pallet encontrado.");
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
          .catch(() => setErro("Erro ao buscar itens dos pallets."))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setErro("Erro ao carregar pallets.");
        setPallets([]);
        setLoading(false);
      });
  }, [carga]);

  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const totalPallets = pallets.length;

  let kanbanGDBR = "";
  let etiquetaCliente = "";

  function handleKanbanGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    const setKanbanGDBR = (value: string) => {
      kanbanGDBR = value;
    };
    setKanbanGDBR(e.target.value);
    console.log("Kanban GDBR:", kanbanGDBR);
  }

  function handleEtiquetaClienteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const setEtiquetaCliente = (value: string) => {
      etiquetaCliente = value;
    };
    setEtiquetaCliente(e.target.value);
    console.log("Etiqueta Cliente:", etiquetaCliente);

    // Verificação do kanbanGDBR em todos os pallets ao alterar a etiqueta
    if (!palletAtual || !kanbanGDBR) {
      console.log("Nenhum pallet ou Kanban informado.");
      return;
    }

    const kanbanGDBRNumerico = (kanbanGDBR.match(/\d+/g) || []).join("");

    const todosKanbansPallet: { pallet: string; kanbans: string[] }[] =
      pallets.map((pallet) => {
        const kanbansNumericos = pallet.itens.map((item) =>
          (item.kanban.match(/\d+/g) || []).join("")
        );
        return { pallet: pallet.cod_palete, kanbans: kanbansNumericos };
      });
    console.log("Todos os kanbans dos pallets:", todosKanbansPallet);

    let encontrado = false;
    for (const p of todosKanbansPallet) {
      if (p.kanbans.includes(kanbanGDBRNumerico)) {
        console.log(`Kanban ${kanbanGDBR} encontrado no pallet ${p.pallet}`);
        encontrado = true;
        break;
      }
    }
    if (!encontrado) {
      console.log(`Kanban ${kanbanGDBR} não encontrado em nenhum pallet.`);
    }
    if (kanbanGDBR.includes(etiquetaCliente)) {
      console.log("Kanban GDBR contém Etiqueta Cliente");
    } else {
      console.log("Kanban GDBR não contém Etiqueta Cliente");
    }
  }

  // Caroline - Verificar o kanbanGDBR em todos os pallets
  // 1. Ao digitar o kanbanGDBR, verificar se ele está contido em algum pallet.
  // 2. Se estiver, exibir o pallet correspondente.
  // 3. Extrair apenas os números dos kanbans (substring).
  // 4. Criar um array com todos os kanbans de cada pallet.
  // 5. Comparar o kanbanGDBR com o array:
  //    - Se encontrar, mostrar o pallet.
  //    - Se não encontrar, continuar verificando o próximo pallet.
  //    - Se chegar ao final da lista sem encontrar, exibir mensagem de erro.
  // 6. Registrar no console se o kanban foi encontrado ou não:
  //    - Se encontrado, mostrar também o pallet.
  //    - Se não encontrado em nenhum, exibir um alert informando que o kanban não existe em nenhum pallet.
  // Função para verificar automaticamente o kanban em todos os pallets usando array

  // function verificarKanbanPallets(pallet: Pallet | undefined) {
  //   if (!pallet || !kanbanGDBR) {
  //     console.log("Nenhum pallet ou Kanban informado.");
  //     return false;
  //   }

  //   const kanbanGDBRNumerico = (kanbanGDBR.match(/\d+/g) || []).join("");

  //   const todosKanbansPallet: { pallet: string; kanbans: string[] }[] = pallets.map(
  //     (pallet) => {
  //       const kanbansNumericos = pallet.itens.map((item) =>
  //         (item.kanban.match(/\d+/g) || []).join("")
  //       );
  //       return { pallet: pallet.cod_palete, kanbans: kanbansNumericos };
  //     }
  //   );

  //   for (const p of todosKanbans) {
  //     if (p.kanbans.includes(kanbanGDBRNumerico)) {
  //       console.log(`Kanban ${kanbanGDBR} encontrado no pallet ${p.pallet}`);
  //       return;
  //     }
  //   }

  //   // Se não encontrou em nenhum pallet
  //   alert(`Kanban ${kanbanGDBR} não encontrado em nenhum pallet.`);
  // }

  // useEffect(() => {
  //   verificarKanbanPallets(palletAtual);
  // }, [kanbanGDBR, pallets, palletAtual]);

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
              Carregando pallets...
            </Text>
          )}
          {erro && <Text className="text-center text-red-600">{erro}</Text>}

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
                    placeholder="Etiqueta Cliente"
                    className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                    onChange={handleEtiquetaClienteChange}
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
