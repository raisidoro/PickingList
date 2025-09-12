function PalletLido() {
  const location = useLocation();
  const navigate = useNavigate();

  const [pallets, setPallets] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [kanbanInput, setKanbanInput] = useState<string>(""); // <- estado do input

  const carga = location.state?.carga;

  useEffect(() => {
    if (!carga?.cod_carg) {
      setErro("Carga não encontrada.");
      setLoading(false);
      return;
    }

    apiPallets
      .get("/PICK_PALETE", { params: { cCarga: carga.cod_carg } })
      .then((resp) => {
        const palletsApi: any[] = Array.isArray(resp.data?.paletes)
          ? resp.data.paletes
          : [];

        if (palletsApi.length === 0) {
          setErro("Nenhum pallet encontrado.");
          setPallets([]);
          setLoading(false);
          return;
        }

        return Promise.all(
          palletsApi
            .filter((p) => !!p.cod_palete)
            .map((p) =>
              apiItens
                .get("", { params: { cCarga: carga.cod_carg, cPalet: p.cod_palete } })
                .then((respItens) => ({
                  cod_palete: p.cod_palete,
                  stat_pale: p.stat_pale,
                  itens: Array.isArray(respItens.data?.itens)
                    ? respItens.data.itens.map((it: any) => ({
                        kanban: it.kanban ?? it.Kanban ?? "-",
                      }))
                    : [],
                }))
            )
        );
      })
      .then((palletsDetalhados) => {
        if (!palletsDetalhados) return;
        setPallets(palletsDetalhados);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErro("Erro ao buscar pallets.");
        setLoading(false);
      });
  }, [carga]);

  // Handler para checar o kanban digitado
  const handleCheckKanban = () => {
    const todosKanbans = pallets.flatMap((pallet) =>
      pallet.itens.map((item: PalletItem) => item.kanban)
    );

    if (todosKanbans.includes(kanbanInput)) {
      alert("Kanban encontrado com sucesso!");
    } else {
      alert("Kanban não encontrado!");
    }
  };

  return (
    <main>
      <input
        type="text"
        value={kanbanInput}
        onChange={(e) => setKanbanInput(e.target.value)}
        placeholder="Digite o Kanban"
      />
      <button onClick={handleCheckKanban}>Verificar</button>
      {erro && <p>{erro}</p>}
    </main>
  );
}
