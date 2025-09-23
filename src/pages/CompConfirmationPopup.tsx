import Modal from "react-modal";

Modal.setAppElement("#root");

interface ConfirmationPopupProps {
  message: string | null;
  onClose: () => void;
  onRespond: (response: string) => void; 
}

export default function ConfirmationPopup({message, onClose, onRespond}: ConfirmationPopupProps) {
  return (
    <Modal
      isOpen={!!message}
      onRequestClose={onClose}
      contentLabel="Confirmação"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col gap-4">
        <p className="text-gray-700 break-words">{message}</p>

        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          onClick={() => {
            {onClose}
            onRespond("s");
          }}
        >
          SIM
        </button>

        <button
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          onClick={() => {
            {onClose}
            onRespond("n");
          }}
        >
          NÃO
        </button>
      </div>
    </Modal>
  );
}
