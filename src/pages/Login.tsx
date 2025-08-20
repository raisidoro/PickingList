import React, { type JSX } from "react";
import { useState } from "react";
import { apiOperadores } from "../lib/axios";
import { useNavigate } from "react-router-dom";

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

const buttonVariants = {
  default: "bg-gray-100",
  primary: "bg-gray-700",
};

type ButtonProps = {
  variant?: keyof typeof buttonVariants;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
  variant = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        flex items-center justify-center rounded-xl
        p-3 cursor-pointer text-gray-100
        bg-gray-800
        ${buttonVariants[variant]}
        ${className}
      `}
      {...props}
    >
      <Text as="span" variant="heading">
        {children}
      </Text>
    </button>
  );
}

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        bg-gray-100 shadow-md
        rounded-2xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}

type InputProps = {
  label: string;
  type?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Input({ label, type = "text", className = "", ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1">
      <Text variant="muted" className="text-base">
        {label}
      </Text>
      <input
        type={type}
        className={`
          bg-transparent border border-gray-500
          rounded-xl px-2 py-2 text-gray-800
          focus:outline-none focus:border-gray-700
          ${className}
        `}
        {...props}
      />
    </label>
  );
}

function LoginForm() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      const params = {
        cNfc: "-",    
        cMat: matricula.trim(),
        cPass: senha.trim(),
      };

      const resp = await apiOperadores.get("", { params });
      const data = resp.data;

      if (data && data.Nome && data.Matricula) {
        window.alert(`Bem-vindo, ${data.Nome.trim()}`);
        navigate("/Carga");
      } else if (data && data.Erro) {
        setErro(data.Erro);
      } else {
        setErro("Falha de autenticação. Tente novamente.");
      }
    } catch (err) {
      setErro("Erro ao conectar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={`
        flex flex-col gap-8 w-full max-w-md
        pt-8 sm:pt-14 px-4 sm:px-8 pb-8
        overflow-hidden
      `}
    >
      <img
        src="/GDBR_logo.png"
        alt="GDBR"
        className="mx-auto max-w-[8rem] sm:max-w-[12rem] w-full"
      />
      <Text as="p" variant="blast" className="text-center mt-0">
        LOGIN
      </Text>
      <form
        className="flex flex-col gap-4 sm:gap-6"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <Input
          label="Matrícula"
          type="text"
          value={matricula}
          onChange={e => setMatricula(e.target.value)}
          required
        />
        <Input
          label="Senha"
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
        />
        {erro && (
          <Text variant="muted" className="text-red-600 text-center">
            {erro}
          </Text>
        )}
        <Button
          variant="primary"
          className="py-3"
          type="submit"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}

export default function Login() {
  return (
    <main
      className={`
        min-h-screen flex items-center justify-center
        py-8 sm:py-28 px-2 sm:px-4 bg-gradient-to-b from-gray-200 to-gray-200
      `}
    >
      <LoginForm />
    </main>
  );
}
