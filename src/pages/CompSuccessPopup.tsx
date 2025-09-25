import Modal from "react-modal";

Modal.setAppElement("#root");

interface SuccessPopupProps {
  message: string | null;
  onClose: () => void;
  onRespond: (response: string) => void;
}


export default function SuccessPopup({ message, onClose, onRespond }: SuccessPopupProps) {
  return (
    <Modal
      isOpen={!!message}
      onRequestClose={onClose}
      contentLabel="Sucess"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold text-green-600">Sucesso!</h2>
        <p className="text-gray-700 break-words">{message}</p>
        <button
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          onClick={() =>{
            {onClose}
            onRespond("OK")
          }}
          
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
