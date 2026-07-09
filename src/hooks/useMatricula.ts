import { useLocation } from "react-router-dom";

export function useMatricula() {
  const location = useLocation();
  const matriculaState = location.state?.matricula as string | undefined;
  const matriculaStorage = localStorage.getItem("matricula") || undefined;
  return matriculaState || matriculaStorage || "";
}