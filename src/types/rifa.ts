export const RIFA_STATUS = ["aberta", "encerrada", "finalizada"] as const;
export type RifaStatus = (typeof RIFA_STATUS)[number];

export const RIFA_STATUS_LABEL: Record<RifaStatus, string> = {
  aberta: "Aberta",
  encerrada: "Encerrada",
  finalizada: "Sorteada",
};

export type Rifa = {
  id: string;
  titulo: string;
  premio: string;
  descricao: string | null;
  image_url: string | null;
  preco_cota: number;
  total_numeros: number;
  status: RifaStatus;
  vencedor_numero: number | null;
  vencedor_user_id: string | null;
  created_by: string | null;
  created_at: string;
  vendidos: number;
};

export type RifaNumero = {
  id: string;
  rifa_id: string;
  numero: number;
  user_id: string;
  status: "reservado" | "pago";
  created_at: string;
};
