import Modal from "react-modal";
import React, { useEffect, useState } from "react";
import ErrorPopup from "./CompErrorPopup";

Modal.setAppElement("#root");

interface PartRfidPopupProps {
  isOpen: boolean;
  message: string | null;
  onClose: () => void;
  onRespond: (response: string, values?: { partLabel: string; rfid: string }) => void;
  mode?: "normal" | "vazia";
  presetPartLabel?: string;
}

export default function PartRfidPopup({
  isOpen,
  message,
  onRespond,
  mode = "normal",
  presetPartLabel = "",
}: PartRfidPopupProps) {
  const isVazia = mode === "vazia";

  const [partLabel, setPartLabel] = useState<string>("");
  const [rfid, setRfid] = useState<string>("");
  const partLabelInputRef = React.useRef<HTMLInputElement>(null);
  const rfidInputRef = React.useRef<HTMLInputElement>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        if (isVazia) rfidInputRef.current?.focus();
        else partLabelInputRef.current?.focus();
      }, 50);
    }
  }, [showModal, isVazia]);

  const resetFields = () => {
    setPartLabel("");
    setRfid("");
    setErro(null);
  };

  function handlePartLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPartLabel(e.target.value);
  }

  function handleRfidChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rfidDigitado = e.target.value;
    setRfid(rfidDigitado);

    const part = (isVazia ? presetPartLabel : partLabel).trim();
    const rfidValue = rfidDigitado.trim();

    if (!part) {
      setErro(
        isVazia
          ? "Part Label da caixa vazia não encontrado. Leia a Caixa Cliente novamente."
          : "Informe o Part Label antes de continuar."
      );
      return;
    }

    if (!rfidValue) {
      setErro("Informe o RFID antes de continuar.");
      return;
    }

    setErro(null);
    onRespond("s", { partLabel: part, rfid: rfidValue });
    resetFields();
    setShowModal(false);
  }

  return (
    <Modal
      isOpen={showModal}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      contentLabel={isVazia ? "Leitura RFID Caixa Vazia" : "Leituras Part Label"}
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-blue-600 text-center">
          {isVazia ? "Leitura RFID" : "Leituras Part Label + RFID"}
        </h2>
        <p className="text-gray-700 break-words text-center">
          {message || (isVazia ? "Informe o RFID da caixa vazia." : "Informe o Part Label e o RFID.")}
        </p>

        {isVazia ? (
          <div className="w-full max-w-xs text-center">
            <p className="text-xs text-gray-500">Part Label (Caixa Cliente)</p>
            <p className="text-sm font-semibold text-gray-800 break-all">{presetPartLabel}</p>
          </div>
        ) : (
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
              if (erro) setErro(null);
              if (val.trim()) rfidInputRef.current?.focus();
            }}
          />
        )}

        <input
          ref={rfidInputRef}
          type="text"
          autoFocus={isVazia}
          placeholder="Rfid da caixa"
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
              setRfid("");
              setPartLabel("");
            }}
          />
        )}
      </div>
    </Modal>
  );
}