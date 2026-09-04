import { supabase } from "./supabase";
import type { Activity, EnrollmentRequest, RequestStatus } from "./types";

export interface PrerequisiteCheckResult {
  ok: boolean;
  reason: string | null;
  prerequisiteActivity?: Activity;
  prerequisiteRequest?: EnrollmentRequest;
}

/**
 * Verifica se o aluno atende ao pré-requisito de uma atividade.
 * A regra é configurável: se `prerequisite_required_status` for null,
 * não há checagem de status (apenas verifica se existe solicitação anterior).
 * Caso contrário, exige que a solicitação anterior tenha o status definido.
 */
export async function checkPrerequisite(
  activity: Activity,
  studentId: string,
  allRequests: EnrollmentRequest[],
  allActivities: Activity[]
): Promise<PrerequisiteCheckResult> {
  if (!activity.prerequisite_activity_id) {
    return { ok: true, reason: null };
  }

  const prereqActivity = allActivities.find((a) => a.id === activity.prerequisite_activity_id);
  if (!prereqActivity) {
    return { ok: true, reason: null };
  }

  const prereqRequest = allRequests.find(
    (r) => r.activity_id === prereqActivity.id && r.student_id === studentId
  );

  if (!prereqRequest) {
    return {
      ok: false,
      reason: `É necessário ter uma solicitação de ${prereqActivity.code} antes de prosseguir.`,
      prerequisiteActivity: prereqActivity,
    };
  }

  const requiredStatus = activity.prerequisite_required_status;

  if (!requiredStatus) {
    // Sem checagem de status — a existência da solicitação anterior basta
    return {
      ok: true,
      reason: null,
      prerequisiteActivity: prereqActivity,
      prerequisiteRequest: prereqRequest,
    };
  }

  if (prereqRequest.status !== requiredStatus) {
    return {
      ok: false,
      reason: `A atividade ${prereqActivity.code} precisa estar com status "${requiredStatus}". Status atual: ${prereqRequest.status}.`,
      prerequisiteActivity: prereqActivity,
      prerequisiteRequest: prereqRequest,
    };
  }

  return {
    ok: true,
    reason: null,
    prerequisiteActivity: prereqActivity,
    prerequisiteRequest: prereqRequest,
  };
}

export async function uploadDocument(
  file: File,
  userId: string,
  requestId: string
): Promise<{ path: string; error: string | null }> {
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `${userId}/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("documents").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { path: "", error: error.message };
  return { path: filePath, error: null };
}

export async function uploadLibraryDocument(
  file: File
): Promise<{ path: string; error: string | null }> {
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `library/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("documents").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { path: "", error: error.message };
  return { path: filePath, error: null };
}

export async function getDocumentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function uploadCtesDocument(
  file: File,
  requestId: string
): Promise<{ path: string; error: string | null }> {
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `ctes/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("documents").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { path: "", error: error.message };
  return { path: filePath, error: null };
}

export async function addHistoryEntry(
  requestId: string,
  userName: string,
  action: string,
  previousStatus: string | null,
  newStatus: string | null,
  observation?: string,
  userId?: string
): Promise<void> {
  await supabase.from("request_history").insert({
    request_id: requestId,
    user_id: userId ?? null,
    user_name: userName,
    action,
    previous_status: previousStatus,
    new_status: newStatus,
    observation: observation ?? null,
  });
}

export async function createNotification(params: {
  userId: string;
  requestId?: string;
  type?: string;
  title: string;
  message: string;
}): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    request_id: params.requestId ?? null,
    type: params.type ?? "info",
    title: params.title,
    message: params.message,
  });
}

export function canStudentEdit(status: RequestStatus): boolean {
  return status === "rascunho" || status === "aguardando_correcao";
}

export function canSubmitForm(status: RequestStatus): boolean {
  return status === "rascunho" || status === "aguardando_correcao";
}

export function canUploadDocument(status: RequestStatus): boolean {
  return status === "aprovado" || status === "finalizado" || status === "aguardando_correcao";
}
