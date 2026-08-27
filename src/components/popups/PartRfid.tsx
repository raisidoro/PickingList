import Modal from "react-modal";
import React, { useEffect, useState } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";

Modal.setAppElement("#root");

interface PartRfidPopupProps {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
  onRespond: (response: string, values?: { partLabel: string; rfid: string }) => void;
}

export default function PartRfidPopup({ isOpen, message, onClose, onRespond }: PartRfidPopupProps) {
  const [partLabel, setPartLabel] = useState<string>("");
  const [rfid, setRfid] = useState<string>("");
  const partLabelInputRef = React.useRef<HTMLInputElement>(null);
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
      setTimeout(() => partLabelInputRef.current?.focus(), 50);
    }
  }, [showModal]);

  const resetFields = () => {
    setPartLabel("");
    setRfid("");
    setErro(null);
    setSucess(null);
  };

  function handlePartLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const partLabel = e.target.value;
    setPartLabel(partLabel);
  }

  function handleRfidChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rfid = e.target.value;
    setRfid(rfid);

    const part = partLabel.trim();
    const rfidValue = rfid.trim();

    if (!part) {
      setErro("Informe o Part Label antes de continuar.");
      return;
    }

    if (!rfidValue) {
      setErro("Informe o RFID antes de continuar.");
      return;
    }

    setErro(null);
    setSucess({ type: "LEITURA", message: "Part Label e RFID validados." });
    onRespond("s", { partLabel: part, rfid: rfidValue });
    resetFields();
    setShowModal(false);
  }

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
      contentLabel="Leituras Part Label"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">Leituras Part Label + RFID</h2>
        <p className="text-gray-700 break-words text-center">{message || "Informe o Part Label e o RFID para iniciar o palete."}</p>

        <input
          ref={partLabelInputRef}
          type="text"
          autoFocus
          placeholder="Part Label"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={partLabel}
          maxLength={20}
          onChange={(e) => {
            const val = e.target.value;
            handlePartLabelChange(e);
            setPartLabel(val);
            if (erro) setErro(null);

            if(val.trim()){
              rfidInputRef.current?.focus();
            }
          }}
        />

        <input
          ref={rfidInputRef}
          type="text"
          placeholder="Rfid do palete"
          className="border-b-2 border-gray-400 bg-transparent px-2 py-2 text-lg focus:outline-none focus:border-blue-500 rounded-none w-full max-w-xs text-center"
          value={rfid}
          onChange={(e) => {
            handleRfidChange(e);
            if (erro) setErro(null);
          }}
        />

        {erro && (
          <ErrorPopup
            message={erro}
            onClose={() => {
              setErro(null);
              setSucess(null);
              setRfid("");
              setPartLabel("");
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