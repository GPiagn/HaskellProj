"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Pencil,
  Trash2,
  User2,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Exemplar, ExemplarInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

/* ─── Cover generation ─── */
function titleHash(s: string): number {
  let h = 0x811c9dc5;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function coverPalette(titulo: string) {
  const h = titleHash(titulo);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 40)) % 360;
  return {
    from: `oklch(0.55 0.18 ${hue})`,
    mid:  `oklch(0.40 0.16 ${hue})`,
    to:   `oklch(0.26 0.12 ${hue2})`,
    letter: titulo.charAt(0).toUpperCase(),
    textHue: hue,
  };
}

/* ─── BookCover component ─── */
function BookCover({
  titulo,
  small = false,
}: {
  titulo: string;
  small?: boolean;
}) {
  const { from, mid, to, letter } = coverPalette(titulo);
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 30% 20%, ${from} 0%, ${mid} 45%, ${to} 100%)`,
      }}
    >
      {/* Subtle crosshatch texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.98 0 0 / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.98 0 0 / 0.04) 1px, transparent 1px)
          `,
          backgroundSize: small ? "6px 6px" : "14px 14px",
        }}
      />
      {/* Large letter — typographic element */}
      {!small && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display font-bold select-none"
            style={{
              fontSize: "5.5rem",
              color: "oklch(0.98 0 0 / 0.10)",
              letterSpacing: "-0.06em",
              lineHeight: 1,
            }}
          >
            {letter}
          </span>
        </div>
      )}
      {/* Bottom subtle shimmer strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12"
        style={{
          background:
            "linear-gradient(to top, oklch(0 0 0 / 0.25) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

/* ─── Grid book card ─── */
const TIPO_COLORS: Record<string, "default" | "info" | "warning" | "success" | "outline"> = {
  Livro:      "default",
  Periódico:  "info",
  Tese:       "warning",
  Monografia: "success",
};

function BookCardGrid({
  exemplar,
  index,
  onEdit,
  onDelete,
}: {
  exemplar: Exemplar;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.04, 0.5), duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
      whileHover={{ y: -5, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="book-card group cursor-default card-elevated"
      style={{ borderRadius: 12, overflow: "hidden" }}
    >
      {/* ─── Book cover (aspect ratio 3:4) ─── */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
        <BookCover titulo={exemplar.titulo} />

        {/* Hover overlay — info panel */}
        <div className="book-card-overlay absolute inset-0 flex flex-col justify-between p-3"
          style={{
            background: "linear-gradient(to top, oklch(0.10 0.04 150 / 0.92) 0%, oklch(0.10 0.04 150 / 0.10) 55%, transparent 100%)",
          }}
        >
          {/* Actions top-right */}
          <div className="book-card-actions flex justify-end gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg backdrop-blur-sm transition-colors hover:scale-110"
              style={{
                backgroundColor: "oklch(0.98 0 0 / 0.15)",
                color: "oklch(0.98 0 0)",
              }}
              aria-label={`Editar ${exemplar.titulo}`}
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg backdrop-blur-sm transition-colors hover:scale-110"
              style={{
                backgroundColor: "oklch(0.62 0.18 18 / 0.35)",
                color: "oklch(0.98 0 0)",
              }}
              aria-label={`Remover ${exemplar.titulo}`}
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Book info bottom */}
          <div>
            <p
              className="text-xs font-semibold leading-tight line-clamp-2"
              style={{ color: "oklch(0.97 0.01 0)" }}
            >
              {exemplar.titulo}
            </p>
            {exemplar.autor && (
              <p
                className="text-[11px] mt-1 truncate"
                style={{ color: "oklch(0.82 0.02 0)" }}
              >
                {exemplar.autor}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Metadata footer ─── */}
      <div className="p-3 space-y-1.5" style={{ backgroundColor: "var(--surface)" }}>
        <p
          className="text-xs font-semibold leading-snug line-clamp-2 font-display"
          style={{ color: "var(--text-primary)" }}
        >
          {exemplar.titulo}
        </p>
        <div className="flex items-center justify-between gap-1">
          <p
            className="text-[10px] font-mono truncate"
            style={{ color: "var(--text-muted)" }}
          >
            #{exemplar.codigo}
          </p>
          {exemplar.tipoObra && (
            <Badge
              variant={TIPO_COLORS[exemplar.tipoObra] ?? "outline"}
              className="text-[9px] flex-shrink-0"
            >
              {exemplar.tipoObra}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── List book row ─── */
function BookRow({
  exemplar,
  index,
  onEdit,
  onDelete,
}: {
  exemplar: Exemplar;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.4) }}
      className="table-row-hover group transition-colors"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Cover thumbnail */}
      <td className="py-2.5 pl-4 pr-2 w-12">
        <div
          className="overflow-hidden flex-shrink-0 rounded-md"
          style={{ width: 36, height: 48 }}
        >
          <BookCover titulo={exemplar.titulo} small />
        </div>
      </td>

      {/* Title + code */}
      <td className="py-2.5 pr-4 max-w-xs">
        <p
          className="text-sm font-semibold font-display leading-snug line-clamp-1"
          style={{ color: "var(--text-primary)" }}
        >
          {exemplar.titulo}
        </p>
        <p
          className="text-[11px] font-mono mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {exemplar.codigo}
        </p>
      </td>

      {/* Author */}
      <td className="py-2.5 pr-4 hidden md:table-cell">
        <span
          className="flex items-center gap-1.5 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {exemplar.autor ? (
            <>
              <User2 size={12} strokeWidth={1.8} />
              <span className="truncate max-w-[180px]">{exemplar.autor}</span>
            </>
          ) : (
            <span style={{ color: "var(--text-disabled)" }}>—</span>
          )}
        </span>
      </td>

      {/* Classification */}
      <td className="py-2.5 pr-4 hidden lg:table-cell">
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          {exemplar.classificacao ?? "—"}
        </span>
      </td>

      {/* Type badge */}
      <td className="py-2.5 pr-4">
        {exemplar.tipoObra ? (
          <Badge
            variant={TIPO_COLORS[exemplar.tipoObra] ?? "outline"}
            className="text-[10px]"
          >
            {exemplar.tipoObra}
          </Badge>
        ) : (
          <span style={{ color: "var(--text-disabled)" }}>—</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)]"
            style={{ color: "var(--text-muted)" }}
            aria-label={`Editar ${exemplar.titulo}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]"
            style={{ color: "var(--text-muted)" }}
            aria-label={`Remover ${exemplar.titulo}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

/* ─── Exemplar form ─── */
function ExemplarForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<Exemplar>;
  onSubmit: (data: ExemplarInput) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ExemplarInput>({
    inpCodigo: initial?.codigo ?? "",
    inpTitulo: initial?.titulo ?? "",
    inpAutor: initial?.autor ?? null,
    inpClassificacao: initial?.classificacao ?? null,
    inpTipoObra: initial?.tipoObra ?? null,
  });

  const set = (k: keyof ExemplarInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v || null }));

  const field = (
    label: string,
    k: keyof ExemplarInput,
    required = false,
    placeholder = ""
  ) => (
    <div className="space-y-1.5" key={k}>
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
        {required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      <Input
        value={(form[k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.inpCodigo || !form.inpTitulo) return;
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {field("Código", "inpCodigo", true, "ex: 1455")}
        {field("Tipo de obra", "inpTipoObra", false, "Livro, Periódico…")}
      </div>
      {field("Título", "inpTitulo", true, "Nome completo da obra")}
      {field("Autor", "inpAutor", false, "Nome do autor")}
      {field("Classificação", "inpClassificacao", false, "ex: 611.8 M1491n")}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          {initial?.exemplarId ? "Salvar alterações" : "Criar exemplar"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Grid loading skeletons ─── */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="card overflow-hidden" style={{ borderRadius: 12 }}>
          <div style={{ aspectRatio: "3/4" }}>
            <Skeleton className="w-full h-full rounded-none" />
          </div>
          <div className="p-3 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE = 30;

/* ─── Main page ─── */
export default function CatalogoPage() {
  const [exemplares, setExemplares] = useState<Exemplar[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{
    type: "create" | "edit";
    exemplar?: Exemplar;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exemplar | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      setExemplares(await api.exemplares.list());
    } catch {
      toast.error("Erro ao carregar catálogo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return exemplares;
    const q = search.toLowerCase();
    return exemplares.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.codigo.toLowerCase().includes(q) ||
        (e.autor ?? "").toLowerCase().includes(q)
    );
  }, [exemplares, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleSave(data: ExemplarInput) {
    setSaving(true);
    try {
      if (modal?.type === "edit" && modal.exemplar) {
        await api.exemplares.update(modal.exemplar.exemplarId, data);
        toast.success("Exemplar atualizado");
      } else {
        await api.exemplares.create(data);
        toast.success("Exemplar criado");
      }
      setModal(null);
      await load();
    } catch (e) {
      toast.error("Erro ao salvar", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.exemplares.delete(deleteTarget.exemplarId);
      toast.success("Exemplar removido");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error("Erro ao remover", e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl font-bold font-display"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
          >
            Catálogo
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {loading
              ? "Carregando acervo…"
              : `${exemplares.length.toLocaleString("pt-BR")} exemplares`}
          </p>
        </div>
        <Button size="sm" onClick={() => setModal({ type: "create" })}>
          <Plus size={13} strokeWidth={2.2} />
          Novo exemplar
        </Button>
      </motion.div>

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <Input
            className="pl-8"
            placeholder="Título, autor, código…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* View toggle */}
        <div
          className="flex items-center p-0.5 rounded-lg"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
          role="group"
          aria-label="Modo de visualização"
        >
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="p-2 rounded-md transition-all duration-150"
              style={{
                backgroundColor: view === v ? "var(--brand-subtle)" : "transparent",
                color: view === v ? "var(--brand)" : "var(--text-muted)",
              }}
              aria-pressed={view === v}
              aria-label={v === "grid" ? "Grade" : "Lista"}
            >
              {v === "grid" ? (
                <LayoutGrid size={14} />
              ) : (
                <List size={14} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Empty state ─── */}
      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 text-center"
        >
          <BookOpen
            size={48}
            strokeWidth={0.9}
            className="mx-auto mb-4"
            style={{ color: "var(--text-disabled)" }}
          />
          <p
            className="text-sm font-semibold font-display"
            style={{ color: "var(--text-secondary)" }}
          >
            {search ? "Nenhum resultado" : "Catálogo vazio"}
          </p>
          <p
            className="text-xs mt-1 max-w-xs mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            {search
              ? "Tente outros termos de busca"
              : "Adicione o primeiro exemplar para começar o acervo"}
          </p>
          {!search && (
            <Button
              size="sm"
              className="mt-5"
              onClick={() => setModal({ type: "create" })}
            >
              <Plus size={13} />
              Criar exemplar
            </Button>
          )}
        </motion.div>
      )}

      {/* ─── Loading state ─── */}
      {loading && <GridSkeleton />}

      {/* ─── Grid view ─── */}
      {!loading && filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {paginated.map((ex, i) => (
            <BookCardGrid
              key={ex.exemplarId}
              exemplar={ex}
              index={i}
              onEdit={() => setModal({ type: "edit", exemplar: ex })}
              onDelete={() => setDeleteTarget(ex)}
            />
          ))}
        </div>
      )}

      {/* ─── List view ─── */}
      {!loading && filtered.length > 0 && view === "list" && (
        <div className="card-elevated overflow-hidden rounded-xl">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["", "Título / Código", "Autor", "Classificação", "Tipo", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "py-2.5 text-[10px] font-bold uppercase tracking-wider",
                        i === 0 ? "pl-4 pr-2 w-14" : "pr-4"
                      )}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((ex, i) => (
                <BookRow
                  key={ex.exemplarId}
                  exemplar={ex}
                  index={i}
                  onEdit={() => setModal({ type: "edit", exemplar: ex })}
                  onDelete={() => setDeleteTarget(ex)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p style={{ color: "var(--text-muted)" }}>
            Página {curPage} de {totalPages} ·{" "}
            {filtered.length.toLocaleString("pt-BR")} resultados
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={curPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={curPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* ─── Create / Edit modal ─── */}
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.type === "edit" ? "Editar exemplar" : "Novo exemplar"}
        description={
          modal?.type === "edit"
            ? `Editando: ${modal.exemplar?.titulo}`
            : "Preencha as informações do exemplar"
        }
      >
        {modal && (
          <ExemplarForm
            initial={modal.type === "edit" ? modal.exemplar : undefined}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        )}
      </Dialog>

      {/* ─── Delete confirm ─── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirmar remoção"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Remover{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {deleteTarget.titulo}
              </strong>
              ? Esta ação é irreversível.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
              >
                Remover
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
