import React, { useEffect, useState } from 'react';
import { type JSX } from 'react';
import { apiCarga } from '../lib/axios';
import { SlArrowLeftCircle } from "react-icons/sl";
import { CiFilter } from "react-icons/ci";
import { useNavigate } from "react-router-dom";


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
  handleSelectCarga?: (carga: Carga) => void;
};


export default function CargaList({ }: Props) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selectedCod, setSelectedCod] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();


  useEffect(() => {
    async function fetchCargas() {
      setLoading(true);
      try {
        const resp = await apiCarga.get('');
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
    navigate('/pallets', { state: { carga } });
  }


  function safeTrim(value?: string) {
    return value?.trim() ?? '';
  }


  const cargasFiltradas = cargas.filter((carga) => {
    const busca = searchTerm.toLowerCase();
    return (
      safeTrim(carga.cod_carg).toLowerCase().includes(busca) ||
      safeTrim(carga.nome_cli).toLowerCase().includes(busca) ||
      safeTrim(carga.data_col).toLowerCase().includes(busca) ||
      safeTrim(carga.hora_col).toLowerCase().includes(busca) ||
      safeTrim(carga.stat_col).toLowerCase().includes(busca)
    );
  });


  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-20 px-6 bg-gradient-to-b from-gray-200 to-gray-300">
      <Card className="w-full max-w-lg p-6 mt-12 flex flex-col gap-6 shadow-lg bg-white rounded-3xl">
        <Text variant="muted" className="text-center mb-4 text-gray-900">
          <span onClick={() => navigate('/Login')} >
            <SlArrowLeftCircle className="text-gray-500 w-6 h-6 mx-2" />
          </span>
        </Text>
        <Text as="h1" variant="blast" className="text-center mb-6 text-gray-900">
          Selecione a Carga
        </Text>


        <div className="flex items-center mb-4 border border-gray-300 rounded-xl overflow-hidden focus-within:border-gray-600 transition-colors bg-white shadow">
          <input
            type="text"
            placeholder="Buscar cargas..."
            className="flex-grow px-5 py-2 text-gray-800 placeholder-gray-400 bg-white focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar cargas"
          />
          {searchTerm && (
            <button
              aria-label="Limpar busca"
              onClick={() => setSearchTerm('')}
              className="px-3 py-2 text-gray-500 hover:text-gray-900 bg-white"
              title="Limpar busca"
            >
              ×
            </button>
          )}
          <CiFilter className="text-gray-500 w-6 h-6 mx-2" />
        </div>


        {loading && (
          <Text className="text-center text-gray-600">Carregando cargas...</Text>
        )}


        {erro && (
          <Text className="text-center text-red-600">{erro}</Text>
        )}


        {!loading && !erro && cargasFiltradas.length === 0 && (
          <Text className="text-center text-gray-600">Nenhuma carga disponível para o filtro informado.</Text>
        )}


        <div className="flex flex-col gap-5 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {cargasFiltradas.map((carga) => (
            <Card
              key={carga.cod_carg}
              className={`p-6 cursor-pointer border rounded-2xl transition-shadow duration-300 ${
                selectedCod === carga.cod_carg
                  ? 'border-black-600 shadow-black-300 shadow-lg'
                  : 'border-transparent hover:shadow-md hover:border-black-400'
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
              <Text variant="heading" className="text-lg font-semibold text-black-700">
                {safeTrim(carga.cod_carg)} - {safeTrim(carga.nome_cli)}
              </Text>
              <Text variant="default" className="text-gray-700 mt-2 whitespace-pre-line">
                <span className="block">
                  <strong>Data de Coleta:</strong> {safeTrim(carga.data_col)}
                </span>
                <span className="block">
                  <strong>Hora:</strong> {safeTrim(carga.hora_col)}
                </span>
                <span className="block">
                  <strong>Paletes:</strong> {safeTrim(carga.qtd_pale)}
                </span>
                <span className="block">
                  <strong>Status:</strong> {safeTrim(carga.stat_col)}
                </span>
              </Text>
            </Card>
          ))}
        </div>
      </Card>
    </main>
  );
}
