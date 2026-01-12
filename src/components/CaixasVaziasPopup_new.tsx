import Modal from "react-modal";

Modal.setAppElement("#root");

interface CaixasVaziasPopupProps {
  items?: Array<{ embalagem: string; caixas: number }> | null;
  message?: string | null;
  onClose: () => void;
}

export default function CaixasVaziasPopup({ items, message, onClose }: CaixasVaziasPopupProps) {
  const open = !!message || !!(items && items.length > 0);

  return (
    <Modal
      isOpen={open}
      onRequestClose={onClose}
      contentLabel="Caixas Vazias"
      className="fixed inset-0 flex items-center justify-center p-4"
      overlayClassName="fixed inset-0 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-yellow-600">Caixas Vazias</h2>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Fechar</button>
        </div>

        {message && <p className="text-gray-700">{message}</p>}

        {items && items.length > 0 ? (
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm table-auto">
              <thead>
                <tr className="text-left text-xs text-gray-600">
                  <th className="pb-2">Caixas Vazias</th>
                  <th className="pb-2">Embal.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 align-top">{it.caixas}</td>
                    <td className="py-2 align-top truncate max-w-[420px]" title={it.embalagem}>{it.embalagem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !message && <p className="text-gray-600">Nenhuma informação de caixas vazias disponível.</p>
        )}
      </div>
    </Modal>
  );
}
