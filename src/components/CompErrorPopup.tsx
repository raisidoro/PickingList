import Modal from "react-modal";
import useSound from 'use-sound';
import React from "react";
import errorSound from '../sounds/error.mp3';

Modal.setAppElement("#root");

interface ErrorPopupProps {
  message: string | null;
  onClose: () => void;
}


export default function ErrorPopup({ message, onClose }: ErrorPopupProps) {
  const [playError] = useSound(errorSound);

  React.useEffect(() => {
    if (message) {
      playError();
    }
  }, [message, playError]);

  return (
    <Modal
      isOpen={!!message}
      onRequestClose={onClose}
      contentLabel="Erro"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold text-red-600">Erro!</h2>
        <p className="text-gray-700 break-words">{message}</p>
        <button
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}
