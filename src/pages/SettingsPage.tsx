import { useState, useEffect } from "react";
import { Settings, BookOpen, Save, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useActivities, useFormDefinition } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Spinner, Input, Select, Textarea, Badge } from "@/components/ui";
import { FIELD_TYPE_META, FIELD_TYPES, STATUS_META } from "@/lib/constants";
import type { FormField, Activity } from "@/lib/types";

export function SettingsPage() {
  const { activities, loading } = useActivities();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [tab, setTab] = useState<"prereqs" | "forms">("prereqs");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Configure pré-requisitos e formulários das atividades." />

      <div className="flex flex-wrap gap-2 mb-5">
        {activities.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedActivity(a)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              selectedActivity?.id === a.id
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {a.code}
          </button>
        ))}
      </div>

      {!selectedActivity ? (
        <Card>
          <div className="p-8 text-center">
            <Settings className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma atividade para configurar.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
            <TabButton active={tab === "prereqs"} onClick={() => setTab("prereqs")}>Pré-requisitos</TabButton>
            <TabButton active={tab === "forms"} onClick={() => setTab("forms")}>Formulário</TabButton>
          </div>

          {tab === "prereqs" ? (
            <PrereqConfig activity={selectedActivity} activities={activities} />
          ) : (
            <FormConfig activity={selectedActivity} />
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function PrereqConfig({ activity, activities }: { activity: Activity; activities: Activity[] }) {
  const [requiredStatus, setRequiredStatus] = useState(activity.prerequisite_required_status ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const prereqActivity = activity.prerequisite_activity_id
    ? activities.find((a) => a.id === activity.prerequisite_activity_id)
    : null;

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("activities")
      .update({ prerequisite_required_status: requiredStatus || null })
      .eq("id", activity.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card>
      <div className="p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Regra de pré-requisito</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define o status que a atividade anterior precisa ter para liberar o acesso a esta.
          </p>
        </div>

        {prereqActivity ? (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 px-4 py-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Pré-requisito de <strong>{activity.code}</strong>: <strong>{prereqActivity.code}</strong> ({prereqActivity.name})
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-4 py-3">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Esta atividade não possui pré-requisito. (Primeira etapa da sequência.)
            </p>
          </div>
        )}

        <Select label="Status exigido na atividade anterior" value={requiredStatus} onChange={(e) => setRequiredStatus(e.target.value)}>
          <option value="">Sem checagem de status (apenas existência)</option>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </Select>

        {saved && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Configuração salva com sucesso.
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FormConfig({ activity }: { activity: Activity }) {
  const { formDef, loading, reload } = useFormDefinition(activity.id);
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFields(formDef?.fields ?? []);
  }, [formDef]);

  function addField() {
    setFields([...fields, { key: `campo_${fields.length + 1}`, label: "Novo campo", type: "text", required: false }]);
  }

  function updateField(index: number, patch: Partial<FormField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function moveField(index: number, dir: "up" | "down") {
    const newIndex = dir === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  }

  async function handleSave() {
    setSaving(true);
    if (formDef) {
      await supabase.from("form_definitions").update({ fields }).eq("id", formDef.id);
    } else {
      await supabase.from("form_definitions").insert({
        activity_id: activity.id,
        version: 1,
        fields,
        is_active: true,
      });
    }
    await reload();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Campos do formulário — {activity.code}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Adicione, edite, reordene ou remova campos. As alterações são imediatas ao salvar.</p>
          </div>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="w-4 h-4" />
            Adicionar campo
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, i) => {
            const typeMeta = FIELD_TYPE_META[field.type];
            return (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                    <GripVertical className="w-4 h-4" />
                    Campo {i + 1}
                    <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700">{typeMeta.label}</Badge>
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveField(i, "up")} disabled={i === 0} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors" title="Mover para cima">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveField(i, "down")} disabled={i === fields.length - 1} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors" title="Mover para baixo">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeField(i)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Remover campo">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    label="Identificador (chave)"
                    value={field.key}
                    onChange={(e) => updateField(i, { key: e.target.value.replace(/\s/g, "_") })}
                  />
                  <Input
                    label="Rótulo / Pergunta"
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                  />
                  <Select
                    label="Tipo de campo"
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FormField["type"] })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{FIELD_TYPE_META[t].label}</option>
                    ))}
                  </Select>
                  <Input
                    label="Descrição / Instrução"
                    value={field.help ?? ""}
                    onChange={(e) => updateField(i, { help: e.target.value })}
                  />
                </div>
                {typeMeta.hasOptions && (
                  <Input
                    label="Opções (separadas por vírgula)"
                    value={(field.options ?? []).join(", ")}
                    onChange={(e) => updateField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  Campo obrigatório
                </label>
              </div>
            );
          })}
        </div>

        {fields.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            Nenhum campo configurado. Clique em "Adicionar campo".
          </div>
        )}

        {saved && (
          <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Formulário salvo com sucesso.
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar formulário"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
