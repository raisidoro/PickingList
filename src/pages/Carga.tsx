import React, { useEffect, useState } from 'react';
import { type JSX } from 'react';
import { apiCarga } from '../lib/axios';  

const textVariants = {
  default: "text-xl",
  muted: "text-xl text-gray-500",
  heading: "text-xl",
  blast: "text-2xl",
  title: "text-3xl",
};

type TextProps = {
  as?: keyof JSX.IntrinsicElements;
  variant?: keyof typeof textVariants;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

function Text({
  as = "span",
  variant = "default",
  className = "",
  children,
  ...props
}: TextProps) {
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

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div 
      className={`bg-gray-100 shadow-md rounded-2xl ${className}`} 
      {...props}
    >
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

type Props = {
  onSelectCarga: (carga: Carga) => void;
};

export default function CargaList({ onSelectCarga }: Props) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selectedCod, setSelectedCod] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCargas() {
      setLoading(true);
      try {
        const resp = await apiCarga.get('/PICK_CARGA');
        setCargas(resp.data?.cargas ?? []);
        setErro(null);
      } catch (error) {
        setErro('Erro ao buscar cargas.');
      } finally {
        setLoading(false);
      }
    }

    fetchCargas();
  }, []);

  function handleSelect(carga: Carga) {
    setSelectedCod(carga.cod_carg);
    onSelectCarga(carga);
  }

  function safeTrim(value?: string) {
    return value?.trim() ?? '';
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-20 px-10 bg-gradient-to-b from-gray-200 to-gray-200">
      <Card className="w-full max-w-md p-6 mt-12 flex flex-col gap-6 shadow-lg">
        <Text as="h1" variant="blast" className="text-center mb-6 text-gray-900">
          Selecione a Carga
        </Text>

        {loading && (
          <Text className="text-center text-gray-600">Carregando cargas...</Text>
        )}

        {erro && (
          <Text className="text-center text-red-600">{erro}</Text>
        )}

        {!loading && !erro && cargas.length === 0 && (
          <Text className="text-center text-gray-600">Nenhuma carga disponível.</Text>
        )}

        <div className="flex flex-col gap-5 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {cargas.map(carga => (
            <Card
              key={carga.cod_carg}
              className={`p-6 cursor-pointer border rounded-2xl transition-shadow duration-300 ${
                selectedCod === carga.cod_carg
                  ? 'border-indigo-600 shadow-indigo-300 shadow-lg'
                  : 'border-transparent hover:shadow-md hover:border-indigo-400'
              }`}
              onClick={() => handleSelect(carga)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(carga);
                }
              }}
              aria-pressed={selectedCod === carga.cod_carg}
            >
              <Text variant="heading" className="text-lg font-semibold">
                {safeTrim(carga.cod_carg)} - {safeTrim(carga.nome_cli)}
              </Text>
              <br />
              <Text variant="default" className="text-gray-700 mt-1">
                Data de Coleta: <span className="font-medium">{safeTrim(carga.data_col)}</span>
              </Text>
              <br />
              <Text variant="default" className="text-gray-700 mt-1">
                Hora: <span className="font-medium">{safeTrim(carga.hora_col)}</span>
              </Text>
              <br />
              <Text variant="default" className="text-gray-700 mt-1">
                Paletes: <span className="font-medium">{safeTrim(carga.qtd_pale)}</span>
              </Text>
              <br />
              <Text variant="default" className="text-gray-700 mt-1">
                Status: <span className="font-medium">{safeTrim(carga.stat_col)}</span>
              </Text>
            </Card>
          ))}
        </div>
      </Card>
    </main>
  );
}
