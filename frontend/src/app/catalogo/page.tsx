"use client";

import * as XLSX from "xlsx";
import { useEffect, useState, useMemo, ChangeEvent } from "react";
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
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  XCircle,
  X,
  Upload,
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
type SortField = "titulo" | "autor" | "classificacao" | "tipoObra" | "codigo";

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

const TIPOS_MATERIAL = [
  "Catálogo manual", "CD", "Dissertação", "DVD", "Evento", "Folheto",
  "Livro", "Outro", "Periódico", "Tese", "Trabalho acadêmico/TCC",
];

const SITUACOES_EXEMPLAR = [
  "Normal", "Excluído", "Indisponível", "Processamento", "Malote",
  "Emprestado permanente", "Inventario", "Encadernação", "Embargado",
  "Balcão", "Desbaste", "Quarentena",
];

const MODOS_AQUISICAO = [
  "Compra", "Doação", "Permuta", "Não identificado", "Multa",
  "Outra", "Reposição", "Assinatura", "Verba Projeto",
];

function DetailRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div
      className="flex justify-between gap-4 py-1.5 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs font-medium text-right" style={{ color: "var(--text-primary)" }}>
        {value === null || value === "" ? "—" : value}
      </span>
    </div>
  );
}

function InventarioBadge({ situacao }: { situacao: string | null }) {
  if (situacao === "encontrado")
    return <Badge variant="success" className="text-[9px]">Encontrado</Badge>;
  if (situacao === "nao_encontrado")
    return <Badge variant="danger" className="text-[9px]">Não encontrado</Badge>;
  return <Badge variant="outline" className="text-[9px]">Não inventariado</Badge>;
}
function SelectCheckbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        "flex items-center justify-center w-5 h-5 rounded-md border transition-colors",
        className
      )}
      style={{
        backgroundColor: checked ? "var(--brand)" : "var(--surface)",
        borderColor: checked ? "var(--brand)" : "var(--border)",
        color: "oklch(0.98 0 0)",
      }}
    >
      {checked && <Check size={13} strokeWidth={3} />}
    </button>
  );
}

