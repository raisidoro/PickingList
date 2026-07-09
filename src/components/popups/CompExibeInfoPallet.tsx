import Modal from "react-modal";

Modal.setAppElement("#root");

interface PalletDetailPopupProps {
  pallet: {
    cod_palete: string;
    num_order: string;
    cod_doca: string;
    sup_doc: string;
    cod_lane: string;
    cod_grupo: string;
    stat_pale: string;
  } | null;
  onClose: () => void;
}


export default function PalletDetailPopup({ pallet, onClose }: PalletDetailPopupProps) {
  if (!pallet) return null;

  return (
    <Modal
      isOpen={!!pallet}
      onRequestClose={onClose}
      contentLabel="Detalhes do Palete"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-blue-700 text-center mb-2">Detalhes do Palete</h2>
        <div className="mb-2">
          <span className="font-semibold">Palete:</span> {pallet.cod_palete}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Order:</span> {pallet.num_order}
        </div>
        
        <div className="mb-2">
          <span className="font-semibold">Doca:</span> {pallet.cod_doca}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Sup_doc:</span> {pallet.sup_doc}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Lane:</span> {pallet.cod_lane}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Grupo:</span> {pallet.cod_grupo}
        </div>

        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}
