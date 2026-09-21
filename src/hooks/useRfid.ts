import { useRef, useState } from "react";

export type PartRfidValues = { partLabel: string; rfid: string };
export type SkidRfidValues = { skidLabel: string; rfid: string};

export function usePartRfid() {
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = useRef<((v: PartRfidValues | null) => void) | null>(null);

  // Abre o popup e retorna uma Promise que resolve quando o usuário
  // confirma (com os valores) ou cancela (com null).
  function requestPartRfid(): Promise<PartRfidValues | null> {
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function handleRespond(response: string, values?: PartRfidValues) {
    setIsOpen(false);
    resolverRef.current?.(response === "s" && values ? values : null);
    resolverRef.current = null;
  }

  function handleClose() {
    setIsOpen(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }

  return { isOpen, requestPartRfid, handleRespond, handleClose };
}

export function useSkidRfid() {
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = useRef<((v: SkidRfidValues | null) => void) | null>(null);

  // Abre o popup e retorna uma Promise que resolve quando o usuário
  // confirma (com os valores) ou cancela (com null).
  function requestSkidRfid(): Promise<SkidRfidValues | null> {
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function handleRespond(response: string, values?: SkidRfidValues) {
    setIsOpen(false);
    resolverRef.current?.(response === "s" && values ? values : null);
    resolverRef.current = null;
  }

  function handleClose() {
    setIsOpen(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }

  return { isOpen, requestSkidRfid, handleRespond, handleClose };
9}