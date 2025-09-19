// import { useEffect } from "react";
// import NfcManager, { NfcTech, NfcEvents } from "react-native-nfc-manager";

// export function useNfc(onTagRead: (tagId: string) => void) {
//   useEffect(() => {
//     NfcManager.start();

//     const readTag = async () => {
//       try {
//         await NfcManager.requestTechnology(NfcTech.Ndef);
//         const tag = await NfcManager.getTag();

//         if (tag && tag.id) {
//           onTagRead(tag.id);
//         }
//       } catch (e) {
//         console.warn("Erro ao ler NFC:", e);
//       } finally {
//         try {
//           await NfcManager.cancelTechnologyRequest();
//         } catch {}
//       }
//     };

//     readTag();

//     return () => {
//       NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
//       NfcManager.setEventListener(NfcEvents.StateChanged, null);
//     };
//   }, []);
// }
import { useEffect } from "react";
import { Nfc } from "@capawesome-team/capacitor-nfc";

// ✅ Hook simples para leitura de tag (usado no Login.tsx)
export function useNfc(onTagRead: (tagId: string) => void) {
  useEffect(() => {
    let listener: any;

    const startScan = async () => {
      try {
        const { isSupported } = await Nfc.isSupported();
        if (!isSupported) {
          console.warn("NFC não suportado neste dispositivo");
          return;
        }

        const { isEnabled } = await Nfc.isEnabled();
        if (!isEnabled) {
          console.warn("NFC desativado. Peça ao usuário para ativar.");
          return;
        }

        listener = Nfc.addListener("nfcTagScanned", async (event) => {
          if (event?.nfcTag?.id) {
            onTagRead(event.nfcTag.id);
          } else {
            console.warn("Tag NFC lida sem ID válido", event);
          }
          await Nfc.stopScanSession();
        });

        await Nfc.startScanSession();
      } catch (err) {
        console.error("Erro ao iniciar NFC:", err);
      }
    };

    startScan();

    return () => {
      if (listener) {
        listener.remove();
      }
      Nfc.removeAllListeners();
    };
  }, [onTagRead]);
}
