import Modal from "react-modal";
import React, { useEffect, useState } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";

Modal.setAppElement("#root");

interface SkidRfidPopupProps {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
  onRespond: (response: string, values?: { partLabel: string; rfid: string }) => void;
}

export default function SkidRfidPopup({ isOpen, message, onClose, onRespond }: SkidRfidPopupProps) {
  const [partLabel, setPartLabel] = useState<string>("");
  const [rfid, setRfid] = useState<string>("");
  const skidLabelInputRef = React.useRef<HTMLInputElement>(null);
  const rfidInputRef = React.useRef<HTMLInputElement>(null);

  const [erro, setErro] = useState<string | null>(null);
  type SuccessType = "LEITURA";
  const [success, setSucess] = useState<{ type: SuccessType; message: string } | null>(null);

  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => skidLabelInputRef.current?.focus(), 50);
    }
  }, [showModal]);

  const resetFields = () => {
    setPartLabel("");
    setRfid("");
    setErro(null);
    setSucess(null);
  };

  const handleRfid = () => {
    const part = partLabel.trim();
    const rfidValue = rfid.trim();

    if (!part) {
      setErro("Informe o Skid Label antes de continuar.");
      return;
    }

    if (!rfidValue) {
      setErro("Informe o RFID antes de continuar.");
      return;
    }

    setErro(null);
    setSucess({ type: "LEITURA", message: "Skid Label e RFID validados." });
    onRespond("s", { partLabel: part, rfid: rfidValue });
    resetFields();
    setShowModal(false);
  };

  const handleClose = () => {
    resetFields();
    setShowModal(false);
    onClose();
  };

  console.log("PartLabel: ", partLabel);
  console.log("RFID: ", rfid);

  return (
    <Modal
      isOpen={showModal}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      contentLabel="Leituras Skid Label"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">Leituras Skid Label + RFID</h2>
        <p className="text-gray-700 break-words text-center">{message || "Informe o Skid Label e o RFID para iniciar o palete."}</p>

        <input
          ref={skidLabelInputRef}
          type="text"
          autoFocus
          placeholder="Skid Label"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={partLabel}
          maxLength={20}
          onChange={(e) => setPartLabel(e.target.value)}
        />

        <input
          ref={rfidInputRef}
          type="text"
          placeholder="Rfid do palete"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={rfid}
          onChange={(e) => {
            setRfid(e.target.value);
            handleRfid();
          }}
        />

        {erro && (
          <ErrorPopup
            message={erro}
            onClose={() => {
              setErro(null);
            }}
          />
        )}

        {success && (
          <SuccessPopup
            message={success.message}
            onClose={() => {
              setSucess(null);
            }}
            onRespond={() => {
              setSucess(null);
            }}
          />
        )}
      </div>
    </Modal>
  );
}