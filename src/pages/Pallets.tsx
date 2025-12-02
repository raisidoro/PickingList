import React, { useEffect, useState, useRef } from "react";
import { apiCarga, apiItens, apiPallets } from "../lib/axios";
import { MdArrowBack } from "react-icons/md";
import { TfiReload } from "react-icons/tfi";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from "react";
import ErrorPopup from '../components/CompErrorPopup.tsx';
import SuccessPopup from "../components/CompSuccessPopup.tsx";

// Define tipo de texto com variantes
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

// Dados da carga
export interface Carga {
  cod_carg: string;
  cod_cli: string;
  nome_cli: string;
  data_col: string;
  hora_col: string;
  qtd_pale: string;
  stat_col: string;
}

//Formato dos dados retornados pela API de paletes
interface PalletApi {
  cod_palete: string;
  num_order: string;
  cod_doca: string;
  sup_doc: string;
  cod_grupo: string;
  cod_lane: string;
  stat_pale: string;
}

// Formato dos itens dentro do pallet
interface PalletItem {
  lido: boolean;
  kanban: string;
  sequen: number;
  qtd_caixa: number;
  qtd_peca: number;
  embalagem: string;
  multiplo: string;
  status: string;
}

// Formato do pallet com seus itens
interface Pallet {
  cod_palete: string;
  stat_pale: string;
  itens: PalletItem[];
  cod_lane: string;
  cod_grupo: string;
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
  const [success, setSucess] = useState<string | null>(null);
  const [palletIndex, setPalletIndex] = useState(0);
  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const totalPallets = pallets.length;
  const [, setItemIndex] = useState(0);
  //const itemAtual = palletAtual?.itens[itemIndex];
  const [caixasLidas, setCaixasLidas] = useState(0);

