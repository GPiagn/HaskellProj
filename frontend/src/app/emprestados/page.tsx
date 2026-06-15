"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ArrowRight,
  Inbox,
  AlertCircle,
  ClipboardList,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Exemplar } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

/* Nome do relatório do Pergamum que alimenta esta aba */
const RELATORIO = "Materiais pendentes - Pendentes (76)";
const STORAGE_KEY = "emprestados:dados";

type Emprestado = {
  exemplar: string;
  nome: string;
  dataEmprestimo: string;
  dataPrevista: string;
};

/* Resultado do cruzamento de cada empréstimo com o catálogo/inventário */
type Categoria =
  | "nao_cadastrado" // não existe no catálogo  → sinalizar para incluir
  | "encontrado" // inventariado como encontrado → não mexe
  | "nao_encontrado" // inventariado como não encontrado → atualizar observação
  | "nao_inventariado"; // existe, mas sem inventário → sinalizar p/ depois

type LinhaTratada = Emprestado & {
  exemplarId: number | null;
  titulo: string | null;
  categoria: Categoria;
  atraso: number | null;
};

/* ─── Chave de cruzamento ───
   O "exemplar" (coluna I) do relatório é casado com o tombo (codigo) do
   catálogo. Se na sua planilha for outro campo, troque as duas funções abaixo. */
const chaveCatalogo = (ex: Exemplar) => ex.codigo.trim();
const chaveEmprestado = (e: Emprestado) => e.exemplar.trim();

/* ─── Helpers de data (puros) ─── */
function parseData(s: string): Date | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // dd/mm/aaaa
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); // aaaa-mm-dd
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

