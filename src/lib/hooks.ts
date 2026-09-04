import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  Activity,
  EnrollmentRequest,
  FormDefinition,
  DocumentRecord,
  Deadline,
  RequestHistoryEntry,
  AdvisorAssignment,
  SupervisorAssignment,
  Profile,
  LibraryDocument,
  AppNotification,
} from "./types";

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setActivities((data as Activity[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { activities, loading, reload: load };
}

export function useStudentRequests(studentId: string | undefined) {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!studentId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("enrollment_requests")
      .select("*, activity:activities(*)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setRequests((data as EnrollmentRequest[]) ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { requests, loading, reload: load };
}

export function useAllRequests() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enrollment_requests")
      .select("*, activity:activities(*), student:profiles!enrollment_requests_student_id_fkey(*), reviewer:profiles!enrollment_requests_reviewed_by_fkey(*)")
      .order("created_at", { ascending: false });
    setRequests((data as EnrollmentRequest[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { requests, loading, reload: load };
}

export function useRequest(requestId: string | undefined) {
  const [request, setRequest] = useState<EnrollmentRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId) {
      setRequest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("enrollment_requests")
      .select("*, activity:activities(*), student:profiles!enrollment_requests_student_id_fkey(*), reviewer:profiles!enrollment_requests_reviewed_by_fkey(*)")
      .eq("id", requestId)
      .maybeSingle();
    setRequest((data as EnrollmentRequest) ?? null);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  return { request, loading, reload: load };
}

export function useFormDefinition(activityId: string | undefined) {
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activityId) {
      setFormDef(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("form_definitions")
      .select("*")
      .eq("activity_id", activityId)
      .eq("is_active", true)
      .maybeSingle();
    setFormDef((data as FormDefinition) ?? null);
    setLoading(false);
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  return { formDef, loading, reload: load };
}

export function useFormSubmissions(requestId: string | undefined) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("form_submissions")
      .select("*")
      .eq("request_id", requestId)
      .order("submitted_at", { ascending: false });
    setSubmissions(data ?? []);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  return { submissions, loading, reload: load };
}

export function useDocuments(requestId?: string, studentId?: string) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("documents").select("*");
    if (requestId) query = query.eq("request_id", requestId);
    else if (studentId) query = query.eq("student_id", studentId);
    query = query.order("created_at", { ascending: false });
    const { data } = await query;
    setDocuments((data as DocumentRecord[]) ?? []);
    setLoading(false);
  }, [requestId, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { documents, loading, reload: load };
}

export function useDeadlines(activityId?: string) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("deadlines").select("*, activity:activities(*)").eq("is_active", true);
    if (activityId) query = query.eq("activity_id", activityId);
    query = query.order("due_date", { ascending: true });
    const { data } = await query;
    setDeadlines((data as Deadline[]) ?? []);
    setLoading(false);
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  return { deadlines, loading, reload: load };
}

export function useHistory(requestId: string | undefined) {
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("request_history")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    setHistory((data as RequestHistoryEntry[]) ?? []);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, loading, reload: load };
}

export function useAdvisorAssignments(advisorId: string | undefined) {
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!advisorId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("advisor_assignments")
      .select("*, advisor:profiles!advisor_assignments_advisor_id_fkey(*), student:profiles!advisor_assignments_student_id_fkey(*), activity:activities(*)")
      .eq("advisor_id", advisorId)
      .order("assigned_at", { ascending: false });
    setAssignments((data as AdvisorAssignment[]) ?? []);
    setLoading(false);
  }, [advisorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { assignments, loading, reload: load };
}

export function useSupervisorAssignments(supervisorId: string | undefined) {
  const [assignments, setAssignments] = useState<SupervisorAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supervisorId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("supervisor_assignments")
      .select("*, supervisor:profiles!supervisor_assignments_supervisor_id_fkey(*), student:profiles!supervisor_assignments_student_id_fkey(*), activity:activities(*)")
      .eq("supervisor_id", supervisorId)
      .order("assigned_at", { ascending: false });
    setAssignments((data as SupervisorAssignment[]) ?? []);
    setLoading(false);
  }, [supervisorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { assignments, loading, reload: load };
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { profiles, loading, reload: load };
}

export function useProfile() {
  const { profile } = useAuth();
  return profile;
}

export function useLibraryDocuments(activityId?: string) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("library_documents").select("*, activity:activities(*)");
    if (activityId) query = query.eq("activity_id", activityId);
    query = query.order("created_at", { ascending: false });
    const { data } = await query;
    setDocuments((data as LibraryDocument[]) ?? []);
    setLoading(false);
  }, [activityId]);

  useEffect(() => {
    load();
  }, [load]);

  return { documents, loading, reload: load };
}

export function useRequestDocuments(requestId?: string) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!requestId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    setDocuments((data as DocumentRecord[]) ?? []);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  return { documents, loading, reload: load };
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const list = (data as AppNotification[]) ?? [];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load, userId]);

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    await load();
  }

  async function markAllAsRead() {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    await load();
  }

  async function removeNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    await load();
  }

  return { notifications, unreadCount, loading, reload: load, markAsRead, markAllAsRead, removeNotification };
}