import Modal from "react-modal";

Modal.setAppElement("#root");

interface CaixasVaziasPopupProps {
  message: string | null;
  onClose: () => void;
  onRespond: (response: string) => void; 
}

export default function CaixasVaziasPopup({message, onClose, }: CaixasVaziasPopupProps) {
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
        <p className="text-gray-700 break-words">{message}</p>

        <input
          type="text"
          autoFocus
          placeholder="Caixa GDBR"
          className="border-b border-gray-400 bg-transparent px-2 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
        />
        <input
          type="text"
          placeholder="Caixa Cliente"
          className="border-b border-gray-400 bg-transparent px-2 py-2 text-base focus:outline-none focus:border-blue-400 rounded-none w-full max-w-xs"
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

      </div>
    </Modal>
  );
}
