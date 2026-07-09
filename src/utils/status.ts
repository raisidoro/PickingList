export function getStatusTextCarga(code: string) {
  switch (code) {
    case "0": return "Pendente";
    case "1": return "Em montagem";
    case "3": return "Concluída";
    default: return code;
  }
}

export function getStatusColorCarga(status: string) {
  switch (status) {
    case "0": return "bg-gray-200 border-gray-400";
    case "1": return "bg-orange-200 border-orange-400";
    case "3": return "bg-green-200 border-green-400";
    default: return "bg-white border-gray-200";
  }
}

export function getStatusOrderCarga(status: string) {
  switch (status) {
    case "0": return 0;
    case "1": return 1;
    case "3": return 2;
    default: return 3;
  }
}

export function getStatusColorPalete(status: string) {
  switch (status) {
    case "0": return "bg-gray-100 border-gray-300 text-black";
    case "1": return "bg-orange-200 border-orange-400 text-black";
    case "3": return "bg-green-200 border-green-400 text-black";
  }
}

export const statusOptions = [
  { code: "0", label: "Pendente" },
  { code: "1", label: "Em conferência" },
  { code: "3", label: "Concluída" },
];