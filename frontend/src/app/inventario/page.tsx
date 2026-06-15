"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import type { Exemplar } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function InventarioPage() {
  const [exemplares, setExemplares] = useState<Exemplar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Estado do fluxo individual de "não encontrado"
  const [naoEncTarget, setNaoEncTarget] = useState<Exemplar | null>(null);
  const [naoEncObs, setNaoEncObs] = useState("");
  const [naoEncSaving, setNaoEncSaving] = useState(false);

  // Estado da importação por planilha
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importTotal, setImportTotal] = useState(0);
  const [importMatched, setImportMatched] = useState<Exemplar[]>([]);
  const [importNaoLocalizados, setImportNaoLocalizados] = useState<string[]>([]);
  const [importSaving, setImportSaving] = useState(false);

  const toast = useToast();

  function load() {
    setLoading(true);
    api.exemplares
      .list()
      .then(setExemplares)
      .catch(() => toast.error("Erro ao carregar exemplares"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Não inventariados = sem resultado de inventário no ano atual
  const naoInventariados = useMemo(
    () => exemplares.filter((e) => !e.situacaoInventario),
    [exemplares]
  );

  // Filtro de busca sobre a lista de pendentes
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return naoInventariados;
    return naoInventariados.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.titulo.toLowerCase().includes(q) ||
        String(e.numeroAcervo ?? "").includes(q)
    );
  }, [naoInventariados, search]);

  const visibleIds = filtrados.map((e) => e.exemplarId);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  // Marca todos os selecionados como ENCONTRADO (sem observação)
  async function marcarEncontrados() {
    const ids = [...selected];
    if (ids.length === 0) return;

    setBulkSaving(true);
    let ok = 0;
    let falhas = 0;
    for (const id of ids) {
      try {
        await api.inventario.registrar({
          invExemplarId: id,
          invResultado: "encontrado",
          invObservacao: null,
        });
        ok++;
      } catch {
        falhas++;
      }
    }
    setBulkSaving(false);
    setSelected(new Set());

    if (falhas === 0) {
      toast.success(
        "Inventário registrado",
        `${ok} exemplar${ok > 1 ? "es" : ""} marcado${ok > 1 ? "s" : ""} como encontrado.`
      );
    } else {
      toast.warning(
        "Registrado parcialmente",
        `${ok} com sucesso, ${falhas} falharam. Tente os que sobraram novamente.`
      );
    }
    load();
  }

  // Marca UM exemplar como NÃO ENCONTRADO (tratamento individual, exige observação)
  async function confirmarNaoEncontrado() {
    if (!naoEncTarget || !naoEncObs.trim()) return;
    setNaoEncSaving(true);
    try {
      await api.inventario.registrar({
        invExemplarId: naoEncTarget.exemplarId,
        invResultado: "nao_encontrado",
        invObservacao: naoEncObs.trim(),
      });
      toast.success(
        "Registrado como não encontrado",
        `${naoEncTarget.titulo} foi para a lista de não encontrados.`
      );
      setNaoEncTarget(null);
      setNaoEncObs("");
      load();
    } catch (e) {
      toast.error("Erro ao registrar", e instanceof Error ? e.message : undefined);
    } finally {
      setNaoEncSaving(false);
    }
  }

  // Lê a planilha: primeira coluna, TODAS as linhas (inclusive a primeira)
  async function handleArquivo(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    // permite re-selecionar o mesmo arquivo depois
    ev.target.value = "";
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // header: 1 => array de arrays, sem tratar a 1ª linha como cabeçalho
      const linhas = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
        header: 1,
        blankrows: false,
      });

      // Pega só a primeira coluna, descarta vazios, normaliza e remove duplicados
      const tombos = Array.from(
        new Set(
          linhas
            .map((l) => l?.[0])
            .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
            .map((v) => String(v).trim())
        )
      );

      if (tombos.length === 0) {
        toast.warning("Planilha vazia", "Nenhum tombo encontrado na primeira coluna.");
        return;
      }

      const porCodigo = new Map(exemplares.map((e) => [e.codigo.trim(), e]));
      const matched: Exemplar[] = [];
      const naoLocalizados: string[] = [];
      for (const t of tombos) {
        const ex = porCodigo.get(t);
        if (ex) matched.push(ex);
        else naoLocalizados.push(t);
      }

      setImportFileName(file.name);
      setImportTotal(tombos.length);
      setImportMatched(matched);
      setImportNaoLocalizados(naoLocalizados);
      setImportOpen(true);
    } catch {
      toast.error("Erro ao ler a planilha", "Confira se o arquivo é um .xlsx válido.");
    }
  }

  // Confirma a importação: marca todos os localizados como ENCONTRADO
  async function confirmarImportacao() {
    if (importMatched.length === 0) return;
    setImportSaving(true);
    let ok = 0;
    let falhas = 0;
    for (const ex of importMatched) {
      try {
        await api.inventario.registrar({
          invExemplarId: ex.exemplarId,
          invResultado: "encontrado",
          invObservacao: null,
        });
        ok++;
      } catch {
        falhas++;
      }
    }
    setImportSaving(false);
    setImportOpen(false);

    if (falhas === 0) {
      toast.success(
        "Importação concluída",
        `${ok} exemplar${ok > 1 ? "es" : ""} marcado${ok > 1 ? "s" : ""} como encontrado.`
      );
    } else {
      toast.warning(
        "Importado parcialmente",
        `${ok} com sucesso, ${falhas} falharam.`
      );
    }
    load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold font-display"
          style={{ color: "var(--text-primary)" }}
        >
          Registrar Inventário
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Marque os exemplares pendentes. Selecione vários para registrar como{" "}
          <strong style={{ color: "var(--success)" }}>encontrados</strong> de uma vez;{" "}
          <strong style={{ color: "var(--danger)" }}>não encontrado</strong> é registrado
          item a item, com observação.
        </p>
      </div>

      {/* Card da lista */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card p-0 overflow-hidden"
      >
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-3 p-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            />
            <Input
              className="pl-8"
              placeholder="Buscar por tombo, título ou acervo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {selected.size > 0
              ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}`
              : `${naoInventariados.length} pendente${naoInventariados.length === 1 ? "" : "s"}`}
          </span>

          <Button
            size="sm"
            onClick={marcarEncontrados}
            loading={bulkSaving}
            disabled={selected.size === 0}
          >
            <CheckCircle2 size={14} strokeWidth={2} />
            Marcar como encontrado
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet size={14} strokeWidth={2} />
            Importar planilha
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleArquivo}
            className="hidden"
          />
        </div>

        {/* Orientação do formato do arquivo */}
        <div
          className="flex items-start gap-2 px-4 py-2.5 text-[11px]"
          style={{
            color: "var(--text-muted)",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <FileSpreadsheet size={13} className="mt-0.5 flex-shrink-0" />
          <span>
            <strong>Importar por planilha:</strong> use a <strong>primeira coluna</strong>,
            um número de tombo por linha — <strong>inclua a primeira linha</strong> (sem
            cabeçalho). Os exemplares correspondentes serão marcados como{" "}
            <strong style={{ color: "var(--success)" }}>encontrados</strong>. Dica: formate a
            coluna como <em>Texto</em> no Excel para não perder zeros à esquerda.
          </span>
        </div>

        {/* Cabeçalho da tabela */}
        {!loading && filtrados.length > 0 && (
          <div
            className="grid items-center gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wide"
            style={{
              gridTemplateColumns: "28px 120px 90px 1fr 130px",
              color: "var(--text-muted)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              aria-label="Selecionar todos visíveis"
              style={{ accentColor: "var(--brand)", cursor: "pointer" }}
            />
            <span>Tombo</span>
            <span>Acervo</span>
            <span>Título</span>
            <span></span>
          </div>
        )}

        {/* Linhas */}
        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Carregando exemplares…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2
              size={28}
              className="mx-auto mb-2"
              style={{ color: "var(--success)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {naoInventariados.length === 0
                ? "Nenhum exemplar pendente — o inventário do ano está completo."
                : "Nenhum pendente corresponde à busca."}
            </p>
          </div>
        ) : (
          <ul>
            {filtrados.map((e) => {
              const checked = selected.has(e.exemplarId);
              return (
                <li
                  key={e.exemplarId}
                  className="grid items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{
                    gridTemplateColumns: "28px 120px 90px 1fr 130px",
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: checked ? "var(--brand-subtle)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(e.exemplarId)}
                    aria-label={`Selecionar ${e.titulo}`}
                    style={{ accentColor: "var(--brand)", cursor: "pointer" }}
                  />
                  <span
                    className="text-xs font-mono truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {e.codigo}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {e.numeroAcervo ?? "—"}
                  </span>
                  <span
                    className="text-sm truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {e.titulo}
                  </span>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNaoEncTarget(e);
                        setNaoEncObs("");
                      }}
                    >
                      <XCircle size={13} strokeWidth={2} style={{ color: "var(--danger)" }} />
                      Não encontrado
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
        <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          <li>
            · A lista mostra só os exemplares <strong>ainda não inventariados</strong> neste
            ano. Ao registrar, eles saem da lista automaticamente.
          </li>
          <li>
            · Se o mesmo exemplar for registrado mais de uma vez no ano, o sistema mantém
            apenas o registro mais recente (UPSERT).
          </li>
          <li>
            · <code className="font-mono">não encontrado</code> exige observação, por isso é
            tratado um a um.
          </li>
        </ul>
      </div>

      {/* Diálogo: não encontrado (individual) */}
      <Dialog
        open={naoEncTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setNaoEncTarget(null);
            setNaoEncObs("");
          }
        }}
        title="Marcar como não encontrado"
        description={
          naoEncTarget
            ? `${naoEncTarget.titulo} · tombo ${naoEncTarget.codigo}`
            : undefined
        }
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Motivo / observação <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <Textarea
              value={naoEncObs}
              onChange={(e) => setNaoEncObs(e.target.value)}
              placeholder="Ex.: não localizado na estante durante o inventário"
              rows={3}
            />
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Obrigatória para itens não encontrados.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNaoEncTarget(null);
                setNaoEncObs("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={naoEncSaving}
              disabled={!naoEncObs.trim()}
              onClick={confirmarNaoEncontrado}
            >
              <ClipboardCheck size={14} strokeWidth={2} />
              Confirmar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Diálogo: confirmação da importação por planilha */}
      <Dialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Confirmar importação"
        description={importFileName ? `Arquivo: ${importFileName}` : undefined}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div
              className="flex-1 rounded-lg p-3 text-center"
              style={{ backgroundColor: "var(--success-subtle)", border: "1px solid var(--success)" }}
            >
              <p className="text-2xl font-semibold" style={{ color: "var(--success)" }}>
                {importMatched.length}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                serão marcados como encontrados
              </p>
            </div>
            <div
              className="flex-1 rounded-lg p-3 text-center"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                {importTotal}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                tombos lidos na planilha
              </p>
            </div>
          </div>

          {importNaoLocalizados.length > 0 && (
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: "var(--danger-subtle)", border: "1px solid var(--danger)" }}
            >
              <p
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "var(--danger)" }}
              >
                <AlertTriangle size={13} strokeWidth={2} />
                {importNaoLocalizados.length} tombo
                {importNaoLocalizados.length > 1 ? "s" : ""} não localizado
                {importNaoLocalizados.length > 1 ? "s" : ""} no catálogo (serão ignorados)
              </p>
              <p
                className="mt-1.5 text-[11px] font-mono max-h-24 overflow-y-auto break-words"
                style={{ color: "var(--text-secondary)" }}
              >
                {importNaoLocalizados.join(", ")}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              loading={importSaving}
              disabled={importMatched.length === 0}
              onClick={confirmarImportacao}
            >
              <CheckCircle2 size={14} strokeWidth={2} />
              Marcar {importMatched.length} como encontrado
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
