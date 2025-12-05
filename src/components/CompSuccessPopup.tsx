import Modal from "react-modal";
import { useEffect } from "react";

Modal.setAppElement("#root");

interface SuccessPopupProps {
  message: string | null;
  onClose: () => void;
  onRespond?: () => void;
}

export default function SuccessPopup({ message, onClose }: SuccessPopupProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <Modal
      isOpen={true}
      onRequestClose={onClose}
      contentLabel="Sucesso"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold text-green-600">Sucesso!</h2>
        <p className="text-gray-700 break-words">{message}</p>
      </div>
    </Modal>
  );
}
