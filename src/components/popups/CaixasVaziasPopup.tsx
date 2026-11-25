import Modal from "react-modal";
import { useEffect, useState, useRef } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";
import successSound from '../../sounds/success.mp3';
import { apiPallets, apiLog, apiVzias } from "../../lib/axios";
import { useLocation } from "react-router-dom";
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

export default function CaixasVaziasPopup({ message, matricula, onClose, palletIndex }: CaixasVaziasPopupProps) {
  const [embalagem, setEmbalagem] = useState<string>("");
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [, setTotalCaixas] = useState<number>(0);
  const location = useLocation();
  const [caixaCliente, setCaixaCliente] = useState("");
  const carga = location.state?.carga as Carga | undefined;
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const palletIndexFinal = palletIndex ?? 0;
  const palletAtual = pallets.length > 0 ? pallets[palletIndexFinal] : undefined;
  const [erro, setErro] = useState<string | null>(null);
  type SuccessType = "LEITURA";
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);
  const [, setLoading] = useState(false);
  const [contagemCaixas, setContagemCaixas] = useState(0);
  const caixaClienteRef = useRef<HTMLInputElement>(null);
  const processandoRef = useRef(false);
  const dataAtual = new Date();
  const dataformatada =
    dataAtual.getFullYear().toString() +
    String(dataAtual.getMonth() + 1).padStart(2, "0") +
    String(dataAtual.getDate()).padStart(2, "0");
  const horaformatada = dataAtual.toTimeString().slice(0, 8);
  const [vaziasItens, setVaziasItens] = useState<VaziaItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const vaziasItensRef = useRef<VaziaItem[]>([]);

  useEffect(() => {
    vaziasItensRef.current = vaziasItens;
  }, [vaziasItens]);

  // Carrega informações na montagem do componente
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setErro(null);
      setShowModal(false);

      if (!carga) {
        setErro("Carga não encontrada.");
        setLoading(false);
        return;
      }

      try {
        const respPallets = await apiPallets.get("/PICK_PALETE", {
          params: { cCarga: carga.cod_carg }
        });

        const palletsApi: PalletApi[] = Array.isArray(respPallets.data?.paletes) ? respPallets.data.paletes : [];

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

        const palletAtualLocal = palletsApi[palletIndexFinal];
        if (palletAtualLocal) {
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

  // Recarrega vazias a cada vez que o pallet muda
  useEffect(() => {
    if (palletAtual && carga) {
      carregarVaziasItens(carga.cod_carg, palletAtual.cod_palete);
    }
  }, [palletAtual?.cod_palete, carga]);

  const carregarVaziasItens = async (codCarga: string, codPalete: string) => {
    try {
      const response = await apiVzias.get("/PICK_VZIA", {
        params: { cCarga: codCarga, cPalet: codPalete }
      });

      if (response.data?.error && response.data.error.includes("Registro(s) não encontrado(s)")) {
        setShowModal(false);
        return;
      }

      const itensVazios: VaziaItem[] = Array.isArray(response.data?.itens)
        ? response.data.itens.map((item: any) => ({
          cod_emb: item.cod_emb ?? "-",
          qtd_total: Number(item.qtd_total ?? "-"),
          status: String(item.status ?? "0"),
          qtd_restante: Number(item.qtd_restante ?? "0"),
        }))
        : [];

      if (itensVazios.length > 0) {
        setVaziasItens(itensVazios);

        setContagens(prev => {
          const novo = { ...prev };
          for (const it of itensVazios) {
            novo[it.cod_emb] = it.qtd_total - it.qtd_restante;
          }
          return novo;
        });

        setShowModal(true);
        const currentItem = itensVazios.find(item => item.status !== "3");
        if (currentItem) {
          setEmbalagem(currentItem.cod_emb);
          setTotalCaixas(currentItem.qtd_total);
          setContagemCaixas(0);
        } else {
          setShowModal(false);
        }
      } else {
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

  function sanitize(input: string): string {
    return input
      .normalize('NFKC')
      .replace(/\s+/g, '')
      .replace(/\u0000/g, '')
      .trim()
      .toUpperCase();
  }

  function isClienteFormatoValido(etiqueta: string): boolean {
    const s = sanitize(etiqueta);
    if (!s.includes(";")) return false;
    const primeira = s.split(";")[0];
    return primeira.length > 0 && s !== primeira;
  }

  function extrairEmbalagem(caixa: string, embalagemEsperada: string): string | null {
    if (!caixa) return null;

    const caixaNorm = sanitize(caixa);
    const embalagemNorm = sanitize(embalagemEsperada);

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

  function Embalagem(caixaClienteVal: string): string | null {
    for (const it of vaziasItens) {
      const emb = sanitize(it.cod_emb);
      if (extrairEmbalagem(caixaClienteVal, emb) === emb) return it.cod_emb;
    }
    return null;
  }

  // Agora recebe só a etiqueta cliente (que também é o RFID)
  function verificaCaixas(caixaClienteVal: string) {
    const etiqueta = caixaClienteVal.trim();
    if (!etiqueta) return false;

    if (!isClienteFormatoValido(etiqueta)) {
      setErro("Formato de etiqueta da Caixa Cliente inválido.");
      setCaixaCliente("");
      return false;
    }

    const alvo = Embalagem(etiqueta);
    if (!alvo) {
      setErro("Embalagem não pertence ao palete.");
      atualizarOp(
        carga?.cod_carg ?? "",
        palletAtual?.cod_palete?.trim() ?? "",
        embalagem,
        "8",
        dataformatada,
        horaformatada,
        String(matricula ?? ""),
        etiqueta,
        etiqueta,
        "2",
        "Leitura inválida: embalagem não encontrada"
      );
      setCaixaCliente("");
      return false;
    }

    // não aceitamos apenas a embalagem na leitura do cliente
    if (sanitize(etiqueta) === sanitize(alvo)) {
      setErro("Etiqueta inválida, informe a etiqueta completa!");
      setCaixaCliente("");
      return false;
    }

    setEmbalagem(alvo);

    const skid = ultimoSkidRegistrado(carga!.cod_carg);
    if (!skid) {
      setErro("Skid do palete não encontrado neste dispositivo. Não é possível registrar a leitura.");
      setCaixaCliente("");
      return false;
    }

    leituracaixa(alvo, etiqueta, skid);
    return true;
  }

  async function leituracaixa(
    embalagemAlvo: string,
    caixaClienteVal: string,
    skid: { skidLabel: string; rfid: string }
  ) {
    if (processandoRef.current) return;
    processandoRef.current = true;

    try {
      const itemAlvo = vaziasItensRef.current?.find(i => i.cod_emb === embalagemAlvo);
      if (!itemAlvo) {
        setErro("Item não encontrado no palete.");
        setCaixaCliente("");
        return;
      }

      const total = Number(itemAlvo.qtd_total ?? 0);
      const lidasAtuais = contagens[embalagemAlvo] ?? 0;

      if (lidasAtuais >= total) {
        setErro("Todas as caixas já foram lidas para este item.");

        atualizarOp(
          carga?.cod_carg ?? "",
          palletAtual?.cod_palete?.trim() ?? "",
          embalagemAlvo,
          "4",
          dataformatada,
          horaformatada,
          String(matricula ?? ""),
          caixaClienteVal,
          caixaClienteVal,
          "2",
          `Embalagem: ${embalagemAlvo}. Todas as caixas desse item já foram lidas.`
        );
        setCaixaCliente("");
        return;
      }

      const novaContagem = lidasAtuais + 1;
      setContagens(prev => ({ ...prev, [embalagemAlvo]: novaContagem }));

      setVaziasItens(prev => prev.map(it => it.cod_emb === embalagemAlvo ? { ...it, qtd_restante: it.qtd_total - novaContagem } : it));

      const sucessoVzias = await enviarVzias(
        carga?.cod_carg ?? "",
        palletAtual?.cod_palete?.trim() ?? "",
        embalagemAlvo,
        "2",
        String(novaContagem)
      );

      if (!sucessoVzias) {
        setContagens(prev => ({ ...prev, [embalagemAlvo]: lidasAtuais }));
        setVaziasItens(prev => prev.map(it => it.cod_emb === embalagemAlvo ? { ...it, qtd_restante: it.qtd_total - lidasAtuais } : it));
        setCaixaCliente("");
        return;
      }

      try {
        await jsonToyota(
          carga!.cod_carg,
          skid.rfid,
          skid.skidLabel,
          caixaClienteVal,  // RFID da caixa
          caixaClienteVal   // etiqueta cliente
        );
        setSucess({ type: "LEITURA", message: "Leitura realizada com sucesso!" });
      } catch (jsonError) {
        console.error("Falha ao gravar leitura de caixa vazia no arquivo JSON local:", jsonError);
        setErro("Leitura gravada no servidor, mas houve falha ao gerar o arquivo local. Verifique.");
      }

      // Primeira caixa do item
      if (novaContagem === 1) {
        const sucessoPrimeira = await enviarVzias(
          carga?.cod_carg ?? "",
          palletAtual?.cod_palete?.trim() ?? "",
          embalagemAlvo,
          "1",
          String(novaContagem)
        );

        if (sucessoPrimeira) {
          await atualizarOp(
            carga?.cod_carg ?? "",
            palletAtual?.cod_palete?.trim() ?? "",
            embalagemAlvo,
            "8",
            dataformatada,
            horaformatada,
            String(matricula ?? ""),
            caixaClienteVal,
            caixaClienteVal,
            "1",
            `Item ${embalagemAlvo} do Pallet ${palletAtual?.cod_palete} da carga ${carga?.cod_carg} iniciado pelo operador ${matricula}`
          );

          setVaziasItens(prev => prev.map(it => it.cod_emb === embalagemAlvo ? { ...it, status: "1" } : it));
        }
      }

      if (novaContagem === total) {
        const sucessoFinal = await enviarVzias(
          carga?.cod_carg ?? "",
          palletAtual?.cod_palete?.trim() ?? "",
          embalagemAlvo,
          "3",
          String(novaContagem)
        );

        if (sucessoFinal) {
          await atualizarOp(
            carga?.cod_carg ?? "",
            palletAtual?.cod_palete?.trim() ?? "",
            embalagemAlvo,
            "8",
            dataformatada,
            horaformatada,
            String(matricula ?? ""),
            caixaClienteVal,
            caixaClienteVal,
            "1",
            `Caixa ${embalagemAlvo} do Pallet ${palletAtual?.cod_palete} da carga ${carga?.cod_carg} concluido pelo operador ${matricula}`
          );

          setVaziasItens(prev => {
            const updatedItens = prev.map(it =>
              it.cod_emb === embalagemAlvo ? { ...it, status: "3" } : it
            );

            const proximoItem = updatedItens.find(it => it.status !== "3");

            if (proximoItem) {
              setEmbalagem(proximoItem.cod_emb);
              setContagemCaixas(0);
              setContagens(p => ({ ...p, [proximoItem.cod_emb]: 0 }));
            } else {
              setSucess({ type: "LEITURA", message: "Todas as caixas vazias foram lidas com sucesso!" });
              setTimeout(() => onClose(true), 2000);
            }

            return updatedItens;
          });
        }
      }

      if (novaContagem <= total) {
        await atualizarOp(
          carga?.cod_carg ?? "",
          palletAtual?.cod_palete?.trim() ?? "",
          embalagemAlvo,
          "8",
          dataformatada,
          horaformatada,
          String(matricula ?? ""),
          caixaClienteVal,
          caixaClienteVal,
          "1",
          `Caixa ${embalagemAlvo} do Pallet ${palletAtual?.cod_palete} da carga ${carga?.cod_carg} lida com sucesso pelo operador ${matricula}`
        );
      }

      setCaixaCliente("");
    } finally {
      processandoRef.current = false;
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

      if (data === "Gravado com sucessoGravado com sucesso" || data === "Gravado com sucesso" || (httpOk && !data?.Erro)) {
        setCaixaCliente("");
      } else if (data?.Erro) {
        console.error("LOG erro:", data.Erro);
        setErro(data.Erro);
        setCaixaCliente("");
      } else {
        console.error("LOG falhou:", data);
        setErro("Falha ao atualizar o Log do Usuário.");
        setCaixaCliente("");
      }
    } catch (error) {
      if (contagemCaixas > 0) {
        setContagemCaixas(contagemCaixas - 1);
      }
      console.error("Erro API Log:", error);
      setErro("Erro ao conectar com a API de Log.");
      setCaixaCliente("");
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
    try {
      setLoading(true);
      const resp = await apiVzias.post("", {
        codCarg, codPale, codEmb, cOperac, cQuant
      });

      if (resp.status >= 200 && resp.status < 300 &&
        (resp.data === "Gravado com sucesso" || resp.data === "Gravado com sucessoGravado com sucesso")) {
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
      setCaixaCliente("");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string | undefined) {
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
        const allFinalized = vaziasItens.every(item => item.status === "3");
        if (allFinalized) {
          onClose(true);
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

        <input
          ref={caixaClienteRef}
          type="text"
          autoFocus
          placeholder="Caixa Cliente"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={caixaCliente}
          onChange={(e) => {
            setCaixaCliente(e.target.value);
            if (erro) setErro(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              verificaCaixas(caixaCliente);
            }
          }}
        />

        <div className="w-full max-w-xs mx-auto">
          {vaziasItens.length > 0 && (
            <p className="text-center text-gray-700 font-semibold text-xs mb-2">Embalagem | Total | Lidas</p>
          )}
          <div className="flex flex-col items-center gap-1.5">
            {vaziasItens.map((item, index) => (
              <div key={index} className={`flex items-center justify-center h-11 ${getStatusColor(item.status)} rounded-full px-3 py-2.5`}>
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
              setCaixaCliente("");
              caixaClienteRef.current?.focus();
            }}
          />
        )}

        {success && (
          <SuccessPopup
            message={success.message}
            onClose={() => {
              setSucess(null);
              caixaClienteRef.current?.focus();
            }}
            onRespond={() => {
              setSucess(null);
              caixaClienteRef.current?.focus();
            }}
          />
        )}
      </div>
    </Modal>
  );
}