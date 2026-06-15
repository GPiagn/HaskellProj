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
} from "lucide-react";
import { api } from "@/lib/api";
import type { Exemplar } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
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

type Categoria =
  | "nao_cadastrado"
  | "encontrado"
  | "nao_encontrado"
  | "nao_inventariado";

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

/* Converte a data para ISO (aaaa-mm-dd), formato que o backend espera */
function toISO(s: string): string | null {
  const d = parseData(s);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function diasAtraso(dataPrevista: string): number | null {
  const prev = parseData(dataPrevista);
  if (!prev) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  prev.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoje.getTime() - prev.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/* Registra o empréstimo no backend. As datas vão em ISO; o cálculo de
   em dia/atraso é feito pelo backend (calcSituacao). */
async function registrarEmprestimo(l: LinhaTratada) {
  const dEmp = toISO(l.dataEmprestimo);
  const dPrev = toISO(l.dataPrevista);
  if (l.exemplarId == null) throw new Error("Exemplar sem id.");
  if (!dEmp || !dPrev)
    throw new Error("Datas do empréstimo inválidas (use dd/mm/aaaa).");
  await api.emprestimos.registrar({
    empExemplarId: l.exemplarId,
    empNomePessoa: l.nome,
    empDataEmprestimo: dEmp,
    empDataPrevista: dPrev,
  });
}

export default function EmprestadosPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dados, setDados] = useState<Emprestado[]>([]);
  const [carregado, setCarregado] = useState(false);

  const [exemplares, setExemplares] = useState<Exemplar[] | null>(null);
  const catalogoCarregado = exemplares !== null;

  /* Empréstimos já registrados nesta sessão (por exemplarId) */
  const [registrados, setRegistrados] = useState<Set<number>>(new Set());
  const [registrandoTodos, setRegistrandoTodos] = useState(false);

  /* Filtro por categoria (null = todos) */
  const [filtro, setFiltro] = useState<Categoria | null>(null);
  const alternarFiltro = (c: Categoria) =>
    setFiltro((atual) => (atual === c ? null : c));

  /* Diálogos */
  const [invOpen, setInvOpen] = useState(false);
  const [invLinha, setInvLinha] = useState<LinhaTratada | null>(null);
  const [invModo, setInvModo] = useState<"inventariar" | "emprestimo">(
    "inventariar"
  );
  const [incOpen, setIncOpen] = useState(false);
  const [incLinha, setIncLinha] = useState<LinhaTratada | null>(null);

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
    e.target.value = "";
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

      // Colunas (A = 0): D = 3, I = 8, J = 9, K = 10  (1ª linha = cabeçalho)
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

      persistir(lidos);
      setRegistrados(new Set());
      setFiltro(null);
      carregarCatalogo();
      toast.success(
        `${lidos.length} emprestado${lidos.length !== 1 ? "s" : ""} carregado${lidos.length !== 1 ? "s" : ""}`,
        "Tabela atualizada a partir do relatório."
      );
    } catch {
      toast.error("Não consegui ler o arquivo", "Ele é um Excel (.xlsx)?");
    }
  }

  /* ─── Cruzamento (puro) ─── */
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

  /* Não encontrados que ainda não tiveram o empréstimo registrado */
  const pendentesEmp = tratadas.filter(
    (t) =>
      t.categoria === "nao_encontrado" &&
      t.exemplarId != null &&
      !registrados.has(t.exemplarId)
  );

  async function registrarTodos() {
    setRegistrandoTodos(true);
    let ok = 0;
    let falhas = 0;
    try {
      for (const t of pendentesEmp) {
        try {
          await registrarEmprestimo(t);
          setRegistrados((prev) => new Set(prev).add(t.exemplarId as number));
          ok++;
        } catch {
          falhas++;
        }
      }
      toast.success(
        `${ok} empréstimo${ok !== 1 ? "s" : ""} registrado${ok !== 1 ? "s" : ""}`,
        falhas
          ? `${falhas} com erro (datas inválidas?)`
          : "Já aparecem como emprestados nos Não Encontrados."
      );
    } finally {
      setRegistrandoTodos(false);
    }
  }

  /* Callbacks dos diálogos */
  function abrirInventariar(linha: LinhaTratada) {
    setInvLinha(linha);
    setInvModo("inventariar");
    setInvOpen(true);
  }
  function abrirEmprestimo(linha: LinhaTratada) {
    setInvLinha(linha);
    setInvModo("emprestimo");
    setInvOpen(true);
  }
  function abrirIncluir(linha: LinhaTratada) {
    setIncLinha(linha);
    setIncOpen(true);
  }
  function aoSalvarInventario(exemplarId: number, resultado: string) {
    if (resultado === "nao_encontrado")
      setRegistrados((prev) => new Set(prev).add(exemplarId));
    carregarCatalogo();
  }

  const temDados = dados.length > 0;
  const visiveis = filtro
    ? tratadas.filter((t) => t.categoria === filtro)
    : tratadas;

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
          {/* Resumo do tratamento (chips clicáveis = filtro) */}
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
                  <ChipFiltro
                    ativo={filtro === "nao_cadastrado"}
                    apagado={filtro !== null && filtro !== "nao_cadastrado"}
                    variant="warning"
                    onClick={() => alternarFiltro("nao_cadastrado")}
                  >
                    <AlertCircle size={10} />
                    {cont.nao_cadastrado} a cadastrar
                  </ChipFiltro>
                )}
                {cont.encontrado > 0 && (
                  <ChipFiltro
                    ativo={filtro === "encontrado"}
                    apagado={filtro !== null && filtro !== "encontrado"}
                    variant="success"
                    onClick={() => alternarFiltro("encontrado")}
                  >
                    <CheckCircle2 size={10} />
                    {cont.encontrado} encontrado
                    {cont.encontrado !== 1 ? "s" : ""}
                  </ChipFiltro>
                )}
                {cont.nao_encontrado > 0 && (
                  <ChipFiltro
                    ativo={filtro === "nao_encontrado"}
                    apagado={filtro !== null && filtro !== "nao_encontrado"}
                    variant="danger"
                    onClick={() => alternarFiltro("nao_encontrado")}
                  >
                    <ArrowLeftRight size={10} />
                    {cont.nao_encontrado} não encontrado
                    {cont.nao_encontrado !== 1 ? "s" : ""}
                  </ChipFiltro>
                )}
                {cont.nao_inventariado > 0 && (
                  <ChipFiltro
                    ativo={filtro === "nao_inventariado"}
                    apagado={filtro !== null && filtro !== "nao_inventariado"}
                    variant="outline"
                    onClick={() => alternarFiltro("nao_inventariado")}
                  >
                    <ClipboardList size={10} />
                    {cont.nao_inventariado} a inventariar
                  </ChipFiltro>
                )}

                {filtro && (
                  <button
                    type="button"
                    onClick={() => setFiltro(null)}
                    className="text-xs underline underline-offset-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ver todos
                  </button>
                )}

                {pendentesEmp.length > 0 && (
                  <Button
                    size="sm"
                    className="ml-auto"
                    loading={registrandoTodos}
                    onClick={registrarTodos}
                  >
                    <ArrowLeftRight size={13} strokeWidth={2} />
                    Registrar empréstimos ({pendentesEmp.length})
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
                {visiveis.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Nenhum item nesta categoria.
                    </td>
                  </tr>
                ) : (
                  visiveis.map((t, i) => (
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
                        <TratamentoAcao
                          linha={t}
                          carregado={catalogoCarregado}
                          registrado={
                            t.exemplarId != null && registrados.has(t.exemplarId)
                          }
                          onInventariar={() => abrirInventariar(t)}
                          onEmprestimo={() => abrirEmprestimo(t)}
                          onIncluir={() => abrirIncluir(t)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <InventarioDialog
        open={invOpen}
        linha={invLinha}
        modo={invModo}
        onClose={() => setInvOpen(false)}
        onSaved={aoSalvarInventario}
      />
      <IncluirExemplarDialog
        open={incOpen}
        linha={incLinha}
        onClose={() => setIncOpen(false)}
        onSaved={carregarCatalogo}
      />
    </div>
  );
}

/* ─── Botão de tratamento por categoria ─── */
function TratamentoAcao({
  linha,
  carregado,
  registrado,
  onInventariar,
  onEmprestimo,
  onIncluir,
}: {
  linha: LinhaTratada;
  carregado: boolean;
  registrado: boolean;
  onInventariar: () => void;
  onEmprestimo: () => void;
  onIncluir: () => void;
}) {
  if (!carregado)
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        verificando…
      </span>
    );

  switch (linha.categoria) {
    case "nao_cadastrado":
      return (
        <Button variant="outline" size="sm" onClick={onIncluir}>
          <AlertCircle size={13} strokeWidth={2} />
          Não cadastrado — incluir
        </Button>
      );
    case "encontrado":
      return (
        <Badge variant="success">
          <CheckCircle2 size={10} />
          Encontrado — sem alteração
        </Badge>
      );
    case "nao_encontrado":
      return registrado ? (
        <Badge variant="success">
          <CheckCircle2 size={10} />
          Empréstimo registrado
        </Badge>
      ) : (
        <Button variant="outline" size="sm" onClick={onEmprestimo}>
          <ArrowLeftRight size={13} strokeWidth={2} />
          Registrar empréstimo
        </Button>
      );
    case "nao_inventariado":
      return (
        <Button variant="outline" size="sm" onClick={onInventariar}>
          <ClipboardList size={13} strokeWidth={2} />
          Inventariar depois
        </Button>
      );
  }
}

/* ─── Chip clicável do resumo (atua como filtro) ─── */
function ChipFiltro({
  ativo,
  apagado,
  variant,
  onClick,
  children,
}: {
  ativo: boolean;
  apagado: boolean;
  variant: "success" | "warning" | "danger" | "outline";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="rounded-full transition-all"
      style={{
        outline: ativo ? "2px solid var(--brand)" : "2px solid transparent",
        outlineOffset: 2,
        opacity: apagado ? 0.45 : 1,
      }}
    >
      <Badge variant={variant}>{children}</Badge>
    </button>
  );
}

/* ─── Resumo do item, reutilizado nos diálogos ─── */
function ResumoItem({ linha }: { linha: LinhaTratada }) {
  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
      }}
    >
      <div>
        <span style={{ color: "var(--text-muted)" }}>Exemplar: </span>
        <span className="font-mono" style={{ color: "var(--text-primary)" }}>
          {linha.exemplar}
        </span>
        {linha.titulo && (
          <span style={{ color: "var(--text-muted)" }}> · {linha.titulo}</span>
        )}
      </div>
      <div>
        <span style={{ color: "var(--text-muted)" }}>Aluno: </span>
        {linha.nome || "—"}
      </div>
      <div>
        <span style={{ color: "var(--text-muted)" }}>Período: </span>
        {exibeData(linha.dataEmprestimo)} → {exibeData(linha.dataPrevista)}
      </div>
    </div>
  );
}

