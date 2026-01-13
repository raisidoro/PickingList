import Modal from "react-modal";
import React, { useState, useEffect, useRef } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";
import successSound from '../sounds/success.mp3';
import { set } from "zod";

Modal.setAppElement("#root");

interface CaixasVaziasPopupProps {
  message: string | null;
  matricula?: string | null;
  onClose: () => void;
  onRespond: (response: string) => void; 
}

export default function CaixasVaziasPopup({ message, matricula, onClose }: CaixasVaziasPopupProps) {
 
  const [caixaGDBR, setCaixaGDBR] = useState("");
  const [caixaCliente, setCaixaCliente] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  type SuccessType = "LEITURA" 
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);
  const [caixaLiberada, setcaixaLiberada] = useState(false);  
  var [contagemCaixas, setContagemCaixas] = useState(0); //variavel para armazenar a contagem de caixas
  const caixaClienteRef = useRef<HTMLInputElement>(null);
  const embalagem = ""; //variavel para armazenar a embalagem
  const totalCaixas = 0; //variavel para armazenar o total de caixas no palete

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

  //foco no input caixa cliente
  useEffect(() => {
    if (caixaLiberada && caixaClienteRef.current) {
      caixaClienteRef.current.focus();
    }
  }, [caixaLiberada]);

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

  //validação se a embalagem está no palete
  // function embalagemPalete(){
  //   if (caixaGDBR !== embalagem){
  //     setErro("Embalagem não encontrada no palete.");
  //   }
  //   if (caixaGDBR === embalagem){
  //     console.log("Embalagem encontrada no palete.");
  //     if (caixaCliente === embalagem){
  //       console.log("Caixa Cliente encontrada no palete.");
  //     }
  //   }
  // }

  function extrairEmbalagem(caixa: string): string {
  if (caixa.includes(";")) {
    return caixa.split(";")[0].trim();
  }

  const match = caixa.match(/^([A-Z]+\d*)/i);
  return match ? match[1] : caixa;
}

function validarCaixas() {
  const embalagemCliente = extrairEmbalagem(caixaCliente);
  const embalagemGDBR = extrairEmbalagem(caixaGDBR);

  if (embalagemGDBR !== embalagem) {
    setErro(`Embalagem não encontrada no palete.`);
    return false;
  }
  
  if (embalagemCliente !== embalagemGDBR) {
    setErro(`Embalagens não conferem: ${embalagemCliente} / ${embalagemGDBR}`);
    return false;
  }
  
  if (caixaCliente === caixaGDBR) {

    if (contagemCaixas >= totalCaixas) {
      setErro("Todas as caixas vazias desse item já foram lidas.");
      setCaixaCliente("");
      setCaixaGDBR("");
      return;
    }

    contagemCaixas += 1; 

    if(contagemCaixas === 1){
      //atualizar status para "em montagem"
    }

    if (contagemCaixas === totalCaixas) {
      //atualizar status para "finalizado"
    }
  }

  function finalizaritem(){
    
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
          placeholder="Caixa GDBR"
          className="border-b border-gray-400 bg-transparent px-2 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
          value={caixaGDBR}
          onChange={(e) => setCaixaGDBR(e.target.value)}
        />
        <input
          ref={caixaClienteRef}
          type="text"
          placeholder="Caixa Cliente"
          className="border-b border-gray-400 bg-transparent px-2 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
          disabled
          onChange={(e) => {
            handleCaixaClienteChange(e);
            validarCaixas();
            setcaixaLiberada(false);
          }}
        />

        <div className="flex flex-row justify-center gap-8 w-full">
          <div className="caixas flex flex-col items-center gap-2">
            <p className="text-gray-700 font-semibold">Embalagem</p>
            <p className="text-gray-700">...</p>
          </div>

          <div className="embalagem flex flex-col items-center gap-2">
            <p className="text-gray-700 font-semibold">Quantidade</p>
            <p className="text-gray-700">...</p>
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
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          Fechar
        </button>

      </div>
    </Modal>
  );
}
