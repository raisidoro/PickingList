import React, { useEffect, useState, useRef } from "react";
import { apiCarga, apiItens, apiPallets, apiVzias } from "../lib/axios";
import { MdArrowBack } from "react-icons/md";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { TfiReload } from "react-icons/tfi";
import { LuPackageSearch } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import ErrorPopup from '../components/popups/CompErrorPopup.tsx';
import SuccessPopup from "../components/popups/CompSuccessPopup.tsx";
import ConfirmationPopup from "../components/popups/CompConfirmationPopup.tsx";
import { apiLog } from "../lib/axios";
import successSound from '../sounds/success.mp3';
import CaixasVaziasPopup from "../components/popups/CaixasVaziasPopup.tsx";
import CaixasVaziasView from "../components/popups/CompCaixasVaziasView.tsx";

import type { Carga } from "../types/carga";
import type { Pallet, PalletApi, PalletItem } from "../types/pallet";
import { getStatusColorPalete } from "../utils/status.ts";
import { getDataHoraAtual } from "../utils/date.ts";

import { Text } from "../components/ui/text.tsx";
import { Card } from "../components/ui/card.tsx";

import { KANBAN_REGEX, parseKanban, encontraItensComKanban } from "../utils/validacaoKanban.ts";

import { usePallets } from "../hooks/usePallets.ts";