/* ─── Diálogo de inventário / registro de empréstimo ─── */
function InventarioDialog({
  open,
  linha,
  modo,
  onClose,
  onSaved,
}: {
  open: boolean;
  linha: LinhaTratada | null;
  modo: "inventariar" | "emprestimo";
  onClose: () => void;
  onSaved: (exemplarId: number, resultado: string) => void;
}) {
  const toast = useToast();
  const [resultado, setResultado] = useState<"" | "encontrado" | "nao_encontrado">("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !linha) return;
    setResultado(modo === "emprestimo" ? "nao_encontrado" : "");
  }, [open, linha, modo]);

  const vaiRegistrarEmp =
    modo === "emprestimo" || resultado === "nao_encontrado";
  const podeSalvar =
    !!linha && linha.exemplarId != null && (modo === "emprestimo" || resultado !== "");

  async function salvar() {
    if (!linha || linha.exemplarId == null) return;
    setSalvando(true);
    try {
      if (modo === "inventariar") {
        if (resultado === "") return;
        const obsEmp = `${exibeData(linha.dataEmprestimo)} - ${exibeData(linha.dataPrevista)} - ${linha.nome}`;
        await api.inventario.registrar({
          invExemplarId: linha.exemplarId,
          invResultado: resultado,
          invObservacao: resultado === "nao_encontrado" ? obsEmp : null,
        });
        if (resultado === "nao_encontrado") await registrarEmprestimo(linha);
      } else {
        await registrarEmprestimo(linha);
      }
      toast.success(
        modo === "emprestimo" ? "Empréstimo registrado" : "Inventário registrado",
        vaiRegistrarEmp
          ? "Já aparece como emprestado nos Não Encontrados."
          : "Marcado como encontrado."
      );
      onSaved(linha.exemplarId, modo === "emprestimo" ? "nao_encontrado" : resultado);
      onClose();
    } catch (e) {
      toast.error("Erro ao registrar", e instanceof Error ? e.message : undefined);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={modo === "emprestimo" ? "Registrar empréstimo" : "Registrar inventário"}
      size="md"
    >
      {linha && (
        <div className="space-y-4">
          <ResumoItem linha={linha} />

          {modo === "inventariar" && (
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Resultado do inventário
              </label>
              <div className="flex gap-2">
                <OpcaoResultado
                  ativo={resultado === "encontrado"}
                  cor="var(--success)"
                  onClick={() => setResultado("encontrado")}
                >
                  <CheckCircle2 size={14} />
                  Encontrado
                </OpcaoResultado>
                <OpcaoResultado
                  ativo={resultado === "nao_encontrado"}
                  cor="var(--danger)"
                  onClick={() => setResultado("nao_encontrado")}
                >
                  <AlertCircle size={14} />
                  Não encontrado
                </OpcaoResultado>
              </div>
            </div>
          )}

          {vaiRegistrarEmp && (
            <p
              className="text-xs rounded-lg p-2.5"
              style={{
                backgroundColor: "var(--brand-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              Será registrado o empréstimo de <strong>{linha.nome || "—"}</strong>{" "}
              com devolução prevista em {exibeData(linha.dataPrevista)}. O sistema
              calcula automaticamente se está em dia ou atrasado.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={salvando}
              disabled={!podeSalvar}
              onClick={salvar}
            >
              Salvar
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function OpcaoResultado({
  ativo,
  cor,
  onClick,
  children,
}: {
  ativo: boolean;
  cor: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-sm rounded-lg transition-colors"
      style={{
        backgroundColor: ativo ? cor : "var(--surface)",
        border: `1px solid ${ativo ? cor : "var(--border)"}`,
        color: ativo ? "oklch(0.98 0 0)" : "var(--text-secondary)",
        fontWeight: ativo ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Diálogo de criar exemplar ─── */
function IncluirExemplarDialog({
  open,
  linha,
  onClose,
  onSaved,
}: {
  open: boolean;
  linha: LinhaTratada | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !linha) return;
    setCodigo(linha.exemplar);
    setTitulo("");
    setAutor("");
    setClassificacao("");
    setTipoObra("");
  }, [open, linha]);

  const podeSalvar = codigo.trim() !== "" && titulo.trim() !== "";

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await api.exemplares.create({
        inpCodigo: codigo.trim(),
        inpTitulo: titulo.trim(),
        inpAutor: autor.trim() || null,
        inpClassificacao: classificacao.trim() || null,
        inpTipoObra: tipoObra.trim() || null,
        inpSituacaoSistema: "Normal",
        inpNumeroAcervo: null,
        inpNumeroExemplar: null,
        inpModoAquisicao: null,
        inpDataAquisicao: null,
      });
      toast.success("Exemplar criado", "Agora ele pode ser inventariado.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Erro ao criar", e instanceof Error ? e.message : undefined);
    } finally {
      setSalvando(false);
    }
  }

  const campo = (
    label: string,
    valor: string,
    set: (v: string) => void,
    required = false,
    placeholder = ""
  ) => (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
        {required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <Input
        value={valor}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Incluir exemplar no catálogo"
      size="md"
    >
      {linha && (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Este exemplar está no relatório de emprestados mas não existe no
            catálogo. Preencha ao menos o título para cadastrá-lo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {campo("Tombo", codigo, setCodigo, true, "ex: 1455")}
            {campo("Tipo de material", tipoObra, setTipoObra, false, "ex: Livro")}
          </div>
          {campo("Título", titulo, setTitulo, true, "Nome completo da obra")}
          {campo("Autor", autor, setAutor, false, "Nome do autor")}
          {campo(
            "Classificação",
            classificacao,
            setClassificacao,
            false,
            "ex: 611.8 M1491n"
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={salvando}
              disabled={!podeSalvar}
              onClick={salvar}
            >
              Criar exemplar
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
