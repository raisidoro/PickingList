export function getDataHoraAtual() {
  const dataAtual = new Date();
  const dataLog =
    dataAtual.getFullYear().toString() +
    String(dataAtual.getMonth() + 1).padStart(2, "0") +
    String(dataAtual.getDate()).padStart(2, "0");
  const horaLog = dataAtual.toTimeString().slice(0, 8);
  return { dataLog, horaLog };
}