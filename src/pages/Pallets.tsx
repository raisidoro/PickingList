import React, { useEffect, useState } from 'react';
import { apiCarga, apiItens, apiPallets } from '../lib/axios';
import { SlArrowLeftCircle } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";
import { type JSX } from 'react';


const textVariants = {
  default: "text-xl",
  muted: "text-xl text-gray-500",
  heading: "text-xl",
  blast: "text-2xl",
  title: "text-3xl",
} as const;

type Variant = keyof typeof textVariants;

type TextProps = {
  as?: keyof JSX.IntrinsicElements;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

function Text({ as = "span", variant = "default", className = "", children, ...props }: TextProps) {
  const Component = as;
  return React.createElement(
    Component,
    {
      className: `${textVariants[variant]} ${className}`,
      ...props,
    },
    children
  );
}

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
};

function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-gray-100 shadow-md rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface Carga {
  cod_carg: string;
  cod_cli: string;
  nome_cli: string;
  data_col: string;
  hora_col: string;
  qtd_pale: string;
  stat_col: string;
}

interface PalletApi {
  cod_palete: string;
  num_order: string;
  cod_doca: string;
  sup_doc: string;
  cod_grupo: string;
  cod_lane: string;
  stat_pale: string;
}

interface PalletItem {
  kanban: string;
  sequen: string;
  qtd_caixa: string;
  qtd_peca: string;
  embalagem: string;
  multiplo: string;
  status: string;
}

interface Pallet {
  cod_palete: string;
  itens: PalletItem[];
}

export default function PalletViewSingle() {
  const navigate = useNavigate();
  const location = useLocation();
  const carga = location.state?.carga as Carga | undefined;

  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [palletIndex, setPalletIndex] = useState(0);

  if (!carga) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <span className="text-red-600">Carga não informada!</span>
      </main>
    );
  } 

  useEffect(() => {
    setLoading(true);
    setErro(null);

    apiPallets.get('/PICK_PALETE', { params: { cCarga: carga.cod_carg } })
      .then(resp => {
        const palletsApi: PalletApi[] = Array.isArray(resp.data?.paletes) ? resp.data.paletes : [];

        if (palletsApi.length === 0) {
          setErro("Nenhum pallet encontrado.");
          setPallets([]);
          setLoading(false);
          return;
        }

        Promise.all(
          palletsApi.map((p: PalletApi) =>
            apiItens.get('', { params: { cCarga: carga.cod_carg, cPalet: p.cod_palete } })
              .then(respItens => ({
                cod_palete: p.cod_palete,
                itens: Array.isArray(respItens.data?.itens)
                  ? respItens.data.itens.map((it: any) => ({
                    kanban: it.kanban ?? it.Kanban ?? '-',
                    qtd: Number(it.qtd ?? it.Qtd ?? 1),
                    status: it.status ?? 'Concluido',
                  }))
                  : [],
              }))
          )
        )
          .then(palletsDetalhados => {
            setPallets(palletsDetalhados);
          })
          .catch(() => setErro('Erro ao buscar itens dos pallets.'))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setErro('Erro ao carregar pallets.');
        setPallets([]);
        setLoading(false);
      });

  }, [carga]);

  const palletAtual = pallets.length > 0 ? pallets[palletIndex] : undefined;
  const totalPallets = pallets.length;

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-20 px-6 bg-gradient-to-b from-gray-200 to-gray-300">
      <Card className="w-full max-w-md p-6 mt-12 flex flex-col gap-2 shadow-lg bg-white rounded-3xl">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate('/cargas')} className="focus:outline-none" title="Voltar">
            <SlArrowLeftCircle className="text-gray-500 w-6 h-6" />
          </button>
          <Text as="span" variant="muted" className="text-sm text-gray-900">
            <b>Carga:</b> {carga.cod_carg} – {carga.nome_cli} – {carga.data_col} – {carga.hora_col}
          </Text>
        </div>

        {loading && <Text className="text-center text-gray-600">Carregando pallets...</Text>}
        {erro && <Text className="text-center text-red-600">{erro}</Text>}

        {!loading && !erro && palletAtual && (
          <><div className="bg-white rounded-xl px-3 py-2 border shadow-inner flex flex-col gap-2">
            <div className="text-base font-bold text-center">
              Pallet {String(palletIndex + 1).padStart(2, '0')}/{totalPallets.toString().padStart(2, '0')}
            </div>
            <ul className="mb-2">
              {palletAtual.itens.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center text-base py-0.5">
                  <span>
                    <span className="mr-1">{item.kanban}</span>
                    if (item.status == '0') {
                     <span className="text-red-600 font-semibold">Pendente</span>
                    } else if (item.status == '1') {
                      <span className="text-yellow-600 font-semibold">Em Montagem</span>
                    } else {
                      <span className="text-green-600 font-semibold">Concluido</span>
                    }
                  </span>
                </li>
              ))}
            </ul>
            <div className="text-center font-bold text-orange-700 text-lg mt-2">PALETE EM MONTAGEM</div>
          </div>
          <div className="flex justify-between mt-2">
              <button
                className="rounded px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                disabled={palletIndex === 0}
                onClick={() => setPalletIndex(i => Math.max(i - 1, 0))}
              >
                Anterior
              </button>
              <button
                className="rounded px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
                disabled={palletIndex === totalPallets - 1}
                onClick={() => setPalletIndex(i => Math.min(i + 1, totalPallets - 1))}
              >
                Próximo
              </button>
            </div></>
        )}
      </Card>
    </main>
  );
}
