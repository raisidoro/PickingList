import Modal from "react-modal";
import React, { useState, useEffect, useRef } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";
import successSound from '../sounds/success.mp3';
import {  apiItens, apiPallets, apiLog, apiVzias } from "../lib/axios";
import { useLocation, useNavigate } from "react-router-dom";

Modal.setAppElement("#root");

interface CaixasVaziasPopupProps {
  message: string | null;
  matricula?: string | null;
  onClose: () => void;
  onRespond: (response: string) => void;
}

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

export default function CaixasVaziasPopup({ message, matricula, onClose }: CaixasVaziasPopupProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [embalagem, setEmbalagem] = useState<string>("");
  const [totalCaixas, setTotalCaixas] = useState<number>(0);
  const location = useLocation();
  const [caixaGDBR, setCaixaGDBR] = useState("");
  const [caixaCliente, setCaixaCliente] = useState("");
  const carga = location.state?.carga as Carga | undefined;
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [palletIndex, setPalletIndex] = useState(0);
  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const [erro, setErro] = useState<string | null>(null);
  type SuccessType = "LEITURA";
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  // const [caixaLiberada, setcaixaLiberada] = useState(false);  
  var [contagemCaixas, setContagemCaixas] = useState(0); 
  const [itemEmMontagem, setItemEmMontagem] = useState<PalletItem | null>(null);
  const caixaGDBRRef = useRef<HTMLInputElement>(null);
  const dataAtual = new Date();
  const dataformatada =
    dataAtual.getFullYear().toString() +
    String(dataAtual.getMonth() + 1).padStart(2, "0") +
    String(dataAtual.getDate()).padStart(2, "0");
  const horaformatada = dataAtual.toTimeString().slice(0, 8);

  useEffect(() => {
    setLoading(true);
    setErro(null);

    if (!carga) {
      setErro("Carga não encontrada.");
      setLoading(false);
      return;
    }

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
              apiVzias
                .get("", {
                  params: { cCarga: carga.cod_carg, cPalet: p.cod_palete},
                })
                .then((respItens) => ({
                  itens: Array.isArray(respItens.data?.itens)
                    ? respItens.data.itens.map((it: any) => ({
                        embalagem: it.embalagem ?? "-",
                        qtd_caixa: Number(it.quantidade ?? 0),
                    }))
                    : [],
                }))
            )
        )
          .then((itensPorPalete) => {
            const palletsComItens: Pallet[] = palletsApi.map((p, index) => ({
              cod_palete: p.cod_palete,
              stat_pale: p.stat_pale,
              itens: itensPorPalete[index]?.itens || [],
              cod_lane: p.cod_lane,
              cod_grupo: p.cod_grupo,
              num_order: p.num_order,
            }));
            setPallets(palletsComItens);
            const todosItens = palletsComItens.flatMap(p => p.itens);
            setItens(todosItens);
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

  // --Inicio das validações de montagem--

  // passa a matrícula do operador
  useEffect(() => {
    if (!matricula) {
      setErro("Matrícula não encontrada. Por favor, faça login novamente.");
    }
  }, [matricula]);

  const lastSoundTimeRef = useRef<number>(0);

  const now = Date.now();

  //som de sucesso
  if (success && success.type === 'LEITURA') {
    const audio = new Audio(successSound);
    audio.volume = 0.8;
    audio.play().catch(err => console.error('ERRO PLAY LEITURA:', err));
    lastSoundTimeRef.current = now;
    return;
  }

  //mantém a variavel caixaGDBR atualizada
  function handleCaixaGDBRChange(e: React.ChangeEvent<HTMLInputElement>) {
    const caixaGDBR = e.target.value;
    setCaixaGDBR(caixaGDBR);
  }

  //mantém a variavel caixaCliente atualizada
  function handleCaixaClienteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const caixaCliente = e.target.value;
    setCaixaCliente(caixaCliente);
  }

  // Remove espaços, tabs, quebras de linha, e normaliza Unicode
  function sanitize(input: string): string {
    return input
      .normalize('NFKC')         
      .replace(/\s+/g, '')       
      .replace(/\u0000/g, '')    
      .trim()
      .toUpperCase();
  }

  //extrai a embalagem da leitura da caixa
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

  //valida a leitura das caixas vazias
  function verificaCaixas(caixaClienteVal: string, caixaGDBRVal: string) {
    const embalagemNorm = sanitize(embalagem)
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
        `Embalagem: ${embalagem}. Todas as caixas desse item já foram lidas. `
      );

      setCaixaCliente("");
      setCaixaGDBR("");
      return;
    }

    setContagemCaixas((prev) => prev + 1);
    console.log("Caixas lidas até o momento:", contagemCaixas + 1);
    setSucess({ type: "LEITURA", message: "Leitura realizada com sucesso!" });
    setCaixaCliente("");
    setCaixaGDBR("");

    enviarVzias(
      carga?.cod_carg.toString() ?? "",
      palletAtual?.cod_palete.trim() ?? "",
      embalagem,
      "2",
      String(contagemCaixas + 1)
    );

    if (contagemCaixas === 1) {
      enviarVzias(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "1",
        String(contagemCaixas + 1)
      );
    }

    if (contagemCaixas === Number(totalCaixas)){
      enviarVzias(
        carga?.cod_carg.toString() ?? "",
        palletAtual?.cod_palete.trim() ?? "",
        embalagem,
        "3",
        String(contagemCaixas + 1)
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
        setCaixaCliente("");
        setCaixaGDBR("");
      } else {
        setErro("Falha ao atualizar o Log do Usuário.");
        setCaixaCliente("");
        setCaixaGDBR("");
      }
    } catch {
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
    codEmb:  string,
    cOperac: string,
    cQuant: string ) {

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
      console.log(resp.data)
      if (data === "Gravado com sucessoGravado com sucesso" || data === "Gravado com sucesso") {
        console.log("Enviado para a API de Log")
      } else if (data?.Erro) {
        setErro(data.Erro);
        setCaixaCliente("");
        setCaixaGDBR("");
      } else {
        setErro("Falha ao atualizar o Log do Usuário.");
        setCaixaCliente("");
        setCaixaGDBR("");
      }
    } catch {
      setErro("Erro ao conectar com a API de Log.");
      setCaixaCliente("");
      setCaixaGDBR("");
    } finally {
      setLoading(false);
    }
    
  }
  return (
    <Modal
      isOpen={!!message}
      onRequestClose={onClose}
      contentLabel="Caixas Vazias"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">Caixas Vazias!</h2>
        <p className="text-gray-700 break-words text-center">{message}</p>

        <input
          type="text"
          autoFocus
          placeholder="Caixa Cliente"
          className="border-b border-gray-400 bg-transparent px-2 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
          value={caixaCliente}
          onChange={(e) => {
            handleCaixaClienteChange(e);
            const val = e.target.value;
            setCaixaCliente(val);
            console.log("Caixa CLiente atual:", caixaCliente, val);
          }}
        />

        <input
          ref={caixaGDBRRef}
          type="text"
          placeholder="Caixa GDBR"
          className="border-b border-gray-400 bg-transparent px-2 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
          value={caixaGDBR}
          onChange={(e) => {
            handleCaixaGDBRChange(e);
            const val = e.target.value;
            setCaixaGDBR(val);

            if (caixaCliente?.trim()) {
              verificaCaixas(caixaCliente, val);
            } else {
              setErro("Informe a Caixa Cliente antes de ler a Caixa GDBR.");
            }
            console.log("Caixa GDBR lida val:", val);
            console.log("Caixa GDBR atual (state ainda não sincronizado):", caixaGDBR);
          }}

        />

        <div className="flex flex-row justify-center gap-8 w-full">
          <div className="caixas flex flex-col items-center gap-2">
            <p className="text-gray-700 font-semibold">Embalagem</p>
            <p className="text-gray-700">{}</p>
            <p className="text-gray-700">{embalagem}</p>
          </div>

          <div className="embalagem flex flex-col items-center gap-2">
            <p className="text-gray-700 font-semibold">Quantidade</p>
            <p className="text-gray-700">{totalCaixas}</p>
          </div>
        </div> 

        

        {/* <div className="w-full flex flex-col gap-4"></div>
          {itens.map((item, idx) => (
            
            <div key={idx} className="flex flex-row justify-between p-3 rounded-xl bg-gray-100 shadow">
              <div className="caixas flex flex-col items-center gap-2">
                <p className="text-gray-700 font-semibold">Embalagem</p>
                <p className="text-gray-700">{item.embalagem}</p>
              </div>

              <div className="embalagem flex flex-col items-center gap-2">
                <p className="text-gray-700 font-semibold">Quantidade</p>
                <p className="text-gray-700">{item.totalCaixas}</p>
              </div>
            </div>
          ))}
        </div> */}
        
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
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          Fechar
        </button>

      </div>
    </Modal>
  );
}