export default function PalletViewSingle() {
  const navigate = useNavigate();
  const location = useLocation();
  const carga = location.state?.carga as Carga | undefined;

  const {
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
  } = usePallets(carga);

  const [, setItemIndex] = useState(0);
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
  const { dataLog, horaLog } = getDataHoraAtual();

  const matricula = location.state?.matricula || localStorage.getItem("matricula");
  const [showCaixasVazias, setShowCaixasVazias] = useState(false);

  useEffect(() => {
    if (!matricula) {
      setErro("Matrícula não encontrada. Por favor, faça login novamente.");
    }
  }, [matricula]);

  const lastSoundTimeRef = useRef<number>(0);

  // Ajusta o índice do pallet se necessário ao mudar a lista de pallets
  useEffect(() => {
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

  // Confere no servidor se TODOS os itens do palete realmente estão finalizados
  async function allItemsFinalizedServer(cPalete: string): Promise<boolean> {
    try {
      const resp = await apiItens.get("", {
        params: { cCarga: carga?.cod_carg ?? "", cPalet: cPalete }
      });

      const itens = Array.isArray(resp.data?.itens) ? resp.data.itens : [];

      return itens.length > 0 && itens.every(
        (it: any) => String(it.status ?? it.Status) === "3"
      );
    } catch (error) {
      console.error("Erro ao revalidar itens no servidor:", error);
      return false;
    }
  }

  async function checkAndOpenCaixasVaziasIfNeededFor(pallet: Pallet) {
    if (!carga || !pallet) return;

    if (pallet.stat_pale !== "1") return;

    try {
      const allFinal = await allItemsFinalizedServer(pallet.cod_palete);
      if (!allFinal) return;

      const respVzias = await apiVzias.get("", {
        params: { cCarga: carga.cod_carg, cPalet: pallet.cod_palete }
      });

      const itensVzias = Array.isArray(respVzias.data?.itens) ? respVzias.data.itens : [];
      const hasPendingCaixasVazias = itensVzias.some((it: any) => String(it.status) !== "3");

      if (hasPendingCaixasVazias) {
        setCaixasVazias(`Existem caixas vazias para o palete: ${pallet.cod_palete}`);
      } else {
        await atualizarStatusPalete("3");
      }
    } catch (err) {
      console.error("Erro ao checar caixas vazias na entrada do palete:", err);
    }
  }

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

  useEffect(() => {
    if (caixasVazias && palletAtual) {
      setCaixasVazias(`Existem caixas vazias para o Pallet: ${palletAtual.cod_palete}`);
      console.log("Popup recarregado pallet:", palletIndex, palletAtual.cod_palete);
    }
  }, [palletIndex]);

  useEffect(() => {
    if (palletAtual) {
      checkAndOpenCaixasVaziasIfNeededFor(palletAtual);
    }
  }, [palletAtual?.cod_palete, palletAtual?.stat_pale]);

  useEffect(() => {
    function handleOnline() {
      if (palletAtual) {
        console.log("Conexão restabelecida — sincronizando palete atual com o servidor.");
        atualizarItensDoPallet();
      }
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [palletAtual]);


  // --Inicio das validações do processo de montagem de carga--

  // Funções que verificam etiqueta cliente e kanban GDBR
  function handleKanbanGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setKanbanGDBR(valor);
    const etiquetaLog = etiquetaClienteRef.current?.value || "";

    if (valor.trim() === "" || !KANBAN_REGEX.test(valor)) {
      setEtiquetaLiberada(false);
      if (valor.trim() !== "") {
        setErro("Formato do Kanban GDBR inválido. Use o formato X|KANBAN|SEQUENCIAL.");
        setEtiquetaLiberada(false);

        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          palletAtual?.cod_palete.trim() ?? "",
          kanbanitem,
          "4",
          dataLog.toString(),
          horaLog.toString(),
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
        dataLog.toString(),
        horaLog.toString(),
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
    const parsed = parseKanban(kanbanGDBR);
    if (!parsed) {
      setErro("Formato do Kanban GDBR inválido. Use X|KANBAN|SEQUENCIAL.");
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataLog.toString(),
        horaLog.toString(),
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
    const { parte1: kanbanParte1, concatenado: kanbanConcatenado } = parsed;

    const itensComKanban = encontraItensComKanban(palletAtual.itens, kanbanOriginal, kanbanConcatenado, kanbanParte1);

    if (itensComKanban.length === 0) {
      setErro(`Kanban ${kanbanOriginal} não encontrado no palete atual.`);
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataLog.toString(),
        horaLog.toString(),
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
          dataLog.toString(),
          horaLog.toString(),
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
        dataLog.toString(),
        horaLog.toString(),
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
        dataLog.toString(),
        horaLog.toString(),
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
          dataLog.toString(),
          horaLog.toString(),
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
          dataLog.toString(),
          horaLog.toString(),
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
        dataLog.toString(),
        horaLog.toString(),
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
    if (!_pallet || !_item) return;

    const totalCaixas = Number(_item.qtd_caixa);
    const lidasAtuais = Number(_item.qtd_contada);

    if (lidasAtuais >= totalCaixas || _item.status === "3") {
      setErro("Todas as caixas do item já foram lidas. Não é possível continuar.");
      setEtiquetaCliente("");
      setKanbanGDBR("");

      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        kanbanitem,
        "4",
        dataLog.toString(),
        horaLog.toString(),
        String(matricula ?? ""),
        kanbanGDBR,
        etiquetaLog,
        "2",
        `Kanban GDBR ${kanbanGDBR}. Todas as caixas desse item já foram lidas. `
      );
      return;
    }

    const proximaQtd = lidasAtuais + 1;

    try {
      setLoading(true);

      const resp = await apiItens.post("", {
        codCarg: carga?.cod_carg,
        codPale: _pallet.cod_palete.trim(),
        codKanb: kanbanGDBR.includes("|") ? kanbanGDBR.split("|")[1] : "",
        codSequ: _item.sequen,
        qtdrest: proximaQtd,
        operac: "1"
      });

      const data = resp.data;
      if (data === "Gravado com sucesso") {
        setSucess({ type: "LEITURA", message: "Leitura realizada com sucesso!" });
        setKanbanGDBR("");
        setEtiquetaCliente("");
        setEtiquetaLiberada(false);

        const updatedPallets = await refreshPallets();

        try {
          const updated = updatedPallets ?? pallets;
          const currentPallet = updated.find(p => p.cod_palete === _pallet.cod_palete) || updated[palletIndex];
          if (currentPallet) {
            const updatedItem = currentPallet.itens.find(it =>
              String(it.sequen) === String(_item.sequen) || it.kanban === _item.kanban);
            if (updatedItem) {
              if (updatedItem.status === "3") {
                setItemEmMontagem(null);
              } else {
                setItemEmMontagem(updatedItem as PalletItem);
              }

              if (proximaQtd === 1) {
                atualizarOp(
                  carga?.cod_carg.toString() ?? "",
                  palletAtual?.cod_palete.trim() ?? "",
                  kanbanitem,
                  "5",
                  dataLog.toString(),
                  horaLog.toString(),
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
                dataLog.toString(),
                horaLog.toString(),
                matricula,
                kanbanGDBR,
                etiquetaLog,
                "1",
                `Item ${_item.kanban ?? ""} do Pallet ${palletAtual?.cod_palete.trim() ?? ""} da carga ${carga?.cod_carg.toString() ?? ""} lido com sucesso pelo operador ${matricula} `
              );

              if (proximaQtd >= totalCaixas) {
                await finalizarItem(_pallet, updatedItem);
              }
            }
          }
        } catch { }
      } else if (data?.Erro) {
        setErro(data.Erro);
        setEtiquetaCliente("");
        setKanbanGDBR("");
      } else {
        setErro("Falha ao atualizar o status do item (Leitura de caixa)");
        setEtiquetaCliente("");
        setKanbanGDBR("");
      }
    } catch {
      const itensAtualizados = await tentarReconciliar(_pallet);

      if (itensAtualizados) {
        const itemNoServidor = itensAtualizados.find(
          (it: any) => String(it.sequen) === String(_item.sequen) || it.kanban === _item.kanban
        );

        if (!itemNoServidor) {
          setErro("Conexão instável. Não foi possível confirmar a leitura. Tente novamente.");
        } else {
          const totalCaixasServidor = Number(itemNoServidor.qtd_caixa);
          const lidasServidor = Number(itemNoServidor.qtd_contada);

          if (itemNoServidor.status === "3") {
            // já estava tudo certo no servidor (leitura + finalização)
            setSucess({ type: "ITEM", message: "Item já estava finalizado no servidor. Estado sincronizado." });
            setItemEmMontagem(null);
          } else if (lidasServidor >= totalCaixasServidor && totalCaixasServidor > 0) {
            // a leitura foi salva, mas a finalização nunca chegou a ser disparada — completa agora
            setErro(null);
            await finalizarItem(_pallet, itemNoServidor as PalletItem);
          } else if (lidasServidor === proximaQtd) {
            // a leitura foi salva normalmente, só a resposta que se perdeu
            setSucess({ type: "LEITURA", message: "Leitura sincronizada com sucesso!" });
            setItemEmMontagem(itemNoServidor as PalletItem);
          } else {
            // realmente não foi salva
            setErro("Conexão instável. Leitura pode não ter sido salva. Tente novamente.");
          }
        }
      } else {
        setErro("Sem conexão com o servidor. Verifique a internet e tente novamente.");
      }

      setEtiquetaCliente("");
      setKanbanGDBR("");
    } finally {
      setLoading(false);
    }
  }

  async function finalizarItem(_pallet: Pallet, _item: PalletItem) {
    if (!_pallet || !_item) return;

    try {
      finalizandoItemRef.current = true;
      setLoading(true);

      const qtdFinal = Number(_item.qtd_contada);

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
        setSucess({ type: "ITEM", message: "Todas as caixas foram lidas, item finalizado com sucesso!" });

        setItemEmMontagem(null);
        await atualizarItensDoPallet();

        atualizarOp(
          carga?.cod_carg.toString() ?? "",
          palletAtual?.cod_palete.trim() ?? "",
          kanbanitem,
          "5",
          dataLog.toString(),
          horaLog.toString(),
          String(matricula ?? ""),
          "",
          "",
          "",
          `Item ${kanbanitem} do Pallet ${_pallet.cod_palete.trim()} da carga ${carga?.cod_carg.toString() ?? ""} foi finalizado com ${qtdFinal} caixas lidas`
        );

        setTimeout(async () => {
          console.log("Aguardando 300ms e revalidando pallet após finalizar item");
          const todosFinalizadosNoServidor = await allItemsFinalizedServer(_pallet.cod_palete);
          console.log("Resultado allItemsFinalizedServer após item finalizado:", todosFinalizadosNoServidor);

          if (todosFinalizadosNoServidor) {
            await checkAndOpenCaixasVaziasIfNeededFor(_pallet);
          }
        }, 300);
      } else if (data?.Erro) {
        setErro(data.Erro);
        setEtiquetaCliente("");
        setKanbanGDBR("");
      } else {
        setErro("Falha ao atualizar o status do item (Finalização)");
        setEtiquetaCliente("");
        setKanbanGDBR("");
      }

    } catch {
      const itensAtualizados = await tentarReconciliar(_pallet);
      const itemNoServidor = itensAtualizados?.find(
        (it: any) => String(it.sequen) === String(_item.sequen) || it.kanban === _item.kanban
      );

      if (itemNoServidor?.status === "3") {
        setItemEmMontagem(null);
        setSucess({ type: "ITEM", message: "Item já estava finalizado no servidor. Estado sincronizado." });

        // como o item já estava finalizado, revalida se o palete também deveria estar
        const todosFinalizados = await allItemsFinalizedServer(_pallet.cod_palete);
        if (todosFinalizados) {
          await checkAndOpenCaixasVaziasIfNeededFor(_pallet);
        }
      } else {
        setErro("Erro ao conectar com a API. O item pode não ter sido finalizado — verifique e tente novamente.");
      }
      setEtiquetaCliente("");
      setKanbanGDBR("");
    } finally {
      setLoading(false);
      finalizandoItemRef.current = false;
    }
  }

  async function tentarReconciliar(pallet: Pallet) {
    try {
      const resp = await apiItens.get("", {
        params: { cCarga: carga?.cod_carg ?? "", cPalet: pallet.cod_palete }
      });
      const itens = Array.isArray(resp.data?.itens) ? resp.data.itens : [];

      setPallets((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((p) => p.cod_palete === pallet.cod_palete);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            itens: itens.map((it: any) => ({
              ...it,
              status: it.status ?? "0",
              qtd_contada: it.qtd_contada ?? "-",
            })),
          };
        }
        return updated;
      });

      return itens;
    } catch (error) {
      console.error("Falha ao reconciliar com o servidor:", error);
      return null;
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
            status: it.status ?? "0",
            qtd_contada: it.qtd_contada ?? it.qtd_contada ?? "-",
          }))
        };

        const todosFinalizados = updated[palletIndex].itens.every(
          (item) => item.status === "3"
        );

        if (todosFinalizados) {
          console.log("Todos os itens finalizados, chamando atualizarStatusPalete(3)");
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

    try {
      // 1º: revalida itens no servidor, não confia em estado local nem em callers
      const todosFinalizados = await allItemsFinalizedServer(palletAtual.cod_palete);
      if (!todosFinalizados) {
        setErro("Nem todos os itens foram confirmados no servidor. Finalização abortada.");
        finalizandoPaleteRef.current = false;
        return;
      }

      // 2º: só então verifica caixas vazias
      const respVzias = await apiVzias.get("", {
        params: { cCarga: carga.cod_carg, cPalet: palletAtual.cod_palete }
      });
      const itens = Array.isArray(respVzias.data?.itens) ? respVzias.data.itens : [];
      const hasPendingCaixasVazias = itens.some((item: any) => item.status !== "3");
      if (hasPendingCaixasVazias) {
        setCaixasVazias("Existem caixas vazias pendentes para finalizar a montagem deste palete!");
        finalizandoPaleteRef.current = false;
        return;
      }
    } catch (error) {
      console.error("Erro ao revalidar antes de finalizar palete:", error);
      setErro("Não foi possível confirmar os itens no servidor. Tente novamente.");
      finalizandoPaleteRef.current = false;
      return;
    } 
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
          dataLog.toString(),
          horaLog.toString(),
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
          dataLog.toString(),
          horaLog.toString(),
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
          verificaCarga();
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
  async function verificaCarga() {
    if (finalizandoCargaRef.current || !carga) return;
    finalizandoCargaRef.current = true;

  try {
    // Revalida no servidor, não confia no estado local
    const respPallets = await apiPallets.get("/PICK_PALETE", { params: { cCarga: carga.cod_carg } });
    const paletesApi: PalletApi[] = Array.isArray(respPallets.data?.paletes) ? respPallets.data.paletes : [];
    const todosFinalizadosNoServidor = paletesApi.length > 0 && paletesApi.every(p => p.stat_pale === "3");

    if (!todosFinalizadosNoServidor) return;

    setLoading(true);
    try {
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
          dataLog.toString(),
          horaLog.toString(),
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
    }
  } finally {
    finalizandoCargaRef.current = false;
    setLoading(false);
  }
}

  async function confirmaPalete(response: string, selectedCod: string | null) {
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
                  setErro("Palete está em conferência! Por favor, finalize antes de retornar a página de cargas.");
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
              className="text-sm sm:text-base text-gray-900 truncate"
            >
              <b>Carga:</b> {carga.cod_carg} – {carga.nome_cli} |{" "}
              {carga.data_col} – {carga.hora_col}
            </Text>
          </div>

          <div className="flex justify-between items-center px-4">
            <span onClick={() => refreshPallets()}>
              <TfiReload className="text-gray-500 w-6 h-6 cursor-pointer hover:text-gray-700 cursor-pointer" title="Atualizar pallets" />
            </span>
            <span
              onClick={() => setShowCaixasVazias(true)}
              className="cursor-pointer hover:text-gray-700"
              title="Ver caixas vazias"
            >
              <LuPackageSearch className="text-gray-500 w-6 h-6" />
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
              onClose={(finalized) => {
                setCaixasVazias(null);
                if (finalized) {
                  atualizarStatusPalete("3");
                }
              }}
              onRespond={() => setCaixasVazias(null)}
              palletIndex={palletIndex}
            />
          )}

          <CaixasVaziasView
            palletIndex={palletIndex}
            isOpen={showCaixasVazias}
            onClose={() => setShowCaixasVazias(false)}
          />

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
                    disabled={palletAtual?.itens.every(item => item.status === "3")}
                    onChange={handleKanbanGDBRChange}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={etiquetaClienteRef}
                      type="text"
                      placeholder="Etiqueta Cliente"
                      className="border-b border-gray-400 bg-transparent px-3 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
                      disabled={!etiquetaLiberada || palletAtual?.itens.every(item => item.status === "3")}
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
                      className={`p-2 rounded-xl  ${getStatusColorPalete(item.status)} shadow-sm`}
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