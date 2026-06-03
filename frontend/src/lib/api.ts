import type {
  Exemplar,
  ExemplarInput,
  ExemplarPatch,
  DashboardTotais,
  InventarioInput,
  ExemplarNaoEncontrado,
} from "./types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export const api = {
  ping: () => req<{ status: string; msg: string }>("/ping"),

  exemplares: {
    list: () => req<Exemplar[]>("/exemplares"),
    get: (id: number) => req<Exemplar>(`/exemplares/${id}`),
    create: (data: ExemplarInput) =>
      req<{ id: number; msg: string }>("/exemplares", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: ExemplarInput) =>
      req<{ id: number; msg: string }>(`/exemplares/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    patch: (id: number, data: ExemplarPatch) =>
      req<{ id: number; msg: string }>(`/exemplares/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      req<{ id: number; msg: string }>(`/exemplares/${id}`, {
        method: "DELETE",
      }),
  },

  inventario: {
    registrar: (data: InventarioInput) =>
      req<{ exemplarId: number; resultado: string; msg: string; linhas: number }>(
        "/inventario",
        { method: "POST", body: JSON.stringify(data) }
      ),
    naoEncontrados: () => req<ExemplarNaoEncontrado[]>("/nao-encontrados"),
  },

  dashboard: {
    totais: () => req<DashboardTotais>("/dashboard/totais"),
  },
};
