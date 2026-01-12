import React, { useEffect, useState, useRef } from "react";
import { apiCarga, apiItens, apiPallets } from "../lib/axios";
import { MdArrowBack } from "react-icons/md";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { TfiReload } from "react-icons/tfi";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from "react";
import ErrorPopup from '../components/CompErrorPopup.tsx';
import SuccessPopup from "../components/CompSuccessPopup.tsx";
import ConfirmationPopup from "../components/CompConfirmationPopup.tsx";
import { apiLog } from "../lib/axios";
import successSound from '../sounds/success.mp3';
import CaixasVaziasPopup from "../components/CaixasVaziasPopup.tsx";

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
  const [, setItemIndex] = useState(0);
  const [caixasLidas, setCaixasLidas] = useState(0);
  const [etiquetaLiberada, setEtiquetaLiberada] = useState(false);  
  const [itemEmMontagem, setItemEmMontagem] = useState<PalletItem | null>(null);
  //Constantes para validação se a etiqueta do cliente confere o kanban GDBR
  const [kanbanGDBR, setKanbanGDBR] = useState("");
  const [, setEtiquetaCliente] = useState("");
  const etiquetaClienteRef = useRef<HTMLInputElement>(null);
  type SuccessType = "LEITURA" | "ITEM" | "CARGA";
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);
  const [Confirm, setConfirm] = useState<string | null>(null);
  const [caixasVazias, setCaixasVazias] = useState<string | null>(null);
  const kanbanitem = palletAtual?.itens.find(item => item.status !== "3")?.kanban ?? "";
  const finalizandoPaleteRef = useRef(false);
  const finalizandoCargaRef = useRef(false);
  const finalizandoItemRef = useRef(false);
  const dataAtual = new Date();
  const dataformatada =
    dataAtual.getFullYear().toString() +
    String(dataAtual.getMonth() + 1).padStart(2, "0") +
    String(dataAtual.getDate()).padStart(2, "0"); 
  const horaformatada = dataAtual.toTimeString().slice(0, 8);
  const matricula = location.state?.matricula || localStorage.getItem("matricula");
  let novaQtdCaixasLidas = 0;

    useEffect(() => {
      if (!matricula) {
        setErro("Matrícula não encontrada. Por favor, faça login novamente.");
      }
    }, [matricula]);

     useEffect(() => {
      setCaixasVazias("Existem caixas vazias para finalizar a montagem deste palete!");
    }, []);

  const lastSoundTimeRef = useRef<number>(0);

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
    setItemIndex(0);
  }, [pallets, palletIndex]);

  // inicia a carga no palete em montagem (caso exista)
  useEffect(() => {
    if (pallets.length > 0) {
      const paleteEmMontagem = pallets.findIndex(p => p.stat_pale === "1");
      if (paleteEmMontagem !== -1 && palletIndex === 0) {
        setPalletIndex(paleteEmMontagem);
      }
    }
  }, [pallets]);

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

  // Define foco automático no campo etiqueta cliente após validação do kanban
  useEffect(() => {
    if (etiquetaLiberada && etiquetaClienteRef.current) {
      etiquetaClienteRef.current.focus();
    }
  }, [etiquetaLiberada]);

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        setSucess(null);
      }, 
      success.type === 'CARGA' ? 8000 :
      success.type === 'LEITURA' ? 800 :   
      4000
      );
      return () => clearTimeout(timeout);
    }
  }, [success]);

  useEffect(() => {
  if (!success) return;

  const now = Date.now();
  const msSinceLast = now - lastSoundTimeRef.current;

  // sempre toca na LEITURA
  if (success.type === 'LEITURA') {
    const audio = new Audio(successSound);
    audio.volume = 0.8;
    audio.play().catch(err => console.error('ERRO PLAY LEITURA:', err));
    lastSoundTimeRef.current = now;
    return;
  }

  // para ITEM: só toca se não tiver som de leitura "grudado" (ex.: item de 1 caixa)
  if (success.type === 'ITEM') {
    if (msSinceLast < 400) {
      console.log('ITEM sem som (já teve LEITURA muito recente)');
      return;
    }

    const audio = new Audio(successSound);
    audio.volume = 0.8;
    audio.play().catch(err => console.error('ERRO PLAY ITEM:', err));
    lastSoundTimeRef.current = now;
  }
}, [success]);

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

  // --Inicio das validações do processo de montagem de carga--

  // Funções que verificam etiqueta cliente e kanban GDBR
  function handleKanbanGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setKanbanGDBR(valor); 
    const etiquetaLog = etiquetaClienteRef.current?.value || "";

    const kanbanRegex = /^X\|([A-Z]-\d{3})\|(\d{4})?$/i; 
    if (valor.trim() === "" || !kanbanRegex.test(valor)) { 
      setEtiquetaLiberada(false);
      if (valor.trim() !== "") {
        setErro("Formato do Kanban GDBR inválido. Use o formato X|KANBAN|SEQUENCIAL.");
        setEtiquetaLiberada(false);

        atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        valor,
        etiquetaLog,
        "2",
        `Kanban GDBR: ${valor}. "Formato do Kanban GDBR inválido. `
      );

        setEtiquetaCliente("");
        setKanbanGDBR("");

      } else {
        setErro(null);
        setEtiquetaCliente("");
        setKanbanGDBR("");
      }
      setEtiquetaCliente("");
    } else {
      setEtiquetaLiberada(true);
      setErro(null);
      setEtiquetaCliente("");
      etiquetaClienteRef.current?.focus();
    }
  }

  function handleEtiquetaClienteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const etiquetaCliente = e.target.value;
    setEtiquetaCliente(etiquetaCliente);
  }

  // Validação se Kanban GDBR está no Pallet atual e confere com a Etiqueta do Cliente
  function verificaKanban({ etiqueta }: { etiqueta: string }) {
    const etiquetaLog = etiquetaClienteRef.current?.value || "";
    if (!palletAtual) {
      setErro("Nenhum palete selecionado.");
      return;
    }

    if (!kanbanGDBR) {
      setErro("Informe o Kanban GDBR antes da etiqueta do cliente.");
      return;
    }
    
    if (!etiqueta || etiqueta.length < 5) {
      setSucess(null);
      return;
    }

    // Valida formato da etiqueta
    const etiquetaRegex = /^[A-Z]-\d{3}$/i;
    if (!etiquetaRegex.test(etiqueta)) {
      setErro("Formato da etiqueta inválido. Use L-XXX");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Etiqueta Cliente ${etiqueta.toString()}. Formato da etiqueta inválido.} `
      );
      setEtiquetaCliente("");
      setKanbanGDBR("");
      setSucess(null);
      return;
    }

    // Valida formato do Kanban GDBR
    const kanbanRegex = /^X\|([A-Z]-\d{3})\|(\d{4})(?:\|.*)?$/i;
    const match = kanbanGDBR.match(kanbanRegex);
    if (!match) {
      setErro("Formato do Kanban GDBR inválido. Use X|KANBAN|SEQUENCIAL.");
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR}. Formato do Kanban GDBR inválido.} `
      );
      
      setSucess(null);
      return;
    }

    const kanbanOriginal = kanbanGDBR;
    const kanbanParte1 = match[1];
    const kanbanParte2 = match[2];
    const kanbanConcatenado = `${kanbanParte1}${kanbanParte2}`;
 
    const itensComKanban = palletAtual.itens.filter(item => {
      const itemKanbanRaw = (item.kanban ?? "").toString();
      const itemDigits = itemKanbanRaw.replace(/\D/g, "");
      return (
        itemKanbanRaw === kanbanOriginal ||
        itemDigits === kanbanConcatenado ||
        itemKanbanRaw.includes(kanbanParte1)
      );
    });
 
    if (itensComKanban.length === 0) {
      setErro(`Kanban ${kanbanOriginal} não encontrado no pallet atual.`);
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR} não encontrado no palete atual.} `
      );
      setSucess(null);
      return;
    }
 
    let foundItem: PalletItem | undefined;

    if (etiqueta.length === 5) {
      if (etiqueta !== kanbanParte1) {
        setErro(`Kanban GDBR ${kanbanGDBR} não confere com etiqueta cliente ${etiquetaClienteRef.current?.value ?? ""}`);
        setEtiquetaCliente("");
        setKanbanGDBR("");
        setEtiquetaLiberada(false);
        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          palletAtual?.cod_palete.trim() ?? "",
          kanbanitem,
          "4",
          dataformatada.toString(),
          horaformatada.toString(),
          String(matricula ?? ""),
          kanbanGDBR,
          etiquetaLog,
          "2",
          `Kanban GDBR ${kanbanGDBR} não confere com etiqueta cliente ${etiquetaClienteRef.current?.value ?? ""} `
        );
        return;
      }
  }
    foundItem = itensComKanban.find(item => item.status !== "3");
 
    if (!foundItem) {
      foundItem = itensComKanban.find(item => item.status !== "3");
    }
 
    if (!foundItem) {
      setErro("Todos os itens com este Kanban já foram finalizados.");
      setEtiquetaCliente("");
      setKanbanGDBR("");
      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR}. Todos os itens desse kanban já foram finalizados.} `
      );

      setSucess(null);
      return;
    }
 
    const itemIdx = palletAtual.itens.indexOf(foundItem);

    const sequencialValido = verificaItem(foundItem, foundItem.sequen);
    if (sequencialValido) {
      setItemEmMontagem(foundItem);
      setItemIndex(itemIdx);
      setCaixasLidas(0);
      caixas(palletAtual, foundItem, itemIdx);
    }
  }
  //Verifica sequencial dos itens
  function verificaItem(selected: PalletItem | undefined, sequencialAtual: number | string): boolean {
    const etiquetaLog = etiquetaClienteRef.current?.value || "";
    if (!palletAtual || !palletAtual.itens) {
      setErro("Pallet ou itens não definidos");
      return false;
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

    console.log("Item em montagem atual:", itemEmMontagem, itemEmMontagem?.status, "finalizandoItem:", finalizandoItemRef.current);
    if (!finalizandoItemRef.current && itemEmMontagem && itemEmMontagem.status !== "3" && selected && itemEmMontagem.kanban !== selected.kanban) {
      setErro(`Você já iniciou a leitura do item ${itemEmMontagem.kanban}. Finalize-o antes de iniciar outro.`);
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR}. Já existe um item em montagem. Finalize antes de iniciar outro.`
      );
      return false;
    }

    // Lógica de validação
    const todosComSequencial = palletAtual.itens.every((item) => temSequencial(item.sequen));
    const nenhumComSequencial = palletAtual.itens.every((item) => !temSequencial(item.sequen));

    // Caso todos tenham sequencial
    if (todosComSequencial) {
      const menorSequencialPendente = palletAtual.itens
        .filter((item) => item.status !== "3")
        .map((item) => Number(item.sequen))
        .sort((a, b) => a - b)[0];

      const valido = Number(sequencialAtual) === menorSequencialPendente;
      if (!valido) {
        setErro("Operador deve seguir a sequência correta. Finalize o item atual antes de continuar.");
        setEtiquetaCliente("");
        setKanbanGDBR("");

        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          palletAtual?.cod_palete.trim() ?? "",
          kanbanitem,
          "4",
          dataformatada.toString(),
          horaformatada.toString(),
          String(matricula ?? ""),
          kanbanGDBR,
          etiquetaLog,
          "2",
          `Kanban GDBR ${kanbanGDBR}. Operador deve seguir a sequência correta. `
        );

      } else {
        setErro(null);
      }
      return valido;
    }

    // Caso nenhum tenha sequencial
    if (nenhumComSequencial) {
      // Permite iniciar somente se não houver outro item em montagem (checado no topo)
      setErro(null);
      return true;
    }

    // Caso misto (alguns com sequencial)
    const menorSequencialPendente = palletAtual.itens
      .filter((item) => item.status !== "3" && temSequencial(item.sequen))
      .map((item) => Number(item.sequen))
      .sort((a, b) => a - b)[0];

    if (temSequencial(sequencialAtual)) {
      const valido = Number(sequencialAtual) === menorSequencialPendente;
      if (!valido) {
        setErro("O item atual não segue a ordem sequencial do palete.");
        setEtiquetaCliente("");
        setKanbanGDBR("");

        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          palletAtual?.cod_palete.trim() ?? "",
          kanbanitem,
          "4",
          dataformatada.toString(),
          horaformatada.toString(),
          String(matricula ?? ""),
          kanbanGDBR,
          etiquetaLog,
          "2",
          `Kanban GDBR ${kanbanGDBR}. O item atual não segue a sequência do palete.} `
        );

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
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR}. Finalize os itens com sequência antes de iniciar os sem sequencial. `
      );

      return false;
    }

    setErro(null);
    return true;
  }

  //Valida quantidade de caixas lidas (quantidade de caixas lidas menor que a quantidade de caixas total do pallet)
  async function caixas(_pallet: Pallet, _item: PalletItem, _itemIdx: number) {
    const etiquetaLog = etiquetaClienteRef.current?.value || "";
    console.log("etiquetaLOG pós preenchimento" + etiquetaClienteRef.current?.value);
    if (!_pallet || !_item) return;

    const totalCaixas = Number(_item.qtd_caixa);

    if (caixasLidas >= totalCaixas || _item.status === "3") {
      setErro("Todas as caixas do item já foram lidas. Não é possível continuar.");
      setEtiquetaCliente("");
      setKanbanGDBR("");
      
      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR}. Todas as caixas desse item já foram lidas. `
      );

      return;
    }

    novaQtdCaixasLidas = caixasLidas + 1;
    console.log("Caixas lidas atualizadas para:", novaQtdCaixasLidas);
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
        setSucess({ type: "LEITURA", message: "Leitura realizada com sucesso!" });
        setKanbanGDBR("");
        setEtiquetaCliente("");
        setEtiquetaLiberada(false);
        const updatedPallets = await refreshPalletsCompletos();

        //pra atualizar o status do item
        try {
          const updated = updatedPallets ?? pallets;
          const currentPallet = updated.find(p => p.cod_palete === _pallet.cod_palete) || updated[palletIndex];
          if (currentPallet) {
            const updatedItem = currentPallet.itens.find(it => String(it.sequen) === String(_item.sequen) || it.kanban === _item.kanban);
            if (updatedItem) {
              if (updatedItem.status === "3") {
                setItemEmMontagem(null);
              } else {
                setItemEmMontagem(updatedItem as PalletItem);
              }
            }
          }
        } catch (err) {
        }

        if (novaQtdCaixasLidas === 1) {
          setItemEmMontagem(_item);
          atualizarOp(
            carga?.cod_carg.toString() ?? "",
            palletAtual?.cod_palete.trim() ?? "",
            kanbanitem,
            "5",
            dataformatada.toString(),
            horaformatada.toString(),
            String(matricula ?? ""),
            "",
            "",
            "",
            `Item ${_item.kanban} do Pallet ${palletAtual?.cod_palete.trim() ?? ""} da carga ${carga?.cod_carg.toString() ?? ""} iniciada pelo operador ${matricula}`
          );
        }
        
        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          palletAtual?.cod_palete.trim() ?? "",
          kanbanitem,
          "4",
          dataformatada.toString(),
          horaformatada.toString(),
          matricula,
          kanbanGDBR,
          etiquetaLog,
          "1",
          `Item ${_item.kanban ?? ""} do Pallet ${palletAtual?.cod_palete.trim() ?? ""} da carga ${carga?.cod_carg.toString() ?? ""} lido com sucesso pelo operador ${matricula} `
        );

        // Se todas as caixas foram lidas, finaliza o item   
        if (novaQtdCaixasLidas >= totalCaixas) {
          finalizarItem(_pallet, _item, novaQtdCaixasLidas);
        }
      } else if (data?.Erro) {
        setErro(data.Erro);
        setEtiquetaCliente("");
        setKanbanGDBR("");
      } else {
        setErro("Falha ao atualizar o status do item Leitura de caixa");
        setEtiquetaCliente("");
        setKanbanGDBR("");
      }
    } catch {
      setErro("Erro ao conectar com a API.");
      novaQtdCaixasLidas = novaQtdCaixasLidas - 1;
      console.log("Revertendo caixas lidas para:", novaQtdCaixasLidas);
      setCaixasLidas(novaQtdCaixasLidas);
      
      setEtiquetaCliente("");
      setKanbanGDBR("");

      //falha de leitua
      if (novaQtdCaixasLidas === 0) {
        setItemEmMontagem(prev => {
          if (!prev) return null;
          if (String(prev.sequen) === String(_item.sequen) && prev.kanban === _item.kanban) return null;
          return prev;
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function finalizarItem(_pallet: Pallet, _item: PalletItem, qtdFinal: number) {
    if (!_pallet || !_item) return;

    if (_item.status !== "3") {
      try {
        finalizandoItemRef.current = true;
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
          setSucess({ type: "ITEM", message: "Todas as caixas foram lidas com sucesso, item finalizado com sucesso!" });
          setCaixasLidas(0);

          setItemEmMontagem(null);
          atualizarItensDoPallet();

          atualizarOp(
            carga?.cod_carg.toString() ?? "",
            palletAtual?.cod_palete.trim() ?? "",
            kanbanitem,
            "5",
            dataformatada.toString(),
            horaformatada.toString(),
            String(matricula ?? ""),
            "",
            "",
            "",
            `Item ${kanbanitem} do Pallet ${_pallet.cod_palete.trim()} da carga ${carga?.cod_carg.toString() ?? ""} foi finalizado com ${qtdFinal} caixas lidas`
          );

        } else if (data?.Erro) {
          setErro(data.Erro);
          setEtiquetaCliente("");
          setKanbanGDBR("");
        } else {
          setErro("Falha ao atualizar o status do item Finalização");
          novaQtdCaixasLidas = novaQtdCaixasLidas - 1;
          setEtiquetaCliente("");
          setKanbanGDBR("");
        }
      } catch {
        setErro("Erro ao conectar com a API.");
        setEtiquetaCliente("");
        setKanbanGDBR("");
      } finally {
        setLoading(false);
        finalizandoItemRef.current = false;
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
          // setCaixasVazias("Existem caixas vazias para finalizar a montagem deste palete!");
          atualizarStatusPalete("3");
        }

        return updated;
      });
    } catch {
      setErro("Erro ao atualizar itens do palete.");
    }
  }

  async function atualizarStatusPalete(status: string) {
  if (!palletAtual || !carga) return;

  if (status === "3") {
    if (finalizandoPaleteRef.current) return;
      finalizandoPaleteRef.current = true;
  }

    try {
      setLoading(true);
      const resp = await apiPallets.post("", {
        codCarg: carga.cod_carg,
        codPale: palletAtual.cod_palete.trim(),
        status
      });

      const data = resp.data;
      if (data === "Gravado com sucesso") {

        if (status === "1") {
          atualizarOp(
          carga?.cod_carg.toString() ?? "", 
          palletAtual.cod_palete.trim(),
          "",
          "2",
          dataformatada.toString(),
          horaformatada.toString(),
          String(matricula ?? ""),
          "",
          "",
          "",
          `Pallet ${palletAtual.cod_palete.trim()} da carga ${carga?.cod_carg.toString() ?? ""} iniciada pelo operador ${matricula} `
          );
        }

        if (status === "3") {
          atualizarOp(
            carga?.cod_carg.toString() ?? "", 
            palletAtual.cod_palete.trim(),
            "",
            "6",
            dataformatada.toString(),
            horaformatada.toString(),
            String(matricula ?? ""),
            "",
            "",
            "",
            `Pallet ${palletAtual.cod_palete.trim()} da carga ${carga?.cod_carg.toString() ?? ""} finalizada pelo operador ${matricula}  `
            );
          }

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
        setEtiquetaCliente("");
        setKanbanGDBR("");
      } else {
        setErro("Falha ao atualizar o status do palete.");
        setEtiquetaCliente("");
        setKanbanGDBR("");
      }
    } catch {
      setErro("Erro ao conectar com a API.");
      setEtiquetaCliente("");
      setKanbanGDBR("");
    } finally {
      setLoading(false);
      if (status === "3") finalizandoPaleteRef.current = false;
    }
  }

   //verifica se a carga não foi completada (com palletes pendentes)
  async function verificaCarga(palletsAtualizados?: Pallet[]) {
    const lista = palletsAtualizados ?? pallets;
    if (lista.length === 0) return;

    if (finalizandoCargaRef.current) return;

    const pendentes = lista.filter(p => p.stat_pale !== "3");

    if (pendentes.length > 0) {
      console.log("Existem paletes pendentes:", pendentes.map(p => p.cod_palete).join(", "));
      return;
    }

    finalizandoCargaRef.current = true;

    try {
      setLoading(true);
      const resp = await apiCarga.post("", {
        codCarg: carga?.cod_carg,
        status: "3"
      });

      const data = resp.data;

      if (data === "Gravado com sucesso") {
        setSucess({ type: "CARGA", message: "Carga finalizada com sucesso! Todos os paletes concluídos." });

        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          "",
          "",
          "7",
          dataformatada.toString(),
          horaformatada.toString(),
          String(matricula ?? ""),
          "",
          "",
          "",
          `Carga ${carga?.cod_carg.toString() ?? ""} finalizada pelo operador ${matricula} `
          );
        
      } else if (data?.Erro) {
        setErro(data.Erro);
        setEtiquetaCliente("");
        setKanbanGDBR("");
      }
    } catch {
      setErro("Erro ao conectar com a API.");
      setEtiquetaCliente("");
      setKanbanGDBR("");
    } finally {
      setLoading(false);
      finalizandoCargaRef.current = false;
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

  async function refreshPalletsCompletos(): Promise<Pallet[] | undefined> {
  if (!carga) return;
  
  setLoading(true);
  setErro(null);

  try {
    const respPallets = await apiPallets.get("/PICK_PALETE", { 
      params: { cCarga: carga.cod_carg } 
    });
    
    const palletsApi: PalletApi[] = Array.isArray(respPallets.data?.paletes)
      ? respPallets.data.paletes
      : [];
      
    if (palletsApi.length === 0) {
      setErro("Nenhum palete encontrado.");
      setPallets([]);
      return;
    }

    const palletsDetalhados = await Promise.all(
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
                    lido: false,
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
    );

    const novoIndice = Math.min(palletIndex, palletsDetalhados.length - 1);
    setPalletIndex(novoIndice);
    setPallets(palletsDetalhados);
    return palletsDetalhados;
    
  } catch (error) {
    setErro("Erro ao atualizar pallets.");
    return undefined;
  } finally {
    setLoading(false);
  }
  }

  async function confirmaPalete(response: string, selectedCod: string | null){
      if (response === "s" && selectedCod) {
        atualizarStatusPalete("1");
      } 
  }

  async function atualizarOp(
    codCarga: string, 
    codPale: string, 
    codItem: string, 
    cOperac: string, 
    cData: string, 
    cHora: string, 
    cUser: string, 
    cLeit1: string, 
    cLeit2: string, 
    cStatus: string, 
    cHistor: string) {

    console.log("Função de operação")

    try {
      setLoading(true);
      const resp = await apiLog.post("", {
        "codCarg": codCarga,
        "codPale": codPale,
        "codItem": codItem,
        "cOperac": cOperac,
        "cData": cData,
        "cHora": cHora,
        "cUser": cUser,
        "cLeit1": cLeit1,
        "cLeit2": cLeit2,
        "cStatus": cStatus,
        "cHistor": cHistor
        });

        const data = resp.data;
        console.log(resp.data)
        if (data === "Gravado com sucessoGravado com sucesso" || data === "Gravado com sucesso") {
          console.log("Enviado para a API de Log")
        } else if (data?.Erro) {
          setErro(data.Erro);
          setEtiquetaCliente("");
          setKanbanGDBR("");
        } else {
          setErro("Falha ao atualizar o Log do Usuário.");
          setEtiquetaCliente("");
          setKanbanGDBR("");
        }
      } catch {
        setErro("Erro ao conectar com a API de Log.");
        setEtiquetaCliente("");
        setKanbanGDBR("");
      } finally {
        setLoading(false);
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
              onClick={() => {
                if (palletAtual?.stat_pale !== "1") {
                  navigate("/Carga", { state: { matricula: matricula } }) 
                } else {
                  setErro("Pallet está em conferência! Por favor, finalize antes de retornar a página de cargas.");
                  setEtiquetaCliente("");
                  setKanbanGDBR("");

                }
                }}
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
              <span onClick={() => refreshPalletsCompletos()}>
                <TfiReload className="text-gray-500 w-6 h-6 cursor-pointer hover:text-gray-700 cursor-pointer" title="Atualizar pallets" />
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

          {Confirm && (
            <ConfirmationPopup
              message={Confirm}
              onRespond={(response: string) => {
                setConfirm(null);
                confirmaPalete(response, palletAtual?.cod_palete ?? null);
              }}
              onClose={() => setConfirm(null)}
            />
          )}

          {caixasVazias && (
            <CaixasVaziasPopup
              message={caixasVazias}
              matricula={matricula}
              onClose={() => setCaixasVazias(null)}
              onRespond={() => setCaixasVazias(null)}
            />
          )}

          {!loading && !erro && palletAtual && (
            <>
      
              <div className="flex justify-center">
                {palletAtual.stat_pale === "0" && (
                  <button
                    className="rounded-xl px-3 py-2 text-base bg-blue-300 hover:bg-gray-400 disabled:opacity-50 transition w-60 h-10"
                    onClick={() => {
                      setConfirm(`Iniciar montagem do palete ${palletAtual.cod_palete}?`);
                    }}
                  >
                    Iniciar Palete
                  </button>
                )}
              </div>

              {palletAtual.stat_pale === "1" && (
                <div className="w-full flex flex-col gap-4 mb-6 max-w-lg">
                 <input
                  type="text"
                  autoFocus
                  placeholder="Kanban GDBR"
                  className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                  value={kanbanGDBR} 
                  onChange={handleKanbanGDBRChange}
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={etiquetaClienteRef}
                    type="text"
                    placeholder="Etiqueta Cliente"
                    className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                    disabled={!etiquetaLiberada} 
                    onChange={(e) => {
                      handleEtiquetaClienteChange(e);
                      verificaKanban({ etiqueta: e.target.value });
                      setEtiquetaLiberada(false);
                    }}
                  />
                  {success && (
                    <SuccessPopup 
                      message={success.message} 
                      onClose={() => setSucess(null)} 
                      onRespond={() => setSucess(null)} 
                    />
                  )}
                </div>
                </div>
                )}

               <div className="max-w-lg w-full flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                  if (palletAtual?.stat_pale !== "1") {
                    setPalletIndex(i => Math.max(i - 1, 0));
                  } else {
                    setErro("Pallet está em conferência! Por favor, finalize antes de retornar ao palete anterior.");
                    setEtiquetaCliente("");
                    setKanbanGDBR("");
                  }
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
                  if (palletAtual?.stat_pale !== "1") {
                    setPalletIndex(i => Math.min(i + 1, totalPallets - 1));
                  } else {
                    setErro("Pallet está em conferência! Por favor, finalize antes de avançar.");
                    setEtiquetaCliente("");
                    setKanbanGDBR("");
                  }
                  }}
                  className="text-blue-600 hover:text-blue-800 flex-shrink-0 disabled:opacity-50"
                  disabled={palletIndex === totalPallets - 1}
                  title="Próximo Palete"
                >
                  <GoChevronRight className="w-6 h-6 text-gray-600" />
                </button>
                </div>

              <div className="max-w-lg w-full">
                <div className="text-base font-bold text-center mb-2"
                >
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

              </div>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}