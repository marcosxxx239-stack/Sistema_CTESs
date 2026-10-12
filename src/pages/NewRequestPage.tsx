import { useState, useMemo, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Building2,
  ClipboardList,
  Users,
  Send,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useActivities, useStudentRequests, useProfiles } from "@/lib/hooks";
import { checkPrerequisite, addHistoryEntry, uploadDocument } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Card, PageHeader, Button, Spinner, Input, Select } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { Activity, Profile } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ESO_DOC_FIELDS = [
  { key: "anexo01", label: "Ficha de Inscrição (Anexo 01)" },
  { key: "anexo02", label: "Plano de Trabalho (Anexo 02)" },
  { key: "anexo03", label: "Carta de Aceite (Anexo 03)" },
  { key: "anexo04", label: "Termo de Compromisso (Anexo 04)" },
];

const TCC_DOC_FIELDS = [
  { key: "anexo01", label: "Formulário de Matrícula (Anexo 01)" },
];

interface FileState {
  file: File;
  sizeMB: string;
}

interface ESOInfo {
  cnpj: string;
  razaoSocial: string;
  supervisorName: string;
  supervisorRole: string;
  supervisorEmail: string;
  planoAtividades: string;
}

interface PartnerInfo {
  name: string;
  registration: string;
}

interface WizardData {
  activityId: string | null;
  modality: "individual" | "dupla";
  partner: PartnerInfo;
  advisorId: string | null;
  coadvisorId: string | null;
  esoInfo: ESOInfo;
  files: Record<string, FileState>;
}

const STEPS = ["Atividade", "Informações", "Documentos", "Revisão"];