  // ordem de visuali8zação dos itens 
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
    setItemIndex(0);
  }, [pallets, palletIndex]);

  useEffect(() => {
    setSucess(null);
  }, [palletIndex]);

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

  //Inicio das validações do processo de montagem de carga
  //Constantes para validação se a etiqueta do cliente confere o kanban GDBR
  const [kanbanGDBR, setKanbanGDBR] = useState("");
  const [, setEtiquetaCliente] = useState("");
  const etiquetaClienteRef = useRef<HTMLInputElement>(null);

  // Funções que verificam etiqueta cliente e kanban GDBR
  function handleKanbanGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKanbanGDBR(e.target.value);
    if (e.target.value.length === 12) {
      etiquetaClienteRef.current?.focus();
    }
  }

  function handleEtiquetaClienteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const etiquetaCliente = e.target.value;
    setEtiquetaCliente(etiquetaCliente);
  }

  // Validação se Kanban GDBR está no Pallet atual e confere com a Etiqueta do Cliente

  function verificaKanban({ etiqueta }: { etiqueta: string }) {
    if (!kanbanGDBR || !etiqueta || !palletAtual) return;

    if (etiqueta.length < 5) {
        setErro(null);
        setSucess(null);
        return;
    }

    // Valida formato da etiqueta
    const etiquetaRegex = /^[A-Z]-\d{3}$/i;
    if (!etiquetaRegex.test(etiqueta)) {
      setErro("Formato da etiqueta inválido. Use L-XXX");
      setSucess(null);
      return;
    }

    // Valida formato do Kanban GDBR
    const kanbanRegex = /^X\|([A-Z]-\d{3})\|(\d{4})(?:\|.*)?$/i;
    const match = kanbanGDBR.match(kanbanRegex);
    if (!match) {
      setErro("Formato do Kanban GDBR inválido. Use X|KANBAN|SEQUENCIAL.");
      setSucess(null);
      return;
    }

    const kanbanClienteEsperado = match[1]; 
    const kanbanConcatenado = `${match[1]}${match[2]}`;
    const kanbanOriginal = kanbanGDBR;

    // Confere se etiqueta bate com Kanban
    if (etiqueta !== kanbanClienteEsperado) {
      setErro(`Etiqueta ${etiqueta} não confere com o Kanban esperado (${kanbanClienteEsperado}).`);
      setSucess(null);
      return;
    }

    etiquetaClienteRef.current?.blur();

    // Procura item no pallet
    const itemIdx = palletAtual.itens.findIndex((item) => {
      const itemKanbanRaw = (item.kanban ?? "").toString();
      const itemDigits = itemKanbanRaw.replace(/\D/g, "");
      return (
        itemKanbanRaw === kanbanOriginal ||
        itemDigits === kanbanConcatenado ||
        itemDigits.endsWith(kanbanConcatenado) ||
        itemDigits === kanbanClienteEsperado ||
        itemKanbanRaw.includes(kanbanClienteEsperado) ||
        itemKanbanRaw === etiqueta
      );
    });

    if (itemIdx === -1) {
      setErro(`Kanban ${kanbanOriginal} não encontrado no pallet atual.`);
      setSucess(null);
      return;
    }

    const foundItem = palletAtual.itens[itemIdx];
    setItemIndex(itemIdx);

    if (foundItem.status === "3") {
      setErro("Todas as caixas do item já foram lidas, não foi possível realizar mais leituras!");
      setSucess(null);
    } else if (foundItem.status !== "2") {
      const sequencialValido = verificaItem()(foundItem.sequen);
      if (sequencialValido) {
        setSucess(`Kanban GDBR ${kanbanGDBR} confere Etiqueta Cliente ${etiqueta}`);
        caixas(palletAtual, foundItem, itemIdx);
      }
    }
  }

  //Verifica sequencial dos itens
  function verificaItem(): (sequencialAtual: number | string) => boolean {
    if (!palletAtual || !palletAtual.itens) {
      setErro("Pallet ou itens não definidos");
      return () => false;
    }

    const temSequencial = (seq: any) => {
      const n = Number(seq);
      return Number.isFinite(n) && n > 0;
    };

    // Ordena itens: finalizados por último, depois sequenciais
    setPallets((prev) => {
      const updated = [...prev];
      if (!updated[palletIndex]) return prev;

      const itens = [...updated[palletIndex].itens];
      itens.sort((a, b) => {
        if (a.status === "3" && b.status !== "3") return 1;
        if (a.status !== "3" && b.status === "3") return -1;

        const aHas = temSequencial(a.sequen);
        const bHas = temSequencial(b.sequen);

        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        if (aHas && bHas) {
          return Number(a.sequen) - Number(b.sequen);
        }
        return 0;
      });

      updated[palletIndex] = { ...updated[palletIndex], itens };
      return updated;
    });

    // Lógica de validação
    const todosComSequencial = palletAtual.itens.every((item) => temSequencial(item.sequen));
    const nenhumComSequencial = palletAtual.itens.every((item) => !temSequencial(item.sequen));

    // Caso todos tenham sequencial
    if (todosComSequencial) {
      const menorSequencialPendente = palletAtual.itens
        .filter((item) => item.status !== "3")
        .map((item) => Number(item.sequen))
        .sort((a, b) => a - b)[0];

      return (sequencialAtual: number | string) => {
        const valido = Number(sequencialAtual) === menorSequencialPendente;
        if (!valido) {
          setErro("Operador deve seguir a sequência correta. Finalize o item atual antes de continuar.");
        } else {
          setErro(null);
        }
        return valido;
      };
    }

    // Caso nenhum tenha sequencial
    if (nenhumComSequencial) {
      setErro(null);
      return () => true; // Permite qualquer ordem
    }

    // Caso misto (alguns com sequencial)
    const menorSequencialPendente = palletAtual.itens
      .filter((item) => item.status !== "3" && temSequencial(item.sequen))
      .map((item) => Number(item.sequen))
      .sort((a, b) => a - b)[0];

    return (sequencialAtual: number | string) => {
      if (temSequencial(sequencialAtual)) {
        const valido = Number(sequencialAtual) === menorSequencialPendente;
        if (!valido) {
          setErro("O item atual não segue a ordem sequencial do palete.");
        } else {
          setErro(null);
        }
        return valido;
      }

      const aindaTemSequencialPendente = palletAtual.itens.some(
        (item) => item.status !== "3" && temSequencial(item.sequen)
      );

      if (aindaTemSequencialPendente) {
        setErro("Finalize os itens com sequência antes de montar os sem sequência.");
        return false;
      }

      setErro(null);
      return true;
    };
  }


  //Valida quantidade de caixas lidas (quantidade de caixas lidas menor que a quantidade de caixas total do pallet)
  async function caixas(_pallet: Pallet, _item: PalletItem, _itemIdx: number) {
    if (!_pallet || !_item) return;

    const totalCaixas = Number(_item.qtd_caixa);

    if (caixasLidas >= totalCaixas || _item.status === "3") {
      setErro("Todas as caixas do item já foram lidas. Não é possível continuar.");
      return;
    }

    const novaQtdCaixasLidas = caixasLidas + 1;
    setCaixasLidas(novaQtdCaixasLidas);

    try {
      setLoading(true);

      const resp = await apiItens.post("", {
        codCarg: carga?.cod_carg,
        codPale: _pallet.cod_palete.trim(),
        codKanb: kanbanGDBR.includes("|") ? kanbanGDBR.split("|")[1] : "",
        codSequ: _item.sequen,
        qtdrest: novaQtdCaixasLidas,
        operac: "1"
      });

      const data = resp.data;
      if (data === "Gravado com sucesso") {
        setSucess("Leitura realizada com sucesso!");
        setKanbanGDBR("");
        setEtiquetaCliente("");

        // Se o pallet estava pendente, muda para "em montagem"
        if (_pallet.stat_pale === "0") {
          atualizarStatusPalete("1");
          atualizarItensDoPallet();
        }

        // Se todas as caixas foram lidas, finaliza o item   
        if (novaQtdCaixasLidas >= totalCaixas) {
          finalizarItem(_pallet, _item, novaQtdCaixasLidas);
        }
      } else if (data?.Erro) {
        setErro(data.Erro);
      } else {
        setErro("Falha ao atualizar o status do item Leitura de caixa");
      }
    } catch {
      setErro("Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  async function finalizarItem(_pallet: Pallet, _item: PalletItem, qtdFinal: number) {
    if (!_pallet || !_item) return;

    if (_item.status !== "3") {
      try {
        setLoading(true);
        const resp = await apiItens.post("", {
          codCarg: carga?.cod_carg,
          codPale: _pallet.cod_palete.trim(),
          codKanb: kanbanGDBR.includes("|") ? kanbanGDBR.split("|")[1] : "",
          codSequ: _item.sequen,
          qtdrest: qtdFinal,
          operac: "3"
        });

        const data = resp.data;
        if (data === "Kanban finalizado") {
          setSucess("Todas as caixas foram lidas com sucesso, item finalizado com sucesso!");
          setCaixasLidas(0);
          atualizarItensDoPallet();
        } else if (data?.Erro) {
          setErro(data.Erro);
        } else {
          setErro("Falha ao atualizar o status do item Finalização");
        }
      } catch {
        setErro("Erro ao conectar com a API.");
      } finally {
        setLoading(false);
      }
    }
  }



  async function atualizarItensDoPallet() {
    try {
      const resp = await apiItens.get("", {
        params: {
          cCarga: carga?.cod_carg,
          cPalet: palletAtual?.cod_palete
        }
      });

      const novosItens = resp.data?.itens ?? [];

      setPallets((prevPallets) => {
        const updated = [...prevPallets];

        updated[palletIndex] = {
          ...updated[palletIndex],
          itens: novosItens.map((it: any) => ({
            ...it,
            status: it.status ?? "0" 
          }))
        };

        const todosFinalizados = updated[palletIndex].itens.every(
          (item) => item.status === "3"
        );

        if (todosFinalizados) {
          atualizarStatusPalete("3");
          verificaCarga(updated);
        }

        return updated;
      });
    } catch {
      setErro("Erro ao atualizar itens do palete.");
    }
  }


  async function atualizarStatusPalete(status: string) {
  if (!palletAtual || !carga) return;

    try {
      setLoading(true);
      const resp = await apiPallets.post("", {
        codCarg: carga.cod_carg,
        codPale: palletAtual.cod_palete.trim(),
        status
      });

      const data = resp.data;
      if (data === "Gravado com sucesso") {
        setPallets(prev => {
          const updated = [...prev];
          updated[palletIndex] = {
            ...updated[palletIndex],
            stat_pale: status
          };

          const todosPaletesFinalizados = updated.every(p => p.stat_pale === "3");
          if (todosPaletesFinalizados) {
            verificaCarga(updated);
          }

          return updated;
        });
      } else if (data?.Erro) {
        setErro(data.Erro);
      } else {
        setErro("Falha ao atualizar o status do palete.");
      }
    } catch {
      setErro("Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

   //verifica se a carga não foi completada (com palletes pendentes)
  async function verificaCarga(palletsAtualizados?: Pallet[]) {
    const lista = palletsAtualizados ?? pallets;

    if (lista.length === 0) return;

    const pendentes = lista.filter(p => p.stat_pale !== "3");

    if (pendentes.length > 0) {
      console.log("Existem paletes pendentes:", pendentes.map(p => p.cod_palete).join(", "));
      return;
    }

    try {
      setLoading(true);
      const resp = await apiCarga.post("", {
        codCarg: carga?.cod_carg,
        status: "3"
      });

      const data = resp.data;

      if (data === "Gravado com sucesso") {
        setSucess("Carga finalizada com sucesso! Todos os paletes concluídos.");
      } else if (data?.Erro) {
        setErro(data.Erro);
      }
    } catch {
      setErro("Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

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
              <MdArrowBack className="text-gray-500 w-6 h-6" />
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
              {palletAtual.stat_pale !== "3" && (
                <div className="w-full flex flex-col gap-4 mb-6 max-w-lg">
                  <input
                  type="text"
                  autoFocus
                  placeholder="Kanban GDBR"
                  className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                  onChange={handleKanbanGDBRChange}
                />
                <div className="flex items-center gap-2">
                  <input
                  type="text"
                  maxLength={5}
                  ref={etiquetaClienteRef}
                  placeholder="Etiqueta Cliente"
                  className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                  onChange={(e) => {
                  handleEtiquetaClienteChange(e);
                  verificaKanban({ etiqueta: e.target.value });
                  }}
                />

                  {success && (<SuccessPopup message={success} onClose={() => setSucess(null)} onRespond={() => setSucess(null)} />)}

                </div>
                </div>
                )}

               <div className="max-w-lg w-full text-xl">
                  <strong>Lane: </strong> {palletAtual.cod_lane} | <strong>Group: </strong> {palletAtual.cod_grupo}
              </div>

              <div className="max-w-lg w-full">
                <div className="text-base font-bold text-center mb-2"
                >
                  Palete{" "}
                  {palletAtual?.cod_palete ??
                    String(palletIndex + 1).padStart(2, "0")}/{totalPallets.toString().padStart(2, "0")}
                </div>
                <div className="flex flex-col gap-2">
                  {sortedItems.map((item, idx) => (
                    <Card
                      key={idx}
                      className={`p-2 rounded-xl  ${getStatusColor(item.status)} shadow-sm`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">Seq</span>
                        <span className="text-xs">
                          {item.sequen === 0 ? "-" : item.sequen}
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
                          className={`font-bold text-xs ${item.status === "0"
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
                  onClick={() => {
                    if (palletAtual?.stat_pale !== "1") {
                      setPalletIndex(i => Math.min(i + 1, totalPallets - 1));
                    } else {
                      setErro("Pallet está em conferência! Por favor, finalize a montagem antes de passar para o próximo.");
                    }
                  }}
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