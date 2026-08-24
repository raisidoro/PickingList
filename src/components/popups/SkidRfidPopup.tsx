import Modal from "react-modal";
import React, { useEffect, useState } from "react";
import ErrorPopup from "./CompErrorPopup";
import SuccessPopup from "./CompSuccessPopup";

Modal.setAppElement("#root");

interface SkidRfidPopupProps {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
  onRespond: (response: string, values?: { skidLabel: string; rfid: string }) => void;
}

export default function SkidRfidPopup({ isOpen, message, onClose, onRespond }: SkidRfidPopupProps) {
  const [skidLabel, setSkidLabel] = useState<string>("");
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
    setSkidLabel("");
    setRfid("");
    setErro(null);
    setSucess(null);
  };

    function handleSkidLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
        const skidLabel = e.target.value;
        setSkidLabel(skidLabel);
    }

    function handleRfidChange(e: React.ChangeEvent<HTMLInputElement>) {
        const rfid = e.target.value;
        setRfid(rfid);


        const skid = skidLabel.trim();
        const rfidValue = rfid.trim();

        if (!skid) {
        setErro("Informe o Skid Label antes de continuar.");
        return;
        }

        if (!rfidValue) {
        setErro("Informe o RFID antes de continuar.");
        return;
        }

        setErro(null);
        setSucess({ type: "LEITURA", message: "Skid Label e RFID validados." });
        onRespond("s", { skidLabel: skid, rfid: rfidValue });
        resetFields();
        setShowModal(false);
  };

  const handleClose = () => {
    resetFields();
    setShowModal(false);
    onClose();
    }

  console.log("SkidLabel: ", skidLabel);
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
          value={skidLabel}
          maxLength={20}
          onChange={(e) => {
            const val = e.target.value;
            handleSkidLabelChange(e);
            setSkidLabel(val);
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
            const val = e.target.value;
            handleRfidChange(e);
            setRfid(val);
            if (erro) setErro(null);

          }}
        />

        <div className="flex w-full gap-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            onClick={handleClose}
          >
            Cancelar
          </button>
        </div>

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