function BookCardGrid({
  exemplar,
  index,
  onEdit,
  onDelete,
  selected,
  onToggleSelect,
  onOpenDetail,
}: {
  exemplar: Exemplar;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.04, 0.5), duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
      whileHover={{ y: -5, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      onClick={onOpenDetail}
      className="book-card group cursor-pointer card-elevated"
      style={{
        borderRadius: 12,
        overflow: "hidden",
        outline: selected ? "2px solid var(--brand)" : "none",
        outlineOffset: 2,
      }}
    >
      {/* ─── Book cover (aspect ratio 3:4) ─── */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
        <BookCover titulo={exemplar.titulo} />
        
        <div className="absolute top-2 left-2 z-10">
          <SelectCheckbox
            checked={selected}
            onChange={onToggleSelect}
            className="shadow-md"
          />
        </div>

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
          <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
            {exemplar.numeroAcervo != null ? `Acervo ${exemplar.numeroAcervo}` : `#${exemplar.codigo}`}
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
        <div className="pt-0.5">
          <InventarioBadge situacao={exemplar.situacaoInventario} />
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
  selected,
  onToggleSelect,
  onOpenDetail,
}: {
  exemplar: Exemplar;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.4) }}
      onClick={onOpenDetail}
      className="table-row-hover group transition-colors cursor-pointer"
      style={{
        borderRadius: 12,
        overflow: "hidden",
        outline: selected ? "2px solid var(--brand)" : "none",
        outlineOffset: 2,
      }}
    >
     {/* Checkbox */}
      <td className="py-2.5 pl-4 pr-2">
        <SelectCheckbox checked={selected} onChange={onToggleSelect} />
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

      {/* Inventário */}
      <td className="py-2.5 pr-4">
        <InventarioBadge situacao={exemplar.situacaoInventario} />
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
  onSubmit: (data: ExemplarInput, inv: { resultado: string; observacao: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ExemplarInput>({
    inpCodigo: initial?.codigo ?? "",
    inpTitulo: initial?.titulo ?? "",
    inpAutor: initial?.autor ?? null,
    inpClassificacao: initial?.classificacao ?? null,
    inpTipoObra: initial?.tipoObra ?? null,
    inpSituacaoSistema: initial?.situacaoSistema ?? "Normal",
    inpNumeroAcervo: initial?.numeroAcervo ?? null,
    inpNumeroExemplar: initial?.numeroExemplar ?? null,
    inpModoAquisicao: initial?.modoAquisicao ?? null,
    inpDataAquisicao: initial?.dataAquisicao ?? null,
  });

  const [invSituacao, setInvSituacao] = useState<string>(initial?.situacaoInventario ?? "");
  const [invObs, setInvObs] = useState<string>("");

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

  const selectField = (label: string, k: keyof ExemplarInput, options: string[], emptyLabel = "—") => (
    <div className="space-y-1.5" key={k}>
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <select
        value={(form[k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value)}
        className="w-full h-9 px-2.5 text-sm rounded-lg outline-none cursor-pointer"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const numField = (label: string, k: keyof ExemplarInput, placeholder = "") => (
    <div className="space-y-1.5" key={k}>
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <Input
        type="number"
        value={(form[k] as number | null) ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value === "" ? null : Number(e.target.value) }))}
        placeholder={placeholder}
      />
    </div>
  );

  const dateField = (label: string, k: keyof ExemplarInput) => (
    <div className="space-y-1.5" key={k}>
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <Input type="date" value={(form[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.inpCodigo || !form.inpTitulo) return;
        if (invSituacao === "nao_encontrado" && !invObs.trim()) return;
        onSubmit(form, { resultado: invSituacao, observacao: invObs.trim() });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {field("Tombo", "inpCodigo", true, "ex: 1455")}
        {selectField("Tipo de material", "inpTipoObra", TIPOS_MATERIAL)}
      </div>
      {field("Título", "inpTitulo", true, "Nome completo da obra")}
      {field("Autor", "inpAutor", false, "Nome do autor")}
      {field("Classificação", "inpClassificacao", false, "ex: 611.8 M1491n")}

      <div className="grid grid-cols-2 gap-3">
        {numField("Nº do acervo", "inpNumeroAcervo", "ex: 12345")}
        {numField("Nº do exemplar", "inpNumeroExemplar", "ex: 1")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Situação do exemplar
          </label>
          <select
            value={form.inpSituacaoSistema ?? "Normal"}
            onChange={(e) => set("inpSituacaoSistema", e.target.value)}
            className="w-full h-9 px-2.5 text-sm rounded-lg outline-none cursor-pointer"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            {SITUACOES_EXEMPLAR.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {selectField("Modo de aquisição", "inpModoAquisicao", MODOS_AQUISICAO)}
      </div>

      {dateField("Data de aquisição", "inpDataAquisicao")}

      {/* Situação de inventário */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Situação de inventário
        </label>
        <select
          value={invSituacao}
          onChange={(e) => setInvSituacao(e.target.value)}
          className="w-full h-9 px-2.5 text-sm rounded-lg outline-none cursor-pointer"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="">Não inventariado</option>
          <option value="encontrado">Encontrado</option>
          <option value="nao_encontrado">Não encontrado</option>
        </select>
      </div>

      {invSituacao === "nao_encontrado" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Motivo <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <Textarea
            value={invObs}
            onChange={(e) => setInvObs(e.target.value)}
            placeholder="Ex.: não localizado na estante"
            rows={2}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          loading={loading}
          disabled={invSituacao === "nao_encontrado" && !invObs.trim()}
        >
          {initial?.exemplarId ? "Salvar alterações" : "Criar exemplar"}
        </Button>
      </div>
    </form>
  );
}

type LinhaImport = {
  inpCodigo: string;
  inpTitulo: string;
  inpAutor: string | null;
  inpClassificacao: string | null;
  inpTipoObra: string | null;
  inpSituacaoSistema: string | null;
  inpNumeroAcervo: number | null;
  inpNumeroExemplar: number | null;
  inpModoAquisicao: string | null;
  inpDataAquisicao: string | null;
};

function ImportarPergamum({
  open,
  onClose,
  existentes,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  existentes: Set<string>;
  onDone: () => void;
}) {
  const toast = useToast();
  const [linhas, setLinhas] = useState<LinhaImport[]>([]);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState("");

  function limpar() {
    setLinhas([]);
    setErro("");
  }

  async function aoSelecionar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        defval: "",
      });

      // Colunas (A=0): B=1, E=4, F=5, G=6, H=7, P=15, AA=26, AP=41
      const norm = (v: unknown) => String(v ?? "").trim();
      const toInt = (v: unknown): number | null => {
        const s = String(v ?? "").replace(/\D/g, ""); // só dígitos
        return s === "" ? null : Number(s);
      };

      const toData = (v: unknown): string | null => {
        const s = String(v ?? "").trim();
        if (!s) return null;
        // dd/mm/aaaa  →  aaaa-mm-dd
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m) {
          const [, d, mes, a] = m;
          return `${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        // já em aaaa-mm-dd
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        return null; // formato desconhecido → ignora a data
      };
      const parsed: LinhaImport[] = [];
      for (const r of rows.slice(1)) {
        const codigo = norm(r[1]);
        const principal = norm(r[5]) || norm(r[6]); // título: F ou G
        if (!codigo || !principal) continue;        // pula cabeçalhos/vazios

        const sub = norm(r[7]);                       // subtítulo (H)
        parsed.push({
          inpCodigo: codigo,
          inpTitulo: sub ? `${principal} : ${sub}` : principal,
          inpAutor: norm(r[4]) || null,
          inpClassificacao: norm(r[15]) || null,
          inpTipoObra: norm(r[26]) || null,
          inpSituacaoSistema: norm(r[41]) || null,
          inpNumeroAcervo: toInt(r[0]),    // coluna A
          inpNumeroExemplar: toInt(r[30]), // coluna AE
          inpModoAquisicao: norm(r[3]) || null, // coluna D
          inpDataAquisicao: toData(r[35]),  // coluna AJ
        });
      }

      if (parsed.length === 0)
        setErro("Não encontrei linhas válidas. Confira se é o relatório certo.");
      setLinhas(parsed);
    } catch {
      setErro("Não consegui ler o arquivo. Ele é um Excel (.xlsx)?");
      setLinhas([]);
    }
  }

  const novos = linhas.filter((l) => !existentes.has(l.inpCodigo));
  const jaExistem = linhas.length - novos.length;

  async function importar() {
    setImportando(true);
    let ok = 0;
    let falhas = 0;
    try {
      for (const l of novos) {
        try {
          await api.exemplares.create(l);
          ok++;
        } catch {
          falhas++;
        }
      }
      toast.success(
        `${ok} importado${ok !== 1 ? "s" : ""}`,
        `${jaExistem} já existiam · ${falhas} com erro`
      );
      limpar();
      onClose();
      onDone();
    } finally {
      setImportando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) { limpar(); onClose(); } }}
      title="Importar do Pergamum"
      size="lg"
    >
      <div className="space-y-4">
        <div
          className="text-xs leading-relaxed rounded-lg p-3"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          Anexe o relatório <strong>“Material por situação — Situação exemplar (102)”</strong> emitido
          pelo Pergamum, em formato Excel (.xlsx). Os campos (tombo, título, autor, classificação,
          tipo e situação) são lidos automaticamente das colunas do relatório.
        </div>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={aoSelecionar}
          className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:text-xs file:font-medium file:cursor-pointer file:bg-[var(--surface)] file:border-[var(--border)] file:text-[var(--text-secondary)]"
          style={{ color: "var(--text-muted)" }}
        />

        {erro && <p className="text-xs" style={{ color: "var(--danger)" }}>{erro}</p>}

        {linhas.length > 0 && (
          <>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <strong>{linhas.length}</strong> lida{linhas.length !== 1 ? "s" : ""} ·{" "}
              <strong style={{ color: "var(--brand)" }}>{novos.length}</strong> nova{novos.length !== 1 ? "s" : ""}
              {jaExistem > 0 && <> · {jaExistem} já cadastrada{jaExistem !== 1 ? "s" : ""} (ignoradas)</>}
            </div>

            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0" style={{ backgroundColor: "var(--surface)" }}>
                    <tr style={{ color: "var(--text-muted)" }}>
                      <th className="text-left p-2">Tombo</th>
                      <th className="text-left p-2">Título</th>
                      <th className="text-left p-2">Autor</th>
                      <th className="text-left p-2">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.slice(0, 50).map((l, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        <td className="p-2 font-mono">{l.inpCodigo}</td>
                        <td className="p-2">{l.inpTitulo}</td>
                        <td className="p-2">{l.inpAutor ?? "—"}</td>
                        <td className="p-2">{l.inpTipoObra ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {linhas.length > 50 && (
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Mostrando as 50 primeiras de {linhas.length}.
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => { limpar(); onClose(); }}>
            Cancelar
          </Button>
          <Button size="sm" loading={importando} disabled={novos.length === 0} onClick={importar}>
            Importar {novos.length || ""} exemplar{novos.length !== 1 ? "es" : ""}
          </Button>
        </div>
      </div>
    </Dialog>
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
  const [importOpen, setImportOpen] = useState(false);
  const [exemplares, setExemplares] = useState<Exemplar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [invFilter, setInvFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortField>("titulo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modal, setModal] = useState<{
    type: "create" | "edit";
    exemplar?: Exemplar;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exemplar | null>(null);
  const [detail, setDetail] = useState<Exemplar | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

// tipos únicos presentes no acervo, para o seletor de filtro
  const tipos = useMemo(
    () =>
      Array.from(
        new Set(exemplares.map((e) => e.tipoObra).filter(Boolean))
      ) as string[],
    [exemplares]
  );

  const filtered = useMemo(() => {
    let list = exemplares;

    // 1) busca textual
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.codigo.toLowerCase().includes(q) ||
          (e.autor ?? "").toLowerCase().includes(q)
      );
    }

    // 2) filtro por tipo
    if (tipoFilter) {
      list = list.filter((e) => e.tipoObra === tipoFilter);
    }

    // filtro por situação de inventário
    if (invFilter) {
      list = list.filter((e) =>
        invFilter === "nao_inventariado"
          ? !e.situacaoInventario
          : e.situacaoInventario === invFilter
      );
    }

    // 3) ordenação (campos vazios vão sempre para o fim)
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const va = a[sortBy] ?? "";
      const vb = b[sortBy] ?? "";
      if (va === "" && vb !== "") return 1;
      if (vb === "" && va !== "") return -1;
      return (
        va.localeCompare(vb, "pt-BR", { numeric: true, sensitivity: "base" }) *
        dir
      );
    });

    return list;
  }, [exemplares, search, tipoFilter, invFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  async function handleSave(
    data: ExemplarInput,
    inv: { resultado: string; observacao: string }
  ) {
    setSaving(true);
    try {
      let exId: number;
      if (modal?.type === "edit" && modal.exemplar) {
        await api.exemplares.update(modal.exemplar.exemplarId, data);
        exId = modal.exemplar.exemplarId;
        toast.success("Exemplar atualizado");
      } else {
        const res = await api.exemplares.create(data);
        exId = res.id;
        toast.success("Exemplar criado");
      }

      // registra a situação de inventário, se alguma foi escolhida
      if (inv.resultado) {
        await api.inventario.registrar({
          invExemplarId: exId,
          invResultado: inv.resultado as "encontrado" | "nao_encontrado",
          invObservacao: inv.resultado === "nao_encontrado" ? inv.observacao : null,
        });
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

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkDelete() {
    setBulkSaving(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await api.exemplares.delete(id);
      }
      toast.success(
        `${ids.length} ${ids.length === 1 ? "exemplar excluído" : "exemplares excluídos"}`
      );
      clearSelection();
      setBulkDeleteOpen(false);
      await load();
    } catch (e) {
      toast.error("Erro ao excluir", e instanceof Error ? e.message : undefined);
    } finally {
      setBulkSaving(false);
    }
  }
  async function bulkMark(
    resultado: "encontrado" | "nao_encontrado",
    obs: string | null
  ) {
    setBulkSaving(true);
    try {
      // sequencial de propósito: o backend usa uma conexão única,
      // então as requisições não devem ser concorrentes
      const ids = Array.from(selected);
      for (const id of ids) {
        await api.inventario.registrar({
          invExemplarId: id,
          invResultado: resultado,
          invObservacao: obs,
        });
      }
      toast.success(
        `${ids.length} ${ids.length === 1 ? "exemplar atualizado" : "exemplares atualizados"}`
      );
      clearSelection();
      await load();
    } catch (e) {
      toast.error("Erro ao atualizar", e instanceof Error ? e.message : undefined);
    } finally {
      setBulkSaving(false);
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
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload size={14} /> Importar do Pergamum
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

        {/* Filtro por tipo */}
        <select
          value={tipoFilter}
          onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
          className="h-9 px-2.5 text-sm rounded-lg outline-none cursor-pointer"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Filtro por situação de inventário */}
        <select
          value={invFilter}
          onChange={(e) => { setInvFilter(e.target.value); setPage(1); }}
          className="h-9 px-2.5 text-sm rounded-lg outline-none cursor-pointer"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          aria-label="Filtrar por situação de inventário"
        >
          <option value="">Toda situação</option>
          <option value="encontrado">Encontrados</option>
          <option value="nao_encontrado">Não encontrados</option>
          <option value="nao_inventariado">Não inventariados</option>
        </select>

        {/* Ordenar por */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortField); setPage(1); }}
          className="h-9 px-2.5 text-sm rounded-lg outline-none cursor-pointer"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          aria-label="Ordenar por"
        >
          <option value="titulo">Título</option>
          <option value="autor">Autor</option>
          <option value="classificacao">Classificação</option>
          <option value="tipoObra">Tipo</option>
          <option value="codigo">Código</option>
        </select>

        {/* Direção da ordenação */}
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
          aria-label={sortDir === "asc" ? "Crescente" : "Decrescente"}
          title={sortDir === "asc" ? "Crescente (A→Z)" : "Decrescente (Z→A)"}
        >
          {sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        </button>

        {/* View toggle */}
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

      {/* ─── List view ─── */}
      {!loading && filtered.length > 0 && (
        <div className="card-elevated overflow-hidden rounded-xl">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["", "Título / Código", "Autor", "Classificação", "Tipo", "Inventário", ""].map(
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
                  selected={selected.has(ex.exemplarId)}
                  onToggleSelect={() => toggleSelect(ex.exemplarId)}
                  onOpenDetail={() => setDetail(ex)}
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

      {/* ─── Barra de ações em massa ─── */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl card-elevated"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 30px oklch(0 0 0 / 0.18)",
          }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            variant="outline"
            loading={bulkSaving}
            onClick={() => bulkMark("encontrado", null)}
          >
            <CheckCircle2 size={14} /> Encontrado
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={bulkSaving}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 size={14} /> Excluir
          </Button>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Limpar seleção"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}

      {/* ─── Create / Edit modal ─── */}
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.type === "edit" ? "Editar exemplar" : "Novo exemplar"}
        size="lg"
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

      {/* ─── Motivo para "não encontrado" ─── */}
      {/* ─── Excluir selecionados ─── */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
        title="Excluir selecionados"
        description={`${selected.size} exemplar${selected.size > 1 ? "es serão excluídos" : " será excluído"} permanentemente.`}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setBulkDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" loading={bulkSaving} onClick={bulkDelete}>
            Excluir {selected.size}
          </Button>
        </div>
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

      {/* ─── Detalhes do exemplar ─── */}
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail?.titulo ?? "Detalhes"}
        description={detail?.autor ?? undefined}
      >
        {detail && (
          <div className="space-y-3">
            <div>
              <DetailRow label="Nº do acervo" value={detail.numeroAcervo} />
              <DetailRow label="Nº do exemplar" value={detail.numeroExemplar} />
              <DetailRow label="Tombo" value={detail.codigo} />
              <DetailRow label="Tipo de material" value={detail.tipoObra} />
              <DetailRow label="Classificação" value={detail.classificacao} />
              <DetailRow label="Situação do exemplar" value={detail.situacaoSistema} />
              <DetailRow label="Modo de aquisição" value={detail.modoAquisicao} />
              <DetailRow
                label="Data de aquisição"
                value={detail.dataAquisicao ? detail.dataAquisicao.split("-").reverse().join("/") : null}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Situação de inventário
              </span>
              <InventarioBadge situacao={detail.situacaoInventario} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ex = detail;
                  setDetail(null);
                  setModal({ type: "edit", exemplar: ex });
                }}
              >
                <Pencil size={14} /> Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ImportarPergamum
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existentes={new Set(exemplares.map((e) => e.codigo))}
        onDone={load}
      />


    </div>
  );
}
