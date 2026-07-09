import React, { type JSX } from "react";
import { useState } from "react";
import { autenticarOperador } from "../services/operadorService";
import { useNavigate } from "react-router-dom";
import SuccessPopup from "../components/popups/CompSuccessPopup";

import { Text } from "../components/ui/text.tsx";
import { Card } from "../components/ui/card.tsx";
import { Input } from "../components/ui/input.tsx";
import { Button } from "../components/ui/button.tsx";

function LoginForm() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [success, setSucess] = useState<string | null>(null);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {

      const data = await autenticarOperador(
        matricula.trim(),
        senha.trim()
      );

      if (data && data.Nome && data.Matricula) {
      setSucess(`Bem-vindo, ${data.Nome.trim()}`);
      console.log(matricula)
      const mat = matricula.trim(); 
      localStorage.setItem("matricula", mat);
      setTimeout(() => {
        setSucess(null);
        navigate("/Carga", { state: { matricula: matricula } });
      }, 1000); 
      } else if (data && data.Erro) {
      setErro(data.Erro);
      } else {
      setErro("Falha de autenticação. Tente novamente.");
      }
    } catch (err) {
      setErro("Erro ao conectar." + (err instanceof Error ? ` Detalhes: ${err.message}` : ""));
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
          onChange={(e) => setMatricula(e.target.value)}
          required
        />
        <Input
          label="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        {erro && (
          <Text variant="muted" className="text-red-600 text-center">
            {erro}
          </Text>
        )}

        <SuccessPopup 
          message={success} 
          onClose={() => setSucess(null)} 
          onRespond={() => setSucess(null)}
        />

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

//EE22HM40152144258
//E22HM;0152-1;4;I;10;600;400;330

//X|G-052|0001