import React, { useEffect, useState } from "react";
import { type JSX } from "react";
import { apiCarga } from "../lib/axios";
import { MdArrowBack } from "react-icons/md";
import { CiFilter } from "react-icons/ci";
import { IoEyeSharp } from 'react-icons/io5';
import { TfiReload } from "react-icons/tfi";
import { useNavigate } from "react-router-dom";
import ErrorPopup from "../components/CompErrorPopup.tsx";
import ConfirmationPopup from "../components/CompConfirmationPopup.tsx";

const textVariants = {
  default: "text-xl sm:text-2xl",
  muted: "text-xl sm:text-2xl text-gray-500",
  heading: "text-xl sm:text-2xl",
  blast: "text-2xl sm:text-3xl",
  title: "text-3xl sm:text-4xl",
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
  handleSelectCarga?: (carga: Carga) => void;
};

function getStatusText(code: string) {
  switch (code) {
    case "0":
      return "Pendente";
    case "1":
      return "Em montagem";
    case "2":
      return "Concluída com divergência";
    case "3":
      return "Concluída";
    default:
      return code;
  }
}

export default function CargaList({}: Props) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selectedCod, setSelectedCod] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const navigate = useNavigate();
  const [Confirm, setConfirm] = useState<string | null>(null);
  const [success, setSucess] = useState<string | null>(null);

  async function confirmaCarga(response: string, selectedCod: string | null) {
    if (response === "s" && selectedCod) {
      const cargaSelecionada = cargas.find(
        (c) => c.cod_carg === selectedCod
      );
      if (cargaSelecionada) {
        navigate("/Pallets", { state: { carga: cargaSelecionada } });
      }

      try {
        setLoading(true);

        const resp = await apiCarga.post("", { 
          "codCarg": cargaSelecionada?.cod_carg,
          "status": "1" });
        console.log(resp)
        const data = resp.data;


        console.log("cCarga : " + data.codCarg + "status: " + data.status)
        if (data && data.cCarga && data.status) {
          setSucess(`Deu certo eba!`);
          console.log("Emviado pra API");
        } else if (data && data.Erro) {
          setErro(data.Erro);
        } else {
          setErro("Falha ao atualizar status da carga.");
        }
      } catch (err) {
        setErro("Erro ao conectar com a API.");
      } finally {
        setLoading(false);
      }
    }
  }


  function safeTrim(value?: string) {
    return value?.trim() ?? "";
  }

  const statusOptions = [
  { code: "0", label: "Pendente" },
  { code: "1", label: "Em conferência" },
  { code: "2", label: "Divergente" },
  { code: "3", label: "Conferida" }
];


  const cargasFiltradas = cargas.filter((carga) => {
    const busca = searchTerm.toLowerCase();
    const matchSearch =
      safeTrim(carga.cod_carg).toLowerCase().includes(busca) ||
      safeTrim(carga.nome_cli).toLowerCase().includes(busca) ||
      safeTrim(carga.data_col).toLowerCase().includes(busca) ||
      safeTrim(carga.hora_col).toLowerCase().includes(busca) ||
      safeTrim(carga.stat_col).toLowerCase().includes(busca);
    const matchStatus =
      selectedStatus.length === 0 ||
      selectedStatus.includes(String(safeTrim(carga.stat_col)));
    return matchSearch && matchStatus;
  });

  function handleSelect(carga: Carga) {
    if(carga.stat_col == "0"){
      setConfirm(null);
      setSelectedCod(carga.cod_carg)
      setConfirm(`Deseja iniciar a carga selecionada para o cliente ${carga.nome_cli} com data de coleta para ${carga.data_col} as ${carga.hora_col}?`);
    }else{
      navigate("/Pallets", { state: { carga } })
    }
  }

  // Handle confirming filter selection and hiding filter box
  function applyFilter() {
    setShowStatusFilter(false);
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    async function fetchCargas() {
      setLoading(true);
      try {
        const resp = await apiCarga.get("");
        setCargas(resp.data?.cargas ?? []);
        setErro(null);
      } catch (error) {
        setErro("Erro ao buscar cargas.");
      } finally {
        setLoading(false);
      }
    }
    fetchCargas();
  }, []);

  return (
    <main
      className="
      fixed inset-0 flex items-center justify-center 
      bg-gradient-to-b from-gray-200 to-gray-300
      p-0 sm:p-4
    "
    >
      <Card
        className="
        w-full h-full max-w-full max-h-full flex flex-col items-center justify-start
        p-0 shadow-lg bg-white rounded-none
        sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] sm:overflow-hidden
      "
      >
        <div
          className="
          w-full flex flex-col gap-4 h-full p-3
          sm:gap-6 sm:p-6
        "
        >
          <Text
            variant="muted"
            className="text-center mb-2 sm:mb-4 text-gray-900"
          >
            <div className="flex justify-between items-center px-4">
              <span onClick={() => navigate("/")}>
                <MdArrowBack className="text-gray-500 w-6 h-6 cursor-pointer" />
              </span>
              <span onClick={() => window.location.reload()}>
                <TfiReload className="text-gray-500 w-6 h-6 cursor-pointer" />
              </span>
            </div>
          </Text>
          <Text
            as="h1"
            variant="blast"
            className="text-center mb-2 sm:mb-6 text-gray-900"
          >
            Selecione a Carga
          </Text>

          {/* Search and Filter bar */}
          <div
            className="flex items-center mb-2 border border-gray-300 rounded-xl
            focus-within:border-gray-600 transition-colors bg-white shadow px-2 relative"
          >

            <input
              type="text"
              placeholder="Buscar cargas..."
              className="flex-grow px-3 py-2 text-gray-800 placeholder-gray-400 bg-white focus:outline-none" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar cargas"
            />
            {searchTerm && (
              <button
                aria-label="Limpar busca"
                onClick={() => setSearchTerm("")}
                className="px-3 py-2 text-gray-500 hover:text-gray-900 bg-white"
                title="Limpar busca"
                type="button"
              >
                ×
              </button>
            )}
           <button
              type="button"
              aria-label="Filtrar por status"
              onClick={() => { 
                setShowStatusFilter((v) => !v);
              }}
              className="px-1"
            >
              <CiFilter className="text-gray-500 w-6 h-6 mx-2" />
            </button>

            {/* Small dropdown filter box */}
            {showStatusFilter && (
                <div className="absolute top-full right-2 mt-1 w-44 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50">
                <div className="flex flex-col max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                  {statusOptions.map((opt) => (
                    <label
                      key={opt.code}
                      className="flex items-center gap-2 mb-1 cursor-pointer text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatus.includes(opt.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatus((old) => [...old, opt.code]);
                          } else {
                            setSelectedStatus((old) =>
                              old.filter((s) => s !== opt.code)
                            );
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={applyFilter}
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm font-medium transition"
                >
                  OK
                </button>
              </div>
            )}
          </div>

          {loading && (
            <Text className="text-center text-gray-600">
              Carregando cargas...
            </Text>

          )}
            {Confirm && (
            <ConfirmationPopup
              message={Confirm}
              onRespond={(response: string) => {
              setConfirm(null);
              confirmaCarga(response, selectedCod)
              }}
              onClose={() => setConfirm(null)}
            />
            )}

          {erro && (
            //popup de erro
            <ErrorPopup message={erro} onClose={() => setErro(null)} />
          )}
          {!loading && !erro && cargasFiltradas.length === 0 && (
            <Text className="text-center text-gray-600">
              Nenhuma carga disponível para o filtro informado .
            </Text>
          )}

          <div
            className="
            flex flex-col gap-3 flex-1 min-h-0
            overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200
            pr-1 sm:pr-0
          "
          >
            {cargasFiltradas.map((carga) => (
              <Card
                key={carga.cod_carg}
                className={`
                  p-4 sm:p-6 cursor-pointer border rounded-2xl transition-shadow duration-300
                  ${
                    selectedCod === carga.cod_carg
                      ? "border-black-600 shadow-black-300 shadow-lg"
                      : "border-transparent hover:shadow-md hover:border-black-400"
                  }
                `}
                onClick={() => handleSelect(carga)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(carga);
                  }
                }}
                aria-pressed={selectedCod === carga.cod_carg}
              >
                <Text
                  variant="heading"
                  className="text-lg font-semibold text-black-700"
                >
                  {safeTrim(carga.cod_carg)} - {safeTrim(carga.nome_cli)}
                </Text>
                <Text
                  variant="default"
                  className="text-gray-700 mt-2 whitespace-pre-line"
                >
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
                    <strong>Status:</strong>{" "}
                    {getStatusText(safeTrim(carga.stat_col))}
                  </span>

                  <span onClick={() => navigate("/PalletsView", { state: { carga } })}>
                    <IoEyeSharp className="text-gray-500 h-8" onClick={() => handleSelect(carga)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(carga);
                      }
                    }} />
                 </span>

                </Text>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </main>
  );
}
