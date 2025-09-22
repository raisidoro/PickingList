import { NFC } from "@capawesome-team/capacitor-nfc";

export function NFCReader() {
  const checkNfc = async () => {
    try {
      const result = await NFC.isEnabled();
      console.log("NFC ativado?", result);
      return result;
    } catch (error) {
      console.error("Erro ao verificar NFC:", error);
      return false;
    }
  };

  const startReading = async (onTagRead: (tagId: string) => void) => {
    try {
      await NFC.startScan();

      const listener = NFC.addListener("nfcTagDiscovered", (event: any) => {
        console.log("Tag detectada:", event);

        // Extrai o ID da tag (pode variar conforme a tag)
        const tagId = event.tag?.id || "Desconhecido";
        console.log("ID do crachá:", tagId);

        // Chama callback passando o ID lido
        if (onTagRead) onTagRead(tagId);

        // Para a leitura após detectar a tag (opcional)
        NFC.stopScan();
        listener.remove();
      });
    } catch (error) {
      console.error("Erro ao iniciar leitura NFC:", error);
    }
  };

  return { checkNfc, startReading };
}
