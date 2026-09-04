import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  History as HistoryIcon,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useRequest,
  useFormSubmissions,
  useDocuments,
  useHistory,
} from "@/lib/hooks";
import {
  addHistoryEntry,
  createNotification,
  uploadDocument,
  uploadCtesDocument,
  getDocumentUrl,
  canStudentEdit,
  canSubmitForm,
  canUploadDocument,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  Card,
  PageHeader,
  Button,
  Spinner,
  Textarea,
  Modal,
  Badge,
  EmptyState,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import {
  STATUS_META,
  STATUS_ORDER,
  formatDate,
  formatDateTime,
  DOCUMENT_TYPES,
  ROLE_META,
} from "@/lib/constants";
import type { RequestStatus } from "@/lib/types";
import type { PageKey } from "@/components/AppLayout";

export function RequestDetailPage({
  requestId,
  onNavigate,
}: {
  requestId: string;
  onNavigate: (k: PageKey, ctx?: Record<string, string>) => void;
}) {
  const { profile } = useAuth();
  const { request, loading, reload } = useRequest(requestId);
  const { submissions } = useFormSubmissions(requestId);
  const { documents, reload: reloadDocs } = useDocuments(requestId);
  const { history, reload: reloadHistory } = useHistory(requestId);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [newStatus, setNewStatus] = useState<RequestStatus>("em_analise");
  const [justification, setJustification] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionDescription, setCorrectionDescription] = useState("");
  const [correctionDoc, setCorrectionDoc] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const isCTES = profile?.role === "ctes" || profile?.role === "admin";
  const isStudent = profile?.role === "student";
  const studentName = request?.student?.full_name || request?.student?.email || "Aluno";

  const expectedDocType = useMemo(() => {
    if (!request?.activity?.code) return null;
    const code = request.activity.code.toLowerCase();
    return DOCUMENT_TYPES[`relatorio_${code}`] || DOCUMENT_TYPES[`manuscrito_${code}`] || null;
  }, [request]);

  // Load signed URLs for documents
  useEffect(() => {
    if (documents.length === 0) {
      setDocUrls({});
      return;
    }
    Promise.all(
      documents.map(async (d) => {
        const url = await getDocumentUrl(d.file_path);
        return [d.id, url] as [string, string | null];
      })
    ).then((entries) => {
      setDocUrls(Object.fromEntries(entries.filter(([, v]) => v !== null)) as Record<string, string>);
    });
  }, [documents]);

  if (loading) {
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

  async function handleStatusChange() {
    if (!profile || !request) return;
    setSaving(true);
    const prevStatus = request.status;
    const action = `Status alterado para "${STATUS_META[newStatus as RequestStatus].label}"`;

    const { error } = await supabase
      .from("enrollment_requests")
      .update({
        status: newStatus,
        reviewed_by: profile!.id,
        reviewed_at: new Date().toISOString(),
        justification: justification.trim() || null,
      })
      .eq("id", request!.id);

    if (error) {
      setSaving(false);
      return;
    }

    await addHistoryEntry(
      request!.id,
      profile!.full_name || profile!.email,
      action,
      prevStatus,
      newStatus,
      justification.trim() || undefined,
      profile!.id
    );

    setShowReviewModal(false);
    setJustification("");
    setSaving(false);
    await reload();
    await reloadHistory();

    // Send notification to student based on new status
    const statusLabels: Record<string, { title: string; msg: string; type: string }> = {
      aprovado: { title: "Solicitação aprovada", msg: `Sua solicitação de ${request!.activity?.code} foi aprovada.`, type: "approved" },
      rejeitado: { title: "Solicitação rejeitada", msg: `Sua solicitação de ${request!.activity?.code} foi rejeitada. ${justification.trim() ? "Motivo: " + justification.trim() : ""}`, type: "rejeited" },
      pendente: { title: "Solicitação pendente", msg: `Sua solicitação de ${request!.activity?.code} está pendente. ${justification.trim() ? "Motivo: " + justification.trim() : ""}`, type: "pending" },
      finalizado: { title: "Solicitação finalizada", msg: `Sua solicitação de ${request!.activity?.code} foi finalizada.`, type: "approved" },
    };
    const notif = statusLabels[newStatus];
    if (notif) {
      await createNotification({
        userId: request!.student_id,
        requestId: request!.id,
        type: notif.type,
        title: notif.title,
        message: notif.msg,
      });
    }
  }

  async function handleRequestCorrection() {
    if (!profile || !request) return;
    if (!correctionReason.trim() || !correctionDescription.trim()) return;
    setSaving(true);
    const prevStatus = request.status;

    const fullJustification = `Motivo: ${correctionReason.trim()}\n\nDescrição: ${correctionDescription.trim()}${correctionDoc.trim() ? `\n\nDocumento a corrigir: ${correctionDoc.trim()}` : ""}`;

    const { error } = await supabase
      .from("enrollment_requests")
      .update({
        status: "aguardando_correcao",
        reviewed_by: profile!.id,
        reviewed_at: new Date().toISOString(),
        justification: fullJustification,
      })
      .eq("id", request!.id);

    if (error) {
      setSaving(false);
      return;
    }

    await addHistoryEntry(
      request!.id,
      profile!.full_name || profile!.email,
      "Correção solicitada",
      prevStatus,
      "aguardando_correcao",
      fullJustification,
      profile!.id
    );

    await createNotification({
      userId: request!.student_id,
      requestId: request!.id,
      type: "correction",
      title: "Correção solicitada",
      message: `A CTES solicitou correções na sua solicitação de ${request!.activity?.code}. Motivo: ${correctionReason.trim()}. Abra a solicitação para ver os detalhes.`,
    });

    setShowCorrectionModal(false);
    setCorrectionReason("");
    setCorrectionDescription("");
    setCorrectionDoc("");
    setSaving(false);
    await reload();
    await reloadHistory();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile || !request) return;
    setUploading(true);
    setUploadError(null);

    const { path, error: upErr } = await uploadDocument(file, profile.user_id, request.id);
    if (upErr) {
      setUploadError(upErr);
      setUploading(false);
      return;
    }

    const docType = request!.activity!.code.toLowerCase().startsWith("eso")
      ? `relatorio_${request!.activity!.code.toLowerCase()}`
      : `manuscrito_${request!.activity!.code.toLowerCase()}`;

    const { error: dbErr } = await supabase.from("documents").insert({
      request_id: request!.id,
      student_id: profile!.id,
      document_type: docType,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

    if (dbErr) {
      setUploadError(dbErr.message);
      setUploading(false);
      return;
    }

    await addHistoryEntry(
      request!.id,
      profile!.full_name || profile!.email,
      `Documento enviado: ${file.name}`,
      request!.status,
      request!.status,
      undefined,
      profile!.id
    );

    await reloadDocs();
    await reloadHistory();
    setUploading(false);
  }

  async function handleCtesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile || !request) return;
    setUploading(true);
    setUploadError(null);

    const { path, error: upErr } = await uploadCtesDocument(file, request.id);
    if (upErr) {
      setUploadError(upErr);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("documents").insert({
      request_id: request!.id,
      student_id: request!.student_id,
      document_type: "ctes_attachment",
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      source: "ctes",
      uploaded_by: profile!.id,
    });

    if (dbErr) {
      setUploadError(dbErr.message);
      setUploading(false);
      return;
    }

    await addHistoryEntry(
      request!.id,
      profile!.full_name || profile!.email,
      `Documento anexado pela CTES: ${file.name}`,
      request!.status,
      request!.status,
      undefined,
      profile!.id
    );

    await reloadDocs();
    await reloadHistory();
    setUploading(false);
  }

  async function handleDeleteCtesDoc(docId: string, filePath: string) {
    if (!confirm("Excluir este documento?")) return;
    await supabase.storage.from("documents").remove([filePath]);
    await supabase.from("documents").delete().eq("id", docId);
    await reloadDocs();
  }

  const latestSubmission = submissions[0];
  const canEditForm = isStudent && canSubmitForm(request.status);
  const canUpload = isStudent && canUploadDocument(request.status);

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => onNavigate(isCTES ? "ctes-requests" : "requests")}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para solicitações
      </button>

      <PageHeader
        title={`Solicitação — ${request.activity?.code}`}
        subtitle={`${request.activity?.name} · ${studentName}`}
        action={<StatusBadge status={request.status} />}
      />

      {/* Status timeline */}
      <Card className="mb-6">
        <div className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Fluxo de status</h3>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => {
              const isActive = request.status === s;
              const isPast = STATUS_ORDER.indexOf(request.status) > STATUS_ORDER.indexOf(s);
              return (
                <div
                  key={s}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    isActive
                      ? STATUS_META[s].color + " ring-2 ring-offset-1 ring-emerald-400"
                      : isPast
                      ? "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700"
                      : "bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-700"
                  }`}
                >
                  {isPast && <CheckCircle2 className="w-3 h-3" />}
                  {isActive && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />}
                  {STATUS_META[s].label}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Form data */}
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Formulário</h3>
              {canEditForm && (
                <Button size="sm" variant="outline" onClick={() => onNavigate("form", { id: requestId })}>
                  <Edit3 className="w-4 h-4" />
                  {request.status === "aguardando_correcao" ? "Corrigir" : "Preencher"}
                </Button>
              )}
            </div>
            <div className="p-5">
              {latestSubmission ? (
                <dl className="space-y-3">
                  {Object.entries(latestSubmission.data as Record<string, any>).map(([key, val]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-48 shrink-0 capitalize">
                        {key.replace(/_/g, " ")}
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {val?.toString() || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <EmptyState
                  icon={<FileText className="w-8 h-8" />}
                  title="Formulário não preenchido"
                  description={
                    canEditForm
                      ? "Clique em 'Preencher' para iniciar o formulário."
                      : "Aguardando preenchimento pelo aluno."
                  }
                />
              )}
            </div>
          </Card>

          {/* Documents */}
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Documentos</h3>
              {canUpload && (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx" />
                  <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    Enviar documento
                  </span>
                </label>
              )}
              {isCTES && (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleCtesUpload} accept=".pdf,.doc,.docx,.odt,.txt" />
                  <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                    <Upload className="w-4 h-4" />
                    Anexar documento
                  </span>
                </label>
              )}
            </div>
            <div className="p-3">
              {uploading && (
                <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Spinner className="w-4 h-4" /> Enviando...
                </div>
              )}
              {uploadError && (
                <div className="mx-2 mb-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  {uploadError}
                </div>
              )}

              {/* Student documents */}
              {documents.filter((d) => d.source !== "ctes").length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 mb-2">Documentos enviados pelo aluno</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {documents.filter((d) => d.source !== "ctes").map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between px-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {DOCUMENT_TYPES[doc.document_type] || doc.document_type} · {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        {docUrls[doc.id] && (
                          <a href={docUrls[doc.id]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">
                            <Download className="w-4 h-4" /> Baixar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTES documents */}
              {documents.filter((d) => d.source === "ctes").length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide px-2 mb-2">Documentos disponibilizados pela CTES</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {documents.filter((d) => d.source === "ctes").map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between px-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(doc.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {docUrls[doc.id] && (
                            <a href={docUrls[doc.id]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">
                              <Download className="w-4 h-4" /> Baixar
                            </a>
                          )}
                          {isCTES && (
                            <button onClick={() => handleDeleteCtesDoc(doc.id, doc.file_path)} className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Excluir">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documents.length === 0 && !uploading && (
                <EmptyState
                  icon={<FileText className="w-8 h-8" />}
                  title="Nenhum documento enviado"
                  description={
                    canUpload
                      ? `Envie o documento: ${expectedDocType}`
                      : isCTES
                      ? "Anexe documentos relacionados à solicitação."
                      : "Os documentos serão exibidos aqui."
                  }
                />
              )}
            </div>
          </Card>

          {/* History */}
          <Card>
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                Histórico
              </h3>
            </div>
            <div className="p-3">
              {history.length === 0 ? (
                <EmptyState title="Sem registros" description="O histórico será exibido aqui." />
              ) : (
                <div className="relative">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex gap-3 px-2 py-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                        {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
                      </div>
                      <div className="min-w-0 pb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{h.action}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {h.user_name} · {formatDateTime(h.created_at)}
                        </p>
                        {h.previous_status && h.new_status && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                            <StatusBadge status={h.previous_status as RequestStatus} />
                            <span className="text-gray-400 dark:text-gray-500">→</span>
                            <StatusBadge status={h.new_status as RequestStatus} />
                          </div>
                        )}
                        {h.observation && (
                          <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-2 py-1.5">
                            {h.observation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <Card>
            <div className="p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Informações</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Aluno</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium text-right">{studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Atividade</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{request.activity?.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Categoria</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{request.activity?.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Criada em</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(request.created_at)}</span>
                </div>
                {request.submitted_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Enviada em</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(request.submitted_at)}</span>
                  </div>
                )}
                {request.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Revisada em</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(request.reviewed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Justification */}
          {request.justification && (
            <Card className="border-orange-200 dark:border-orange-800">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Justificativa / Observação</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{request.justification}</p>
              </div>
            </Card>
          )}

          {/* CTES actions */}
          {isCTES && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ações da CTES</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Analise a solicitação e altere o status. Uma justificativa pode ser adicionada.
                </p>
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => setShowReviewModal(true)}>
                    Analisar solicitação
                  </Button>
                  <Button variant="outline" className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30" onClick={() => setShowCorrectionModal(true)}>
                    <AlertTriangle className="w-4 h-4" />
                    Solicitar correção
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Student correction action */}
          {isStudent && request.status === "aguardando_correcao" && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/30">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Correção solicitada</h3>
                </div>
                {request.justification && (
                  <div className="mb-3 rounded-lg bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 px-3 py-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.justification}</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Corrija os itens indicados, reenvie os documentos necessários e depois reenvie o formulário.
                </p>
                <Button
                  className="w-full"
                  onClick={() => onNavigate("form", { id: requestId })}
                >
                  <Edit3 className="w-4 h-4" />
                  Corrigir formulário
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Review modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)} title="Analisar solicitação">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Novo status</label>
            <div className="grid grid-cols-2 gap-2">
              {(["em_analise", "pendente", "aguardando_correcao", "aprovado", "rejeitado", "finalizado"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setNewStatus(s)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      newStatus === s
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
                    {STATUS_META[s].label}
                  </button>
                )
              )}
            </div>
          </div>

          <Textarea
            label="Justificativa / Observação"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
            placeholder="Informe a justificativa (obrigatória para pendência ou rejeição)..."
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStatusChange} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Correction modal */}
      <Modal open={showCorrectionModal} onClose={() => setShowCorrectionModal(false)} title="Solicitar correção">
        <div className="space-y-4">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-3 py-2.5 text-sm text-orange-700 dark:text-orange-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>A solicitação será marcada como "Aguardando correção". O aluno será notificado dentro do sistema.</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Motivo da correção *</label>
            <input
              type="text"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Ex.: Documentação incompleta"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <Textarea
            label="Descrição detalhada do que precisa corrigir *"
            value={correctionDescription}
            onChange={(e) => setCorrectionDescription(e.target.value)}
            rows={4}
            placeholder="Descreva exatamente o que o aluno precisa corrigir ou complementar..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Documento que precisa corrigir/reenviar (opcional)</label>
            <input
              type="text"
              value={correctionDoc}
              onChange={(e) => setCorrectionDoc(e.target.value)}
              placeholder="Ex.: Projeto_TCC.pdf, Formulário ESO1..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCorrectionModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRequestCorrection}
              disabled={saving || !correctionReason.trim() || !correctionDescription.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
            >
              {saving ? "Enviando..." : "Solicitar correção"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
