
import { useEffect } from "react";
import NfcManager, { NfcTech, NfcEvents } from "react-native-nfc-manager";

export function useNfc(onTagRead: (tagId: string) => void) {
  useEffect(() => {
    NfcManager.start();

    const readTag = async () => {
      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const tag = await NfcManager.getTag();

        if (tag && tag.id) {
          onTagRead(tag.id); 
        }
      } catch (e) {
        console.warn("Erro ao ler NFC:", e);
      } finally {
        try {
          await NfcManager.cancelTechnologyRequest();
        } catch {}
      }
    };

    
    readTag();

    return () => {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.setEventListener(NfcEvents.StateChanged, null);
    };
  }, []);
}