function exibeData(s: string): string {
  const d = parseData(s);
  if (!d) return s || "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/* dias de atraso em relação a hoje (0 = em dia / sem atraso) */
function diasAtraso(dataPrevista: string): number | null {
  const prev = parseData(dataPrevista);
  if (!prev) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  prev.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoje.getTime() - prev.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export default function EmprestadosPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dados, setDados] = useState<Emprestado[]>([]);
  const [carregado, setCarregado] = useState(false);

  /* Catálogo, para o cruzamento. null = ainda carregando */
  const [exemplares, setExemplares] = useState<Exemplar[] | null>(null);
  const catalogoCarregado = exemplares !== null;

  /* Observações já aplicadas nesta sessão (por exemplarId) */
  const [aplicadas, setAplicadas] = useState<Set<number>>(new Set());
  const [aplicando, setAplicando] = useState(false);

  /* Carrega empréstimos salvos + catálogo */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDados(JSON.parse(raw) as Emprestado[]);
    } catch {
      /* ignora dados corrompidos */
    }
    setCarregado(true);
    carregarCatalogo();
  }, []);

  function carregarCatalogo() {
    api.exemplares
      .list()
      .then(setExemplares)
      .catch(() => setExemplares([]));
  }

  function persistir(linhas: Emprestado[]) {
    setDados(linhas);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(linhas));
    } catch {
      /* storage indisponível — segue em memória */
    }
  }

  async function aoSelecionar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reimportar o mesmo arquivo
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        defval: "",
      });

      const norm = (v: unknown) => String(v ?? "").trim();

      // Colunas (A = 0): D = 3, I = 8, J = 9, K = 10
      // primeira linha é o cabeçalho → ignorada
      const lidos: Emprestado[] = [];
      for (const r of rows.slice(1)) {
        const exemplar = norm(r[8]); // coluna I
        const nome = norm(r[3]); // coluna D
        if (!exemplar && !nome) continue;
        lidos.push({
          exemplar,
          nome,
          dataEmprestimo: norm(r[9]), // coluna J
          dataPrevista: norm(r[10]), // coluna K
        });
      }

      if (lidos.length === 0) {
        toast.error(
          "Nenhuma linha válida",
          "Confira se é o relatório certo (.xlsx)."
        );
        return;
      }

      persistir(lidos); // limpa os existentes e grava os novos
      setAplicadas(new Set());
      carregarCatalogo(); // recruza com o catálogo mais recente
      toast.success(
        `${lidos.length} emprestado${lidos.length !== 1 ? "s" : ""} carregado${lidos.length !== 1 ? "s" : ""}`,
        "Tabela atualizada a partir do relatório."
      );
    } catch {
      toast.error("Não consegui ler o arquivo", "Ele é um Excel (.xlsx)?");
    }
  }

  /* ─── Cruzamento (puro, recalculado quando dados/catálogo mudam) ─── */
  const catalogo = useMemo(() => {
    const m = new Map<string, Exemplar>();
    for (const ex of exemplares ?? []) m.set(chaveCatalogo(ex), ex);
    return m;
  }, [exemplares]);

  const tratadas: LinhaTratada[] = useMemo(
    () =>
      dados.map((e) => {
        const atraso = diasAtraso(e.dataPrevista);
        const ex = catalogo.get(chaveEmprestado(e));
        if (!ex)
          return {
            ...e,
            exemplarId: null,
            titulo: null,
            categoria: "nao_cadastrado",
            atraso,
          };
        const categoria: Categoria =
          ex.situacaoInventario === "encontrado"
            ? "encontrado"
            : ex.situacaoInventario === "nao_encontrado"
              ? "nao_encontrado"
              : "nao_inventariado";
        return {
          ...e,
          exemplarId: ex.exemplarId,
          titulo: ex.titulo,
          categoria,
          atraso,
        };
      }),
    [dados, catalogo]
  );

  const cont = useMemo(() => {
    const c = {
      nao_cadastrado: 0,
      encontrado: 0,
      nao_encontrado: 0,
      nao_inventariado: 0,
    };
    for (const t of tratadas) c[t.categoria]++;
    return c;
  }, [tratadas]);

  /* Não encontrados ainda sem observação aplicada nesta sessão */
  const pendentesObs = tratadas.filter(
    (t) =>
      t.categoria === "nao_encontrado" &&
      t.exemplarId != null &&
      !aplicadas.has(t.exemplarId)
  );

  async function aplicarObservacoes() {
    setAplicando(true);
    let ok = 0;
    let falhas = 0;
    try {
      // sequencial: o backend usa uma conexão única
      for (const t of pendentesObs) {
        const obs = `${exibeData(t.dataEmprestimo)} - ${exibeData(t.dataPrevista)} - ${t.nome}`;
        try {
          await api.inventario.registrar({
            invExemplarId: t.exemplarId as number,
            invResultado: "nao_encontrado",
            invObservacao: obs,
          });
          setAplicadas((prev) => new Set(prev).add(t.exemplarId as number));
          ok++;
        } catch {
          falhas++;
        }
      }
      toast.success(
        `${ok} observação${ok !== 1 ? "ões" : ""} atualizada${ok !== 1 ? "s" : ""}`,
        falhas ? `${falhas} com erro` : "No inventário de não encontrados."
      );
    } finally {
      setAplicando(false);
    }
  }

  const temDados = dados.length > 0;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold font-display flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <ArrowLeftRight size={22} strokeWidth={2} />
            Emprestados
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Materiais fora da estante por empréstimo, do relatório{" "}
            <strong>“{RELATORIO}”</strong> do Pergamum. Ao importar, cada item é
            cruzado com o catálogo e o inventário.
          </p>
        </div>

        {carregado && (
          <Button
            variant={temDados ? "outline" : "primary"}
            onClick={() => fileRef.current?.click()}
          >
            {temDados ? (
              <RefreshCw size={15} strokeWidth={2} />
            ) : (
              <Plus size={15} strokeWidth={2} />
            )}
            {temDados ? "Atualizar" : "Incluir"} “{RELATORIO}”
          </Button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={aoSelecionar}
          className="hidden"
        />
      </div>

      {!carregado ? null : !temDados ? (
        /* Estado vazio */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card flex flex-col items-center justify-center text-center py-16 px-6"
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: "var(--brand-subtle)" }}
          >
            <Inbox size={22} style={{ color: "var(--brand)" }} strokeWidth={2} />
          </div>
          <p
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Nenhum empréstimo cadastrado
          </p>
          <p
            className="text-sm mt-1 max-w-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Inclua o relatório “{RELATORIO}” para preencher a tabela de
            materiais emprestados.
          </p>
          <Button className="mt-5" onClick={() => fileRef.current?.click()}>
            <Plus size={15} strokeWidth={2} />
            Incluir “{RELATORIO}”
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-0 overflow-hidden"
        >
          {/* Resumo do tratamento */}
          <div
            className="flex flex-wrap items-center gap-3 p-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                {dados.length}
              </strong>{" "}
              {dados.length === 1 ? "emprestado" : "emprestados"}
            </span>

            {!catalogoCarregado ? (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                verificando inventário…
              </span>
            ) : (
              <>
                {cont.nao_cadastrado > 0 && (
                  <Badge variant="warning">
                    <AlertCircle size={10} />
                    {cont.nao_cadastrado} a cadastrar
                  </Badge>
                )}
                {cont.encontrado > 0 && (
                  <Badge variant="success">
                    <CheckCircle2 size={10} />
                    {cont.encontrado} encontrado
                    {cont.encontrado !== 1 ? "s" : ""}
                  </Badge>
                )}
                {cont.nao_encontrado > 0 && (
                  <Badge variant="danger">
                    <Pencil size={10} />
                    {cont.nao_encontrado} não encontrado
                    {cont.nao_encontrado !== 1 ? "s" : ""}
                  </Badge>
                )}
                {cont.nao_inventariado > 0 && (
                  <Badge variant="outline">
                    <ClipboardList size={10} />
                    {cont.nao_inventariado} a inventariar
                  </Badge>
                )}

                {pendentesObs.length > 0 && (
                  <Button
                    size="sm"
                    className="ml-auto"
                    loading={aplicando}
                    onClick={aplicarObservacoes}
                  >
                    <Pencil size={13} strokeWidth={2} />
                    Atualizar observação ({pendentesObs.length})
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left"
                  style={{
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th className="font-medium p-3 text-xs">Exemplar</th>
                  <th className="font-medium p-3 text-xs">Nome</th>
                  <th className="font-medium p-3 text-xs">Empréstimo</th>
                  <th className="font-medium p-3 text-xs">Devolução prevista</th>
                  <th className="font-medium p-3 text-xs">Atraso</th>
                  <th className="font-medium p-3 text-xs">Tratamento</th>
                </tr>
              </thead>
              <tbody>
                {tratadas.map((t, i) => (
                  <tr
                    key={`${t.exemplar}-${i}`}
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <td className="p-3">
                      <div
                        className="font-mono"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {t.exemplar || "—"}
                      </div>
                      {t.titulo && (
                        <div
                          className="text-xs mt-0.5 truncate max-w-[220px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {t.titulo}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{t.nome || "—"}</td>
                    <td className="p-3 tabular-nums">
                      {exibeData(t.dataEmprestimo)}
                    </td>
                    <td className="p-3 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowRight
                          size={11}
                          style={{ color: "var(--text-muted)" }}
                        />
                        <span
                          style={{
                            color:
                              t.atraso && t.atraso > 0
                                ? "var(--danger)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {exibeData(t.dataPrevista)}
                        </span>
                      </span>
                    </td>
                    <td className="p-3">
                      {t.atraso === null ? (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      ) : t.atraso > 0 ? (
                        <Badge variant="danger">
                          <Clock size={10} />
                          {t.atraso} {t.atraso === 1 ? "dia" : "dias"}
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <CheckCircle2 size={10} />
                          Em dia
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <TratamentoCell
                        categoria={t.categoria}
                        carregado={catalogoCarregado}
                        aplicada={
                          t.exemplarId != null && aplicadas.has(t.exemplarId)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Célula de tratamento por categoria ─── */
function TratamentoCell({
  categoria,
  carregado,
  aplicada,
}: {
  categoria: Categoria;
  carregado: boolean;
  aplicada: boolean;
}) {
  if (!carregado)
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        verificando…
      </span>
    );

  switch (categoria) {
    case "nao_cadastrado":
      return (
        <Badge variant="warning">
          <AlertCircle size={10} />
          Não cadastrado — incluir
        </Badge>
      );
    case "encontrado":
      return (
        <Badge variant="success">
          <CheckCircle2 size={10} />
          Encontrado — sem alteração
        </Badge>
      );
    case "nao_encontrado":
      return aplicada ? (
        <Badge variant="success">
          <CheckCircle2 size={10} />
          Observação atualizada
        </Badge>
      ) : (
        <Badge variant="danger">
          <Pencil size={10} />
          Atualizar observação
        </Badge>
      );
    case "nao_inventariado":
      return (
        <Badge variant="outline">
          <ClipboardList size={10} />
          Inventariar depois
        </Badge>
      );
  }
}
