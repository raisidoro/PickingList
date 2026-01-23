import Modal from "react-modal";
import React, { useState, useEffect, useRef } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";
import successSound from '../sounds/success.mp3';
import { apiPallets, apiLog, apiVzias } from "../lib/axios";
import { useLocation, useNavigate } from "react-router-dom";
import { set } from "zod";

Modal.setAppElement("#root");

interface CaixasVaziasPopupProps {
  message: string | null;
  matricula?: string | null;
  onClose: () => void;
  onRespond: (response: string) => void;
  palletIndex?: number;
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
  embalagem: string;
  quantidade: number;
}

export default function CaixasVaziasPopup({ message, matricula, onClose, palletIndex }: CaixasVaziasPopupProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [embalagem, setEmbalagem] = useState<string>("");
  const [totalCaixas, setTotalCaixas] = useState<number>(0);
  const location = useLocation();
  const [caixaGDBR, setCaixaGDBR] = useState("");
  const [caixaCliente, setCaixaCliente] = useState("");
  const carga = location.state?.carga as Carga | undefined;
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const palletIndexFinal = palletIndex ?? 0;
  const palletAtual = pallets.length > 0 ? pallets[palletIndexFinal] : undefined;
  const [erro, setErro] = useState<string | null>(null);
  type SuccessType = "LEITURA";
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [contagemCaixas, setContagemCaixas] = useState(0);
  const [itemEmMontagem, setItemEmMontagem] = useState<PalletItem | null>(null);
  const caixaGDBRRef = useRef<HTMLInputElement>(null);
  const dataAtual = new Date();
  const dataformatada =
    dataAtual.getFullYear().toString() +
    String(dataAtual.getMonth() + 1).padStart(2, "0") +
    String(dataAtual.getDate()).padStart(2, "0");
  const horaformatada = dataAtual.toTimeString().slice(0, 8);
  const [vaziasItens, setVaziasItens] = useState<VaziaItem[]>([]);
  const [showModal, setShowModal] = useState(false);

  //Carrega informações na montagem do componente
  useEffect(() => {
    const init = async () => {
      console.log("INICIANDO CaixasVaziasPopup");
      setLoading(true);
      setErro(null);
      setShowModal(false);

      if (!carga) {
        console.log("Carga não encontrada");
        setErro("Carga não encontrada.");
        setLoading(false);
        return;
      }

      try {
        //Carrega paletes
        console.log("Carregando paletes da carga:", carga.cod_carg);
        const respPallets = await apiPallets.get("/PICK_PALETE", { 
          params: { cCarga: carga.cod_carg } 
        });
        
        const palletsApi: PalletApi[] = Array.isArray(respPallets.data?.paletes) ? respPallets.data.paletes : [];
        console.log("Paletes carregados:", palletsApi.length);
        
        if (palletsApi.length === 0) {
          setErro("Nenhum palete encontrado.");
          setLoading(false);
          return;
        }

        setPallets(palletsApi.map((p) => ({
          cod_palete: p.cod_palete,
          stat_pale: p.stat_pale,
          itens: [],
          cod_lane: p.cod_lane,
          cod_grupo: p.cod_grupo,
          num_order: p.num_order,
        })));

        // Carrega caixas vazias do pallet atual
        const palletAtualLocal = palletsApi[palletIndexFinal];
        if (palletAtualLocal) {
          console.log("Carregando vazias do pallet:", palletAtualLocal.cod_palete);
          await carregarVaziasItens(carga.cod_carg, palletAtualLocal.cod_palete);
        }

      } catch (error) {
        setErro("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []); 

  // Recarrega vazias a cada vez que pallet muda
  useEffect(() => {
    if (palletAtual && carga) {
      console.log("PALLET MUDOU");
      carregarVaziasItens(carga.cod_carg, palletAtual.cod_palete);
    }
  }, [palletAtual?.cod_palete, carga]);

  const carregarVaziasItens = async (codCarga: string, codPalete: string) => {
    console.log("CHAMANDO /PICK_VZIA:", { codCarga, codPalete });
    try {
      const response = await apiVzias.get("/PICK_VZIA", {
        params: { cCarga: codCarga, cPalet: codPalete }
      });

      console.log("RESPOSTA /PICK_VZIA:", response.data);

      if (response.data?.error && response.data.error.includes("Registro(s) não encontrado(s)")) {
        console.log("PALLET NÃO TEM CAIXAS VAZIAS - Fechando popup");
        setShowModal(false);
        return;
      }

      const itensVazios: VaziaItem[] = Array.isArray(response.data?.itens)
        ? response.data.itens.map((item: any) => ({
            embalagem: item.embalagem ?? "-",
            quantidade: Number(item.quantidade ?? 0),
          }))
        : [];

      if (itensVazios.length > 0) {
        console.log("PALLET TEM CAIXAS VAZIAS - Abrindo popup", itensVazios);
        setVaziasItens(itensVazios);
        setShowModal(true); 
        setEmbalagem(itensVazios[0].embalagem);
        setTotalCaixas(itensVazios[0].quantidade);
        setContagemCaixas(0);
      } else {
        console.log("Array vazio - Fechando popup");
        setShowModal(false);
      }
    } catch (error) {
      console.error("Erro ao carregar itens vazios:", error);
      setShowModal(false);
    }
  };

  // Som de sucesso
  useEffect(() => {
    if (success && success.type === 'LEITURA') {
      console.log("🔊 Tocando som de sucesso");
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

  function handleCaixaGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    const caixaGDBR = e.target.value;
    setCaixaGDBR(caixaGDBR);
  }

  function handleCaixaClienteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const caixaCliente = e.target.value;
    setCaixaCliente(caixaCliente);
  }

  function sanitize(input: string): string {
    return input
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .replace(/\u0000/g, '')
      .trim()
      .toUpperCase();
  }

  function extrairEmbalagem(caixa: string, embalagemEsperada: string): string | null {
    if (!caixa) return null;

    const caixaNorm = sanitize(caixa);
    const embalagemNorm = sanitize(embalagemEsperada);

    console.log('[DEBUG extrairEmbalagem] caixaNorm:', caixaNorm, 'embalagemNorm:', embalagemNorm);

    if (caixa.includes(';')) {
      const primeiraParte = caixa.split(';')[0].trim().toUpperCase();
      return primeiraParte || null;
    }

    if (caixaNorm.includes(embalagemNorm)) {
      return embalagemNorm;
    }

    const alnum = caixaNorm.replace(/[^A-Z0-9]/g, '');
    if (alnum.includes(embalagemNorm.replace(/[^A-Z0-9]/g, ''))) {
      return embalagemNorm;
    }
    return null;
  }

  function verificaCaixas(caixaClienteVal: string, caixaGDBRVal: string) {
    const embalagemNorm = sanitize(embalagem);
    const embalagemCliente = extrairEmbalagem(caixaClienteVal, embalagemNorm);
    const embalagemGDBR = extrairEmbalagem(caixaGDBRVal, embalagemNorm);

    console.log('[DEBUG validarCaixas] clienteVal:', caixaClienteVal);
    console.log('[DEBUG validarCaixas] gdbRVal:', caixaGDBRVal);
    console.log('[DEBUG validarCaixas] embalagemCliente:', embalagemCliente);
    console.log('[DEBUG validarCaixas] embalagemGDBR:', embalagemGDBR);

    if (!embalagemCliente || embalagemCliente !== embalagemNorm) {
      setErro(`Embalagem não encontrada no palete.`);
      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "8",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        caixaCliente,
        caixaGDBR,
        "2",
        `Embalagem ${embalagemCliente} não encontrada no palete`,
      );
      setCaixaCliente("");
      setCaixaGDBR("");
      return false;
    }

    if (!embalagemGDBR || embalagemCliente !== embalagemGDBR) {
      setErro(`Embalagens não conferem: ${embalagemCliente} / ${embalagemGDBR}`);
      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "8",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        caixaCliente,
        caixaGDBR,
        "2",
        `As embalagens não conferem: ${embalagemCliente} / ${embalagemGDBR}`,
      );
      return false;
    }

    if (embalagemCliente === embalagemGDBR) {
      leituracaixa(embalagemCliente, embalagemGDBR);
    }
  }

  async function leituracaixa(embalagemCliente: string, embalagemGDBR: string) {
    if (contagemCaixas >= Number(totalCaixas)) {
      setErro("Todas as caixas já foram lidas para este item.");
      setContagemCaixas(0);
      atualizarOp(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "4",
        dataformatada.toString(),
        horaformatada.toString(),
        String(matricula ?? ""),
        embalagemCliente,
        embalagemGDBR,
        "2",
        `Embalagem: ${embalagem}. Todas as caixas desse item já foram lidas.`
      );
      setCaixaCliente("");
      setCaixaGDBR("");
      return;
    }

    const novaContagem = contagemCaixas + 1;
    setContagemCaixas(novaContagem);
    console.log("Caixas lidas até o momento:", novaContagem);
    setSucess({ type: "LEITURA", message: "Leitura realizada com sucesso!" });
    setCaixaCliente("");
    setCaixaGDBR("");

    // Envia contagem normal
    enviarVzias(
      carga?.cod_carg.toString() ?? "",
      palletAtual?.cod_palete.trim() ?? "",
      embalagem,
      "2",
      String(novaContagem)
    );

    // Primeira caixa
    if (novaContagem === 1) {
      enviarVzias(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "1",
        String(novaContagem)
      );
    }

    // Última caixa
    if (novaContagem === Number(totalCaixas)) {
      enviarVzias(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "3",
        String(novaContagem)
      );
      setContagemCaixas(0);
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
    console.log("LOG: ", { codCarga, codPale, codItem, cOperac, cLeit1, cLeit2 });

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
      console.log("RESPOSTA LOG:", data);
      
      if (data === "Gravado com sucessoGravado com sucesso" || data === "Gravado com sucesso") {
        console.log("LOG enviado com sucesso");
      } else if (data?.Erro) {
        console.error("LOG erro:", data.Erro);
        setErro(data.Erro);
        setCaixaCliente("");
        setCaixaGDBR("");
      } else {
        console.error("LOG falhou:", data);
        setErro("Falha ao atualizar o Log do Usuário.");
        setCaixaCliente("");
        setCaixaGDBR("");
      }
    } catch (error) {
      console.error("Erro API Log:", error);
      setErro("Erro ao conectar com a API de Log.");
      setCaixaCliente("");
      setCaixaGDBR("");
    } finally {
      setLoading(false);
    }
  }

  async function enviarVzias(
    codCarg: string,
    codPale: string,
    codEmb: string,
    cOperac: string,
    cQuant: string
  ) {
    console.log("Enviando VZIAS:", { codCarg, codPale, codEmb, cOperac, cQuant });

    try {
      setLoading(true);
      const resp = await apiVzias.post("", {
        codCarg: codCarg,
        codPale: codPale,
        codEmb: codEmb,
        cOperac: cOperac,
        cQuant: cQuant
      });

      const data = resp.data;
      console.log("RESPOSTA VZIAS:", data);
      
      if (data === "Gravado com sucessoGravado com sucesso" || data === "Gravado com sucesso") {
        console.log("VZIAS enviado com sucesso");
      } else if (data?.Erro) {
        console.error("VZIAS erro:", data.Erro);
        setErro(data.Erro);
        setCaixaCliente("");
        setCaixaGDBR("");
      } else {
        console.error("VZIAS falhou:", data);
        setErro("Falha ao atualizar VZIAS.");
        setCaixaCliente("");
        setCaixaGDBR("");
      }
    } catch (error) {
      console.error("❌ Erro API VZIAS:", error);
      setErro("Erro ao conectar com a API de VZIAS.");
      setCaixaCliente("");
      setCaixaGDBR("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={showModal}
      onRequestClose={onClose}
      contentLabel="Caixas Vazias"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">Caixas Vazias!</h2>
        <p className="text-gray-700 break-words text-center">{message || "Ler todas as caixas vazias"}</p>

        <input
          type="text"
          autoFocus
          placeholder="Caixa Cliente"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={caixaCliente}
          onChange={(e) => {
            handleCaixaClienteChange(e);
            setCaixaCliente(e.target.value);
            if (erro) setErro(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              caixaGDBRRef.current?.focus();
            }
          }}
        />

        <input
          ref={caixaGDBRRef}
          type="text"
          placeholder="Caixa GDBR"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={caixaGDBR}
          onChange={(e) => {
            const val = e.target.value;
            handleCaixaGDBRChange(e);
            setCaixaGDBR(val);

            if (caixaCliente?.trim()) {
              verificaCaixas(caixaCliente, val);
            } else {
              setErro("Informe a Caixa Cliente antes de ler a Caixa GDBR.");
              setCaixaGDBR("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              verificaCaixas(caixaCliente, e.currentTarget.value);
            }
          }}
        />

      <div className="w-full max-w-xs mx-auto">
        {vaziasItens.length > 0 && (
          <p className="text-center text-gray-700 font-semibold text-xs mb-2">Embalagem | Total</p>
        )}
        <div className="flex flex-col items-center gap-1.5">
          {vaziasItens.map((item, index) => (
            <div key={index} className="flex items-center justify-center h-11 bg-blue-100 rounded-full px-3 py-2.5">
              <p className="text-lg font-bold text-blue-600 min-w-[55px] text-center">
                {item.embalagem}
              </p>
              <p className="text-lg font-bold text-green-600 min-w-[25px] text-center mx-1">
                {item.quantidade}
              </p>
            </div>
          ))}
        </div>
      </div>

        {erro && (
          <ErrorPopup
            message={erro}
            onClose={() => setErro(null)}
          />
        )}

        {success && (
          <SuccessPopup
            message={success.message}
            onClose={() => setSucess(null)}
            onRespond={() => setSucess(null)}
          />
        )}

        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Carregando..." : "Fechar"}
        </button>
      </div>
    </Modal>
  );
}
