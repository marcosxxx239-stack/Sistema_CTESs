import { useState, useEffect } from "react";
import { ArrowLeft, Send, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRequest, useFormDefinition, useFormSubmissions } from "@/lib/hooks";
import { canSubmitForm } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { addHistoryEntry, createNotification } from "@/lib/api";
import { Card, PageHeader, Button, Input, Textarea, Select, Spinner, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META } from "@/lib/constants";
import type { FormField } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

export function FormPage({
  requestId,
  onNavigate,
}: {
  requestId: string;
  onNavigate: (k: PageKey, ctx?: Record<string, string>) => void;
}) {
  const { profile } = useAuth();
  const { request, loading: reqLoading, reload: reloadRequest } = useRequest(requestId);
  const { formDef, loading: formLoading } = useFormDefinition(request?.activity_id);
  const { submissions, reload: reloadSubs } = useFormSubmissions(requestId);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const latestSubmission = submissions[0];

  useEffect(() => {
    if (latestSubmission?.data) {
      setValues(latestSubmission.data as Record<string, string | number>);
    }
  }, [latestSubmission]);

  if (reqLoading || formLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  if (!request) {
    return (
      <Card>
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Solicitação não encontrada.</p>
          <Button variant="outline" className="mt-3" onClick={() => onNavigate("requests")}>
            Voltar
          </Button>
        </div>
      </Card>
    );
  }

  const canEdit = canSubmitForm(request.status);
  const isBlocked = !canEdit;

  async function handleSave(submit: boolean) {
    if (!profile || !request || !formDef) return;
    setSaving(!submit);
    setSubmitting(submit);
    setError(null);
    setSuccess(null);

    // Validate required fields if submitting
    if (submit) {
      for (const field of formDef!.fields) {
        if (field.required && !values[field.key]?.toString().trim()) {
          setError(`Campo obrigatório: ${field.label}`);
          setSubmitting(false);
          setSaving(false);
          return;
        }
      }
    }

    // Upsert form submission
    const payload = {
      request_id: request!.id,
      form_definition_id: formDef!.id,
      data: values,
      version: (latestSubmission?.version ?? 0) + 1,
      submitted_at: new Date().toISOString(),
    };

    const { error: subError } = await supabase.from("form_submissions").insert(payload);
    if (subError) {
      setError(subError.message);
      setSubmitting(false);
      setSaving(false);
      return;
    }

    if (submit) {
      // Update request status to "enviado"
      const prevStatus = request!.status;
      const { error: reqError } = await supabase
        .from("enrollment_requests")
        .update({
          status: "enviado",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", request!.id);

      if (reqError) {
        setError(reqError.message);
        setSubmitting(false);
        setSaving(false);
        return;
      }

      await addHistoryEntry(
        request!.id,
        profile!.full_name || profile!.email,
        prevStatus === "aguardando_correcao" ? "Formulário reenviado após correção" : "Formulário enviado para análise",
        prevStatus,
        "enviado",
        undefined,
        profile!.id
      );

      // Notify CTES users about the resubmission
      if (prevStatus === "aguardando_correcao") {
        const { data: ctesProfiles } = await supabase.from("profiles").select("id").in("role", ["ctes", "admin"]).eq("is_active", true);
        for (const ctes of ctesProfiles ?? []) {
          await createNotification({
            userId: ctes.id,
            requestId: request!.id,
            type: "resubmitted",
            title: "Solicitação reenviada após correção",
            message: `${profile!.full_name || profile!.email} reenviou a solicitação de ${request!.activity?.code} após correção solicitada.`,
          });
        }
      }

      setSuccess(prevStatus === "aguardando_correcao" ? "Formulário reenviado! A CTES irá analisar as correções." : "Formulário enviado! A CTES irá analisar sua solicitação.");
    } else {
      setSuccess("Rascunho salvo.");
    }

    await reloadRequest();
    await reloadSubs();
    setSubmitting(false);
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => onNavigate("request-detail", { id: requestId })}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para solicitação
      </button>

      <PageHeader
        title={`Formulário — ${request.activity?.code}`}
        subtitle={request.activity?.name}
        action={<StatusBadge status={request.status} />}
      />

      {isBlocked && (
        <Card className="mb-5 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/30">
          <div className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              O formulário não pode ser editado no status atual da solicitação.
              {request.status === "aguardando_correcao"
                ? " Correções são permitidas — verifique a justificativa da CTES."
                : ""}
            </p>
          </div>
        </Card>
      )}

      {request.status === "aguardando_correcao" && request.justification && (
        <Card className="mb-5 border-orange-200 dark:border-orange-800">
          <div className="p-4">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-400 mb-1">Justificativa da CTES:</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{request.justification}</p>
          </div>
        </Card>
      )}

      {!formDef ? (
        <Card>
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum formulário configurado para esta atividade. A CTES pode configurá-lo nas configurações.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-6 space-y-5">
            {formDef.fields.map((field: FormField) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                disabled={isBlocked}
                onChange={(val) => setValues((prev) => ({ ...prev, [field.key]: val }))}
              />
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {formDef && !isBlocked && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || submitting}>
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || submitting}>
            <Send className="w-4 h-4" />
            {submitting ? "Enviando..." : "Enviar formulário"}
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string | number;
  disabled: boolean;
  onChange: (val: string | number) => void;
}) {
  const common = { disabled };
  const label = (
    <>
      {field.label}
      {field.required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
    </>
  );

  if (field.type === "textarea") {
    return (
      <Textarea
        label={label as any}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={field.help || ""}
        {...common}
      />
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <Select label={label as any} value={value as string} onChange={(e) => onChange(e.target.value)} {...common}>
        <option value="">Selecione...</option>
        {field.options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "number") {
    return (
      <Input
        label={label as any}
        type="number"
        value={value as number}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.help || ""}
        {...common}
      />
    );
  }

  if (field.type === "date") {
    return (
      <Input
        label={label as any}
        type="date"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        {...common}
      />
    );
  }

  if (field.type === "email") {
    return (
      <Input
        label={label as any}
        type="email"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.help || ""}
        {...common}
      />
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
        <div className="space-y-2">
          {field.options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name={field.key}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
              />
              {opt}
            </label>
          ))}
        </div>
        {field.help && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={value === "Sim"}
            onChange={(e) => onChange(e.target.checked ? "Sim" : "Não")}
            disabled={disabled}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
          />
          {label}
        </label>
        {field.help && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
        <input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.help || "Nome ou link do arquivo"}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:text-gray-100"
        />
        {field.help && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{field.help}</p>}
      </div>
    );
  }

  return (
    <Input
      label={label as any}
      type="text"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.help || ""}
      {...common}
    />
  );
}
