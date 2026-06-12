/* Types matching the Haskell backend exactly */

export type Exemplar = {
  exemplarId: number;
  codigo: string;
  titulo: string;
  autor: string | null;
  classificacao: string | null;
  tipoObra: string | null;
  situacaoSistema: string | null;
  situacaoInventario: string | null;
};

export type ExemplarInput = {
  inpCodigo: string;
  inpTitulo: string;
  inpAutor: string | null;
  inpClassificacao: string | null;
  inpTipoObra: string | null;
};

export type ExemplarPatch = {
  patCodigo: string | null;
  patTitulo: string | null;
  patAutor: string | null;
  patClassificacao: string | null;
  patTipoObra: string | null;
};

export type DashboardTotais = {
  totalExemplares: number;
  totalEncontrados: number;
  totalNaoEncontrados: number;
  totalNaoInventariados: number;
  totalEmprestimosAtrasados: number;
};

export type InventarioInput = {
  invExemplarId: number;
  invResultado: "encontrado" | "nao_encontrado";
  invObservacao: string | null;
};

export type SituacaoEmprestimo =
  | { tag: "EmDia" }
  | { tag: "Atrasado"; diasAtraso: number };

export type MotivoNaoEncontrado =
  | {
      tag: "Emprestado";
      nomePessoa: string;
      dataEmprestimo: string;
      dataPrevista: string;
      situacao: SituacaoEmprestimo;
    }
  | { tag: "OutroMotivo"; descricao: string };

export type ExemplarNaoEncontrado = {
  neExemplarId: number;
  neCodigo: string;
  neTitulo: string;
  neMotivo: MotivoNaoEncontrado;
};

export type ApiResponse<T> = { data: T } | { error: string };