export function NewRequestPage({
  activityId: preselectedActivityId,
  onNavigate,
}: {
  activityId?: string;
  onNavigate: (k: PageKey, ctx?: Record<string, string>) => void;
}) {
  const { profile } = useAuth();
  const { activities, loading: actLoading } = useActivities();
  const { requests, loading: reqLoading, reload } = useStudentRequests(profile?.id);
  const { profiles, loading: profilesLoading } = useProfiles();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [data, setData] = useState<WizardData>({
    activityId: preselectedActivityId ?? null,
    modality: "individual",
    partner: { name: "", registration: "" },
    advisorId: null,
    coadvisorId: null,
    esoInfo: {
      cnpj: "",
      razaoSocial: "",
      supervisorName: "",
      supervisorRole: "",
      supervisorEmail: "",
      planoAtividades: "",
    },
    files: {},
  });

  const advisors = useMemo(
    () => profiles.filter((p) => p.role === "advisor" && p.is_active),
    [profiles]
  );

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === data.activityId) ?? null,
    [activities, data.activityId]
  );

  const isESO = selectedActivity?.category === "ESO";
  const isTCC = selectedActivity?.category === "TCC";

  const docFields = isESO ? ESO_DOC_FIELDS : TCC_DOC_FIELDS;

  // Prerequisite check
  const prereqOk = useMemo(() => {
    if (!selectedActivity || !profile) return false;
    const existing = requests.find((r) => r.activity_id === selectedActivity.id);
    if (existing) return false;
    return true;
  }, [selectedActivity, profile, requests]);

  const loading = actLoading || reqLoading || profilesLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <div className="flex flex-col items-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Solicitação enviada com sucesso!</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sua solicitação de matrícula foi enviada à CTES para análise. Acompanhe o status no seu dashboard.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => onNavigate("dashboard")}>Ir para o Dashboard</Button>
              <Button onClick={() => onNavigate("requests")}>Ver minhas solicitações</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  function updateData<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileSelect(key: string, file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("O arquivo excede o tamanho máximo de 10MB.");
      return;
    }
    setError(null);
    updateData("files", { ...data.files, [key]: { file, sizeMB: (file.size / (1024 * 1024)).toFixed(2) } });
  }

  function handleFileRemove(key: string) {
    const newFiles = { ...data.files };
    delete newFiles[key];
    updateData("files", newFiles);
  }

  function canAdvance(): boolean {
    if (step === 0) {
      if (!data.activityId) return false;
      if (isTCC && data.modality === "dupla") {
        if (!data.partner.name.trim() || !data.partner.registration.trim()) return false;
      }
      return true;
    }
    if (step === 1) {
      if (isESO) {
        const e = data.esoInfo;
        if (!e.cnpj.trim() || !e.razaoSocial.trim() || !e.supervisorName.trim() || !e.supervisorEmail.trim()) return false;
      }
      return true;
    }
    if (step === 2) {
      for (const f of docFields) {
        if (!data.files[f.key]) return false;
      }
      return true;
    }
    return true;
  }

  async function handleSubmit() {
    if (!profile || !selectedActivity) return;
    setSubmitting(true);
    setError(null);

    // Check existing
    const existing = requests.find((r) => r.activity_id === selectedActivity.id);
    if (existing) {
      onNavigate("request-detail", { id: existing.id });
      return;
    }

    // Check prerequisite
    const prereqResult = await checkPrerequisite(selectedActivity, profile.id, requests, activities);
    if (!prereqResult.ok) {
      setError(prereqResult.reason ?? "Pré-requisito não atendido.");
      setSubmitting(false);
      return;
    }

    // Create enrollment request
    const { data: reqData, error: insertError } = await supabase
      .from("enrollment_requests")
      .insert({
        student_id: profile.id,
        activity_id: selectedActivity.id,
        status: "enviado",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !reqData) {
      setError(insertError?.message ?? "Erro ao criar solicitação.");
      setSubmitting(false);
      return;
    }

    const requestId = reqData.id;

    // Save form submission with wizard data
    const formData: Record<string, string> = {
      atividade: selectedActivity.code,
      modalidade: data.modality === "dupla" ? "Em Dupla" : "Individual",
    };
    if (data.modality === "dupla") {
      formData["coautor_nome"] = data.partner.name;
      formData["coautor_matricula"] = data.partner.registration;
    }
    if (data.advisorId) {
      const adv = advisors.find((a) => a.id === data.advisorId);
      if (adv) formData["orientador"] = adv.full_name;
    }
    if (data.coadvisorId) {
      const coadv = advisors.find((a) => a.id === data.coadvisorId);
      if (coadv) formData["coorientador"] = coadv.full_name;
    }
    if (isESO) {
      const e = data.esoInfo;
      formData["cnpj"] = e.cnpj;
      formData["razao_social"] = e.razaoSocial;
      formData["supervisor"] = e.supervisorName;
      formData["supervisor_cargo"] = e.supervisorRole;
      formData["supervisor_email"] = e.supervisorEmail;
      formData["plano_atividades"] = e.planoAtividades;
    }

    // Get form definition
    const { data: formDef } = await supabase
      .from("form_definitions")
      .select("id, version")
      .eq("activity_id", selectedActivity.id)
      .eq("is_active", true)
      .maybeSingle();

    if (formDef) {
      await supabase.from("form_submissions").insert({
        request_id: requestId,
        form_definition_id: formDef.id,
        data: formData,
        version: formDef.version,
        submitted_at: new Date().toISOString(),
      });
    }

    // Upload files
    for (const field of docFields) {
      const fileState = data.files[field.key];
      if (!fileState) continue;

      const { path, error: upErr } = await uploadDocument(fileState.file, profile.user_id, requestId);
      if (upErr) {
        setError(`Erro ao enviar ${field.label}: ${upErr}`);
        setSubmitting(false);
        return;
      }

      const docType = isESO ? `eso_${field.key}` : `tcc_${field.key}`;
      await supabase.from("documents").insert({
        request_id: requestId,
        student_id: profile.id,
        document_type: docType,
        file_path: path,
        file_name: fileState.file.name,
        file_size: fileState.file.size,
        mime_type: fileState.file.type,
      });
    }

    // History
    await addHistoryEntry(
      requestId,
      profile.full_name || profile.email,
      "Solicitação de matrícula enviada à CTES",
      null,
      "enviado",
      `Atividade: ${selectedActivity.code} | Modalidade: ${formData.modalidade}`,
      profile.id
    );

    await reload();
    setSubmitting(false);
    setSuccess(true);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => onNavigate("activities")}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para atividades
      </button>

      <PageHeader title="Nova Solicitação de Matrícula" subtitle="Preencha as etapas abaixo para submeter sua solicitação à CTES." />

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => {
            const isSkipped = i === 1 && isTCC;
            const isActive = i === step;
            const isDone = i < step;
            if (isSkipped) return null;
            return (
              <div key={label} className="flex flex-1 flex-col items-center relative">
                {i < STEPS.length - 1 && (
                  <div className={`absolute left-1/2 top-5 h-0.5 w-full ${isDone ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`} style={{ zIndex: 0 }} />
                )}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isDone
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isActive
                      ? "border-emerald-600 bg-white text-emerald-600 dark:bg-gray-800"
                      : "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <span className="text-sm font-semibold">{isSkipped ? "" : i + 1}</span>}
                </div>
                <span className={`mt-2 text-xs font-medium ${isActive || isDone ? "text-emerald-700 dark:text-emerald-300" : "text-gray-400 dark:text-gray-500"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 0: Activity selection */}
      {step === 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Seleção do Processo Acadêmico</h2>
          </div>

          {/* Activity cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => updateData("activityId", a.id)}
                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  data.activityId === a.id
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${a.category === "ESO" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}>
                  {a.category}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{a.code}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.name}</p>
                </div>
              </button>
            ))}
          </div>

          {requests.find((r) => r.activity_id === data.activityId) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Você já possui uma solicitação para esta atividade.</span>
            </div>
          )}

          {/* TCC modality */}
          {isTCC && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modalidade de Desenvolvimento</label>
              <div className="flex gap-3">
                {(["individual", "dupla"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => updateData("modality", m)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      data.modality === m
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {m === "individual" ? "Individual" : "Em Dupla"}
                  </button>
                ))}
              </div>
              {data.modality === "dupla" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nome do Segundo Discente *"
                    value={data.partner.name}
                    onChange={(e) => updateData("partner", { ...data.partner, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                  <Input
                    label="Matrícula do Segundo Discente *"
                    value={data.partner.registration}
                    onChange={(e) => updateData("partner", { ...data.partner, registration: e.target.value })}
                    placeholder="Nº de matrícula"
                  />
                </div>
              )}
            </div>
          )}

          {/* Advisor selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Orientador Acadêmico"
              value={data.advisorId ?? ""}
              onChange={(e) => updateData("advisorId", e.target.value || null)}
            >
              <option value="">Selecione...</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </Select>
            <Select
              label="Coorientador (opcional)"
              value={data.coadvisorId ?? ""}
              onChange={(e) => updateData("coadvisorId", e.target.value || null)}
            >
              <option value="">Nenhum</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {/* Step 1: Company info (ESO only) */}
      {step === 1 && isESO && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Informações do Local / Empresa</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="CNPJ *"
              value={data.esoInfo.cnpj}
              onChange={(e) => updateData("esoInfo", { ...data.esoInfo, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
            <Input
              label="Razão Social *"
              value={data.esoInfo.razaoSocial}
              onChange={(e) => updateData("esoInfo", { ...data.esoInfo, razaoSocial: e.target.value })}
              placeholder="Nome da empresa"
            />
            <Input
              label="Nome do Supervisor *"
              value={data.esoInfo.supervisorName}
              onChange={(e) => updateData("esoInfo", { ...data.esoInfo, supervisorName: e.target.value })}
              placeholder="Nome completo"
            />
            <Input
              label="Cargo do Supervisor"
              value={data.esoInfo.supervisorRole}
              onChange={(e) => updateData("esoInfo", { ...data.esoInfo, supervisorRole: e.target.value })}
              placeholder="Cargo"
            />
            <Input
              label="E-mail do Supervisor *"
              type="email"
              value={data.esoInfo.supervisorEmail}
              onChange={(e) => updateData("esoInfo", { ...data.esoInfo, supervisorEmail: e.target.value })}
              placeholder="email@empresa.com"
            />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plano de Atividades</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={4}
                value={data.esoInfo.planoAtividades}
                onChange={(e) => updateData("esoInfo", { ...data.esoInfo, planoAtividades: e.target.value })}
                placeholder="Descreva o plano de atividades..."
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 1 auto-skip for TCC shows nothing, we go to step 2 */}

      {/* Step 2: Document uploads */}
      {step === 2 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Anexação de Documentos Exigidos</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Apenas arquivos PDF, tamanho máximo de 10MB cada.</p>

          <div className="space-y-5">
            {docFields.map((field) => (
              <FileUploadArea
                key={field.key}
                label={field.label}
                fileState={data.files[field.key]}
                onSelect={(file) => handleFileSelect(field.key, file)}
                onRemove={() => handleFileRemove(field.key)}
                showDownloadModel={true}
                activityCode={selectedActivity?.code ?? ""}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Revisão e Submissão</h2>
          </div>

          <div className="space-y-4">
            <ReviewSection title="Atividade">
              <ReviewRow label="Código" value={selectedActivity?.code ?? "—"} />
              <ReviewRow label="Nome" value={selectedActivity?.name ?? "—"} />
              <ReviewRow label="Categoria" value={selectedActivity?.category ?? "—"} />
              <ReviewRow label="Modalidade" value={data.modality === "dupla" ? "Em Dupla" : "Individual"} />
              {data.modality === "dupla" && (
                <>
                  <ReviewRow label="Coautor" value={data.partner.name} />
                  <ReviewRow label="Matrícula do coautor" value={data.partner.registration} />
                </>
              )}
              {data.advisorId && <ReviewRow label="Orientador" value={advisors.find((a) => a.id === data.advisorId)?.full_name ?? "—"} />}
              {data.coadvisorId && <ReviewRow label="Coorientador" value={advisors.find((a) => a.id === data.coadvisorId)?.full_name ?? "—"} />}
            </ReviewSection>

            {isESO && (
              <ReviewSection title="Informações da Empresa">
                <ReviewRow label="CNPJ" value={data.esoInfo.cnpj} />
                <ReviewRow label="Razão Social" value={data.esoInfo.razaoSocial} />
                <ReviewRow label="Supervisor" value={data.esoInfo.supervisorName} />
                <ReviewRow label="Cargo" value={data.esoInfo.supervisorRole || "—"} />
                <ReviewRow label="E-mail" value={data.esoInfo.supervisorEmail} />
                {data.esoInfo.planoAtividades && <ReviewRow label="Plano de Atividades" value={data.esoInfo.planoAtividades} />}
              </ReviewSection>
            )}

            <ReviewSection title="Documentos Anexados">
              {docFields.map((f) => {
                const fs = data.files[f.key];
                return (
                  <div key={f.key} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
                    </div>
                    {fs ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> {fs.file.name} ({fs.sizeMB} MB)
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Não anexado</span>
                    )}
                  </div>
                );
              })}
            </ReviewSection>
          </div>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? onNavigate("activities") : setStep((s) => Math.max(0, s - 1)))}
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Cancelar" : "Voltar"}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => {
              if (step === 0 && isTCC) {
                // Skip ESO info step for TCC
                setStep(2);
              } else {
                setStep((s) => s + 1);
              }
            }}
            disabled={!canAdvance()}
          >
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canAdvance()}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Enviar Solicitação à CTES
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function FileUploadArea({
  label,
  fileState,
  onSelect,
  onRemove,
  showDownloadModel,
  activityCode,
}: {
  label: string;
  fileState: FileState | undefined;
  onSelect: (file: File | undefined) => void;
  onRemove: () => void;
  showDownloadModel?: boolean;
  activityCode: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        {showDownloadModel && (
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            <Download className="h-3.5 w-3.5" /> Baixar Modelo
          </button>
        )}
      </div>

      {fileState ? (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{fileState.file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{fileState.sizeMB} MB</p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 shrink-0 ml-3"
          >
            <X className="h-3.5 w-3.5" /> Remover
          </button>
        </div>
      ) : (
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-6 transition-colors hover:border-emerald-400 dark:hover:border-emerald-600"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-gray-400 mb-1.5" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Clique para selecionar um arquivo PDF</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Máx. 10MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onSelect(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
