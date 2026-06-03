"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Search, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Exemplar, InventarioInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type Resultado = "encontrado" | "nao_encontrado";

export default function InventarioPage() {
  const [exemplares, setExemplares] = useState<Exemplar[]>([]);
  const [loadingEx, setLoadingEx] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Exemplar | null>(null);
  const [resultado, setResultado] = useState<Resultado>("encontrado");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.exemplares
      .list()
      .then(setExemplares)
      .catch(() => toast.error("Erro ao carregar exemplares"))
      .finally(() => setLoadingEx(false));
  }, []);

  const suggestions = search.trim()
    ? exemplares
        .filter((e) => {
          const q = search.toLowerCase();
          return (
            e.titulo.toLowerCase().includes(q) ||
            e.codigo.toLowerCase().includes(q) ||
            (e.autor ?? "").toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  function selectExemplar(e: Exemplar) {
    setSelected(e);
    setSearch(e.titulo);
    setSearchOpen(false);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!selected) {
      toast.warning("Selecione um exemplar");
      return;
    }
    if (resultado === "nao_encontrado" && !observacao.trim()) {
      toast.warning("Observação obrigatória", "Informe o motivo para exemplares não encontrados");
      return;
    }

    setSaving(true);
    try {
      const payload: InventarioInput = {
        invExemplarId: selected.exemplarId,
        invResultado: resultado,
        invObservacao: resultado === "nao_encontrado" ? observacao.trim() : null,
      };
      await api.inventario.registrar(payload);
      toast.success(
        "Inventário registrado",
        `${selected.titulo} marcado como ${resultado === "encontrado" ? "encontrado" : "não encontrado"}`
      );
      setSelected(null);
      setSearch("");
      setResultado("encontrado");
      setObservacao("");
    } catch (e) {
      toast.error("Erro ao registrar", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold font-display"
          style={{ color: "var(--text-primary)" }}
        >
          Registrar Inventário
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Registre a situação de um exemplar durante o inventário anual.
        </p>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card p-6 space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Exemplar search */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Exemplar <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
              <Input
                className="pl-8"
                placeholder="Buscar por título, código ou autor…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelected(null);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                disabled={loadingEx}
                autoComplete="off"
              />

              {/* Dropdown suggestions */}
              {searchOpen && suggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 8px 24px oklch(0 0 0 / 0.12)",
                  }}
                >
                  {suggestions.map((e) => (
                    <button
                      type="button"
                      key={e.exemplarId}
                      onClick={() => selectExemplar(e)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--brand-subtle)]"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {e.titulo}
                        </p>
                        <p
                          className="text-xs font-mono mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {e.codigo}
                          {e.autor && ` · ${e.autor}`}
                        </p>
                      </div>
                      {e.tipoObra && (
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {e.tipoObra}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected exemplar info */}
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg mt-1"
                style={{
                  backgroundColor: "var(--brand-subtle)",
                  border: "1px solid var(--brand)",
                }}
              >
                <CheckCircle2
                  size={13}
                  style={{ color: "var(--brand)", flexShrink: 0 }}
                />
                <span className="text-xs" style={{ color: "var(--brand)" }}>
                  Selecionado:{" "}
                  <strong>
                    {selected.titulo}
                  </strong>{" "}
                  (#{selected.exemplarId})
                </span>
              </motion.div>
            )}
          </div>

          {/* Resultado */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Resultado <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <ResultadoButton
                value="encontrado"
                current={resultado}
                onChange={setResultado}
                icon={<CheckCircle2 size={16} strokeWidth={2} />}
                label="Encontrado"
                description="Exemplar localizado na prateleira"
                color="var(--success)"
                bg="var(--success-subtle)"
              />
              <ResultadoButton
                value="nao_encontrado"
                current={resultado}
                onChange={setResultado}
                icon={<XCircle size={16} strokeWidth={2} />}
                label="Não encontrado"
                description="Exemplar ausente da prateleira"
                color="var(--danger)"
                bg="var(--danger-subtle)"
              />
            </div>
          </div>

          {/* Observação (obrigatória se não encontrado) */}
          {resultado === "nao_encontrado" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5"
            >
              <label
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Observação{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
                <span
                  className="ml-1.5 text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  (obrigatório para não encontrado)
                </span>
              </label>
              <Textarea
                placeholder="Ex: Emprestado para aluno João Silva. Livro reservado. Em revisão…"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Se o exemplar estiver emprestado, o sistema gera a observação automaticamente
                quando o empréstimo estiver registrado.
              </p>
            </motion.div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {resultado === "encontrado" && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Sem observação necessária para exemplares encontrados.
                </p>
              )}
            </div>
            <Button type="submit" loading={saving} disabled={!selected}>
              <ClipboardCheck size={14} strokeWidth={2} />
              Registrar resultado
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Info card */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          backgroundColor: "var(--brand-subtle)",
          border: "1px solid var(--brand)",
        }}
      >
        <p className="font-medium text-xs" style={{ color: "var(--brand)" }}>
          Como funciona o inventário
        </p>
        <ul
          className="mt-2 space-y-1 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          <li>
            · Se o mesmo exemplar for registrado mais de uma vez no ano, o sistema
            mantém apenas o registro mais recente (UPSERT).
          </li>
          <li>
            · Exemplares com empréstimos ativos geram observação automática na
            listagem de não encontrados.
          </li>
          <li>
            · Apenas <code className="font-mono">encontrado</code> ou{" "}
            <code className="font-mono">nao_encontrado</code> são valores válidos.
          </li>
        </ul>
      </div>
    </div>
  );
}

function ResultadoButton({
  value,
  current,
  onChange,
  icon,
  label,
  description,
  color,
  bg,
}: {
  value: Resultado;
  current: Resultado;
  onChange: (v: Resultado) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bg: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className="flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all duration-150"
      style={{
        backgroundColor: active ? bg : "var(--surface)",
        border: `1.5px solid ${active ? color : "var(--border)"}`,
        boxShadow: active ? `0 0 0 1px ${color}33` : "none",
      }}
      aria-pressed={active}
    >
      <span style={{ color: active ? color : "var(--text-muted)" }}>{icon}</span>
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: active ? color : "var(--text-primary)" }}
        >
          {label}
        </p>
        <p
          className="text-xs mt-0.5 leading-snug"
          style={{ color: "var(--text-muted)" }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}
