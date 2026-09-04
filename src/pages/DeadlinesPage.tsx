import { useMemo, useState } from "react";
import { Calendar, Clock, AlertTriangle, Plus, Pencil, Trash2, Power } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDeadlines, useActivities } from "@/lib/hooks";
import {
  Card,
  PageHeader,
  Button,
  EmptyState,
  Spinner,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { DEADLINE_TYPE_META, formatDate, daysUntil } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Deadline } from "@/lib/types";

export function DeadlinesPage() {
  const { profile } = useAuth();
  const { deadlines, loading, reload } = useDeadlines();
  const { activities } = useActivities();
  const isAdmin = profile?.role === "ctes" || profile?.role === "admin";
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({
    activity_id: "",
    deadline_type: "matricula" as Deadline["deadline_type"],
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    due_date: "",
  });

  function openNew() {
    setEditing(null);
    setForm({ activity_id: "", deadline_type: "matricula", title: "", description: "", start_date: "", end_date: "", due_date: "" });
    setShowModal(true);
  }

  function openEdit(d: Deadline) {
    setEditing(d);
    setForm({
      activity_id: d.activity_id || "",
      deadline_type: d.deadline_type,
      title: d.title,
      description: d.description || "",
      start_date: d.start_date || "",
      end_date: d.end_date || "",
      due_date: d.due_date || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!profile) return;
    const payload = {
      activity_id: form.activity_id || null,
      deadline_type: form.deadline_type,
      title: form.title,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      due_date: form.due_date || null,
      created_by: editing ? undefined : profile.id,
    };

    if (editing) {
      await supabase.from("deadlines").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("deadlines").insert({ ...payload, is_active: true });
    }
    setShowModal(false);
    await reload();
  }

  async function handleDelete(d: Deadline) {
    if (!confirm(`Excluir o prazo "${d.title}"?`)) return;
    await supabase.from("deadlines").delete().eq("id", d.id);
    await reload();
  }

  async function handleToggleActive(d: Deadline) {
    await supabase.from("deadlines").update({ is_active: !d.is_active }).eq("id", d.id);
    await reload();
  }

  async function handleProrrogate(d: Deadline) {
    const newDate = prompt("Nova data de vencimento (AAAA-MM-DD):", d.due_date ?? "");
    if (!newDate) return;
    await supabase.from("deadlines").update({ due_date: newDate }).eq("id", d.id);
    await reload();
  }

  const filtered = useMemo(() => {
    let list = deadlines;
    if (!isAdmin || !showInactive) {
      list = list.filter((d) => d.is_active);
    }
    return [...list].sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return da - db;
    });
  }, [deadlines, isAdmin, showInactive]);

  const grouped = useMemo(() => {
    const groups: Record<string, Deadline[]> = { Geral: [] };
    for (const d of filtered) {
      const key = d.activity?.code || "Geral";
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Prazos"
        subtitle="Calendário de matrícula, entrega e defesa."
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowInactive((v) => !v)}>
                {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
              </Button>
            )}
            {isAdmin && (
              <Button onClick={openNew}>
                <Plus className="w-4 h-4" /> Novo prazo
              </Button>
            )}
          </div>
        }
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Calendar className="w-10 h-10" />}
            title="Nenhum prazo cadastrado"
            description={isAdmin ? "Cadastre prazos para as atividades." : "Aguarde a CTES cadastrar prazos."}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupKey, groupDeadlines]) => (
            <div key={groupKey}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {groupKey === "Geral" ? "Prazos gerais" : groupKey}
              </h3>
              <div className="space-y-3">
                {groupDeadlines.map((d) => {
                  const days = daysUntil(d.due_date);
                  const isOverdue = days !== null && days < 0;
                  const isNear = days !== null && days >= 0 && days <= 7;
                  const typeMeta = DEADLINE_TYPE_META[d.deadline_type];
                  return (
                    <Card key={d.id} className={!d.is_active ? "opacity-50" : isOverdue ? "border-red-200 dark:border-red-800" : isNear ? "border-amber-200 dark:border-amber-800" : ""}>
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                              isOverdue ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : isNear ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.title}</p>
                              <Badge className={typeMeta.color}>{typeMeta.label}</Badge>
                              {d.activity && (
                                <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">{d.activity.code}</Badge>
                              )}
                              {!d.is_active && (
                                <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700">Inativo</Badge>
                              )}
                            </div>
                            {d.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{d.description}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {d.start_date && `Início: ${formatDate(d.start_date)} · `}
                              {d.end_date && `Fim: ${formatDate(d.end_date)} · `}
                              Vencimento: {formatDate(d.due_date)}
                              {days !== null && d.is_active && (
                                <span className={`ml-2 font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : isNear ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                                  {isOverdue ? `(${Math.abs(days)}d em atraso)` : days === 0 ? "(hoje)" : `(${days}d restantes)`}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(d)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleProrrogate(d)} title="Prorrogar">
                              Prorrogar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(d)} title={d.is_active ? "Desativar" : "Ativar"}>
                              <Power className={`w-4 h-4 ${d.is_active ? "text-emerald-500" : "text-gray-400"}`} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(d)} title="Excluir">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar prazo" : "Novo prazo"}>
        <div className="space-y-4">
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ex.: Período de matrícula ESO1"
          />
          <Textarea
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Informações adicionais sobre o prazo"
          />
          <Select
            label="Atividade"
            value={form.activity_id}
            onChange={(e) => setForm({ ...form, activity_id: e.target.value })}
          >
            <option value="">— Geral (todas as atividades) —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
          <Select
            label="Tipo"
            value={form.deadline_type}
            onChange={(e) => setForm({ ...form, deadline_type: e.target.value as Deadline["deadline_type"] })}
          >
            <option value="matricula">Matrícula</option>
            <option value="entrega">Entrega</option>
            <option value="defesa">Defesa</option>
            <option value="outro">Outro</option>
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Data inicial" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="Data final" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            <Input label="Vencimento" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title}>{editing ? "Salvar alterações" : "Criar prazo"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
