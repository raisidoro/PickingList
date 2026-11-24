import Modal from "react-modal";
import { useEffect, useState, useRef } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";
import successSound from '../../sounds/success.mp3';
import { apiPallets, apiLog, apiVzias } from "../../lib/axios";
import { useLocation, } from "react-router-dom";
import { jsonToyota, ultimoSkidRegistrado } from "../JSON/criaJSON.js";

Modal.setAppElement("#root");

interface CaixasVaziasPopupProps {
  message: string | null;
  matricula?: string | null;
  onClose: (finalized?: boolean) => void;
  onRespond: (response: string) => void;
  palletIndex?: number;
  skidLabel?: string;
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

interface Pallet {
  cod_palete: string;
  stat_pale: string;
  itens: PalletItem[];
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

export default function CaixasVaziasPopup({ message, matricula, onClose, palletIndex, }: CaixasVaziasPopupProps) {
  const [embalagem, setEmbalagem] = useState<string>("");
  const location = useLocation();
  const [caixaRfid, setCaixaRfid] = useState("");
  const carga = location.state?.carga as Carga | undefined;
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const palletIndexFinal = palletIndex ?? 0;
  const palletAtual = pallets.length > 0 ? pallets[palletIndexFinal] : undefined;
  const [erro, setErro] = useState<string | null>(null);
  type SuccessType = "LEITURA"
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);
  const [, setLoading] = useState(false);
  const caixaRfidRef = useRef<HTMLInputElement>(null);
  const [vaziasItens, setVaziasItens] = useState<VaziaItem[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Fonte da verdade das contagens (evita perder leituras entre renders)
  const vaziasItensRef = useRef<VaziaItem[]>([]);
  const processandoRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encerradoRef = useRef(false);

  function getDataHora() {
    const d = new Date();
    const data =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const hora = d.toTimeString().slice(0, 8);
    return { data, hora };
  }

  function atualizarItens(fn: (prev: VaziaItem[]) => VaziaItem[]) {
    const novo = fn(vaziasItensRef.current);
    vaziasItensRef.current = novo;
    setVaziasItens(novo);
    return novo;
  }

  // Avisa a página que o popup terminou (uma única vez)
  function encerrar() {
    if (encerradoRef.current) return;
    encerradoRef.current = true;
    setShowModal(false);
    onClose(true);
  }

  // Carrega a lista de paletes na montagem
  useEffect(() => {
    const init = async () => {
      console.log("INICIANDO CaixasVaziasPopup");
      setLoading(true);
      setErro(null);
      setShowModal(false);

      if (!carga) {
        setErro("Carga não encontrada.");
        setShowModal(true);
        setLoading(false);
        return;
      }

      try {
        const respPallets = await apiPallets.get("/PICK_PALETE", {
          params: { cCarga: carga.cod_carg }
        });

        const palletsApi: PalletApi[] = Array.isArray(respPallets.data?.paletes) ? respPallets.data.paletes : [];
        console.log("Paletes carregados:", palletsApi.length);

        if (palletsApi.length === 0) {
          setErro("Nenhum palete encontrado.");
          setShowModal(true);
          setLoading(false);
          return;
        }

        // O carregamento das vazias é feito pelo useEffect abaixo,
        // assim que o palete atual estiver definido.
        setPallets(palletsApi.map((p) => ({
          cod_palete: p.cod_palete,
          stat_pale: p.stat_pale,
          itens: [],
          cod_lane: p.cod_lane,
          cod_grupo: p.cod_grupo,
          num_order: p.num_order,
        })));
      } catch (error) {
        setErro("Erro ao carregar dados.");
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Carrega vazias quando o palete atual fica disponível / muda
  useEffect(() => {
    if (palletAtual && carga) {
      console.log("PALLET DEFINIDO/MUDOU:", palletAtual.cod_palete);
      carregarVaziasItens(carga.cod_carg, palletAtual.cod_palete);
    }
  }, [palletAtual?.cod_palete, carga]);

  // Limpa o debounce ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const carregarVaziasItens = async (
    codCarga: string,
    codPalete: string) => {
    console.log("CHAMANDO /PICK_VZIA:", { codCarga, codPalete });
    try {
      const response = await apiVzias.get("/PICK_VZIA", {
        params: { cCarga: codCarga, cPalet: codPalete }
      });

      console.log("RESPOSTA /PICK_VZIA:", response.data);

      if (response.data?.error && response.data.error.includes("Registro(s) não encontrado(s)")) {
        console.log("PALLET NÃO TEM CAIXAS VAZIAS - encerrando popup");
        encerrar();
        return;
      }

      const itensVazios: VaziaItem[] = Array.isArray(response.data?.itens)
        ? response.data.itens.map((item: any) => ({
          cod_emb: item.cod_emb ?? "-",
          qtd_total: Number(item.qtd_total ?? 0),
          status: String(item.status ?? "0"),
          qtd_restante: Number(item.qtd_restante ?? "0"),
        }))
        : [];

      if (itensVazios.length === 0) {
        console.log("Array vazio - encerrando popup");
        encerrar();
        return;
      }

      vaziasItensRef.current = itensVazios;
      setVaziasItens(itensVazios);

      const currentItem = itensVazios.find(item => item.status !== "3");
      if (currentItem) {
        setEmbalagem(currentItem.cod_emb);
        setShowModal(true);
      } else {
        console.log("Todas as vazias já finalizadas - encerrando popup");
        encerrar();
      }
    } catch (error) {
      console.error("Erro ao carregar itens vazios:", error);
      setErro("Erro ao carregar as caixas vazias. Verifique a conexão.");
      setShowModal(true);
    }
  };

  // Som de sucesso
  useEffect(() => {
    if (success && success.type === 'LEITURA') {
      const audio = new Audio(successSound);
      audio.volume = 0.8;
      audio.play().catch(err => console.error('ERRO PLAY LEITURA:', err));
    }
  }, [success]);

  // Validação matrícula
  useEffect(() => {
    if (!matricula) {
      setErro("Matrícula não encontrada. Por favor, faça login novamente.");
    }
  }, [matricula]);

  function sanitize(
    input: string): string {
    return input
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .replace(/\u0000/g, '')
      .trim()
      .toUpperCase();
  }

  // Formato esperado do RFID: "EMBALAGEM;demais;campos", ex.: E24IG;0152-1;4;I;10;600;400;330
  function isRfidFormatoValido(rfid: string): boolean {
    const s = sanitize(rfid);
    if (!s.includes(";")) return false;
    const primeira = s.split(";")[0];
    return primeira.length > 0 && s !== primeira;
  }

  // Extrai a embalagem (primeira parte antes do ";") do RFID
  function extrairEmbalagemRfid(rfid: string): string {
    return sanitize(rfid).split(";")[0];
  }

  // A embalagem lida deve ser o item atual em andamento
  // (primeiro item da lista que ainda não foi finalizado).
  function embalagemAtual(): string | null {
    const item = vaziasItensRef.current.find(it => it.status !== "3");
    return item ? item.cod_emb : null;
  }

  function verificaCaixas(rfidVal: string) {
    if (processandoRef.current) {
      // Já tem uma leitura em andamento: descarta esta
      setCaixaRfid("");
      return false;
    }

    if (!isRfidFormatoValido(rfidVal)) {
      setErro("Formato de RFID inválido. Esperado: EMBALAGEM;...");
      setCaixaRfid("");
      return false;
    }

    const alvo = embalagemAtual();
    if (!alvo) {
      setErro("Não há embalagem pendente neste palete.");
      setCaixaRfid("");
      return false;
    }

    // A embalagem do RFID precisa ser a embalagem que está sendo solicitada
    const embalagemLida = extrairEmbalagemRfid(rfidVal);
    if (embalagemLida !== sanitize(alvo)) {
      setErro(`Embalagem incorreta! Esperado: ${alvo} | Lido: ${embalagemLida}`);
      const { data, hora } = getDataHora();
      atualizarOp(
        carga?.cod_carg ?? "",
        palletAtual?.cod_palete?.trim() ?? "",
        alvo,
        "8",
        data,
        hora,
        String(matricula ?? ""),
        sanitize(rfidVal),
        "",
        "2",
        `Leitura inválida: embalagem esperada ${alvo}, lida ${embalagemLida}`
      );
      setCaixaRfid("");
      return false;
    }

    setEmbalagem(alvo);

    const skid = ultimoSkidRegistrado(carga!.cod_carg);
    if (!skid) {
      setErro("Skid do palete não encontrado neste dispositivo. Não é possível registrar a leitura.");
      setCaixaRfid("");
      return false;
    }

    processandoRef.current = true;
    leituracaixa(alvo, sanitize(rfidVal), skid)
      .catch(err => {
        console.error("Erro inesperado na leitura de caixa vazia:", err);
        setErro("Erro inesperado ao processar a leitura.");
      })
      .finally(() => {
        processandoRef.current = false;
        setCaixaRfid("");
        caixaRfidRef.current?.focus();
      });
    return true;
  }

  async function finalizarItemVazio(embalagemAlvo: string, rfidVal: string, total: number): Promise<boolean> {
    const codCarg = carga?.cod_carg ?? "";
    const codPale = palletAtual?.cod_palete?.trim() ?? "";

    const ok = await enviarVzias(codCarg, codPale, embalagemAlvo, "3", String(total));
    if (!ok) return false;

    const { data, hora } = getDataHora();
    await atualizarOp(
      codCarg, codPale, embalagemAlvo, "8", data, hora,
      String(matricula ?? ""), rfidVal, "", "1",
      `Caixa ${embalagemAlvo} do Pallet ${codPale} da carga ${codCarg} concluido pelo operador ${matricula}`
    );

    const novos = atualizarItens(prev =>
      prev.map(it => it.cod_emb === embalagemAlvo ? { ...it, status: "3" } : it));

    const proximo = novos.find(it => it.status !== "3");
    if (proximo) {
      setEmbalagem(proximo.cod_emb);
    } else {
      setSucess({ type: "LEITURA", message: "Todas as caixas vazias foram lidas com sucesso!" });
      setTimeout(() => encerrar(), 1500);
    }
    return true;
  }

  async function leituracaixa(
    embalagemAlvo: string,
    rfidVal: string,
    skid: { skidLabel: string; rfid: string }
  ) {
    const codCarg = carga?.cod_carg ?? "";
    const codPale = palletAtual?.cod_palete?.trim() ?? "";

    const itemAlvo = vaziasItensRef.current.find(i => i.cod_emb === embalagemAlvo);
    if (!itemAlvo) {
      setErro("Item não encontrado no palete.");
      return;
    }

    const total = itemAlvo.qtd_total;
    const lidasAtuais = total - itemAlvo.qtd_restante;

    if (lidasAtuais >= total) {
      // Todas lidas, mas a finalização falhou antes: tenta finalizar de novo
      if (itemAlvo.status !== "3") {
        const ok = await finalizarItemVazio(embalagemAlvo, rfidVal, total);
        if (!ok) setErro("Todas as caixas lidas, mas a finalização não foi confirmada. Leia novamente para tentar de novo.");
        return;
      }
      setErro("Todas as caixas já foram lidas para este item.");
      const { data, hora } = getDataHora();
      atualizarOp(
        codCarg, codPale, embalagemAlvo, "4", data, hora,
        String(matricula ?? ""), rfidVal, "", "2",
        `Embalagem: ${embalagemAlvo}. Todas as caixas desse item já foram lidas.`
      );
      return;
    }

    const novaContagem = lidasAtuais + 1;
    atualizarItens(prev => prev.map(it =>
      it.cod_emb === embalagemAlvo ? { ...it, qtd_restante: it.qtd_total - novaContagem } : it));

    const okLeitura = await enviarVzias(codCarg, codPale, embalagemAlvo, "2", String(novaContagem));
    if (!okLeitura) {
      // desfaz a contagem local
      atualizarItens(prev => prev.map(it =>
        it.cod_emb === embalagemAlvo ? { ...it, qtd_restante: it.qtd_total - lidasAtuais } : it));
      return;
    }

    try {
      console.log("jsonToyota args:", {
        carga: codCarg,
        skidRfid: skid.rfid,
        skidLabel: skid.skidLabel,
        partRfid: rfidVal,
        partLabel: rfidVal,
      });
      await jsonToyota(
        codCarg,
        skid.rfid,
        skid.skidLabel,
        rfidVal,   // partRfid: RFID lido no input
        rfidVal    // partLabel: o conteúdo lido (EMB;...) é o próprio label da peça
      );
      setSucess({ type: "LEITURA", message: "Leitura realizada com sucesso!" });
    } catch (jsonError) {
      console.error("Falha ao gravar leitura de caixa vazia no arquivo JSON local:", jsonError);
      setErro("Leitura gravada no servidor, mas houve falha ao gerar o arquivo local. Verifique.");
    }

    // Primeira caixa do item
    if (novaContagem === 1) {
      const okPrimeira = await enviarVzias(codCarg, codPale, embalagemAlvo, "1", String(novaContagem));
      if (okPrimeira) {
        const { data, hora } = getDataHora();
        await atualizarOp(
          codCarg, codPale, embalagemAlvo, "8", data, hora,
          String(matricula ?? ""), rfidVal, "", "1",
          `Item ${embalagemAlvo} do Pallet ${codPale} da carga ${codCarg} iniciado pelo operador ${matricula}`
        );
        atualizarItens(prev => prev.map(it =>
          it.cod_emb === embalagemAlvo ? { ...it, status: "1" } : it));
      }
    }

    {
      const { data, hora } = getDataHora();
      await atualizarOp(
        codCarg, codPale, embalagemAlvo, "8", data, hora,
        String(matricula ?? ""), rfidVal, "", "1",
        `Caixa ${embalagemAlvo} do Pallet ${codPale} da carga ${codCarg} lida com sucesso pelo operador ${matricula}`
      );
    }

    if (novaContagem === total) {
      const ok = await finalizarItemVazio(embalagemAlvo, rfidVal, total);
      if (!ok) setErro("Todas as caixas lidas, mas a finalização não foi confirmada. Leia novamente para tentar de novo.");
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
    cHistor: string
  ) {
    console.log("atualizarOp foi chamado", { codCarga, codPale, codItem, cOperac, cData, cHora, cUser, cLeit1, cLeit2, cStatus, cHistor });

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
      const httpOk = resp && typeof resp.status === "number" && resp.status >= 200 && resp.status < 300;
      console.log("RESPOSTA LOG:", data, resp.status);

      if (data === "Gravado com sucessoGravado com sucesso" || data === "Gravado com sucesso" || (httpOk && !data?.Erro)) {
        console.log("LOG enviado com sucesso");
      } else if (data?.Erro) {
        console.error("LOG erro:", data.Erro);
        setErro(data.Erro);
      } else {
        console.error("LOG falhou:", data);
        setErro("Falha ao atualizar o Log do Usuário.");
      }
    } catch (error) {
      console.error("Erro API Log:", error);
      setErro("Erro ao conectar com a API de Log.");
    } finally {
      setLoading(false);
    }
  }

  async function enviarVzias(
    codCarg: string,
    codPale: string,
    codEmb: string,
    cOperac: string,
    cQuant: string): Promise<boolean> {
    console.log("Enviando VZIAS:", { codCarg, codPale, codEmb, cOperac, cQuant });

    try {
      setLoading(true);
      const resp = await apiVzias.post("", {
        codCarg, codPale, codEmb, cOperac, cQuant
      });

      console.log("RESPOSTA VZIAS status:", resp.status, "data:", resp.data);

      if (resp.status >= 200 && resp.status < 300 &&
        (resp.data === "Gravado com sucesso" || resp.data === "Gravado com sucessoGravado com sucesso")) {
        console.log("VZIAS OK");
        return true;
      }

      console.error("VZIAS falhou:", resp.status, resp.data);
      setErro("Falha no servidor VZIAS");
      return false;

    } catch (error: any) {
      console.error("Erro API VZIAS:", error.response?.status, error.response?.data);
      if (error.response?.data) {
        setErro(`Erro servidor: ${error.response.data}`);
      } else {
        setErro("Erro ao conectar com VZIAS");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  //Função para definir a cor da borda
  function getStatusColor(
    status: string | undefined) {
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
      isOpen={showModal}
      onRequestClose={() => {
        const allFinalized = vaziasItens.length > 0 && vaziasItens.every(item => item.status === "3");
        if (allFinalized) {
          encerrar();
        } else {
          setErro("Finalize todos os itens antes de fechar o popup.");
        }
      }}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      contentLabel="Caixas Vazias"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">Caixas Vazias!</h2>
        <p className="text-gray-700 break-words text-center">{message || "Ler todas as caixas vazias"}</p>
        {embalagem && (
          <p className="text-sm text-gray-600 text-center">Embalagem atual: <span className="font-bold">{embalagem}</span></p>
        )}

        <input
          ref={caixaRfidRef}
          type="text"
          autoFocus
          placeholder="RFID"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={caixaRfid}
          onChange={(e) => {
            const val = e.target.value;
            setCaixaRfid(val);
            if (erro) setErro(null);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (!val.trim()) return;
            // Espera o leitor terminar de digitar a string completa
            debounceRef.current = setTimeout(() => verificaCaixas(val), 200);
          }}
        />

        <div className="w-full max-w-xs mx-auto">
          {vaziasItens.length > 0 && (
            <p className="text-center text-gray-700 font-semibold text-xs mb-2">Embalagem | Total | Lidas</p>
          )}
          <div className="flex flex-col items-center gap-1.5">
            {vaziasItens.map((item, index) => (
              <div key={index} className={`flex items-center justify-center h-11 ${getStatusColor
                (item.status)} rounded-full px-3 py-2.5`}>
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

        {erro && (
          <ErrorPopup
            message={erro}
            onClose={() => {
              setErro(null);
              setCaixaRfid("");
              caixaRfidRef.current?.focus();
            }}
          />
        )}

        {success && (
          <SuccessPopup
            message={success.message}
            onClose={() => {
              setSucess(null);
              caixaRfidRef.current?.focus();
            }}
            onRespond={() => {
              setSucess(null);
              caixaRfidRef.current?.focus();
            }}
          />
        )}
      </div>
    </Modal>
  );
}