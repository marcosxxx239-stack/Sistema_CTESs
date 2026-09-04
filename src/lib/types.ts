export type Role = "student" | "ctes" | "advisor" | "supervisor" | "admin";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: Role;
  registration_number: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  code: string;
  name: string;
  category: "ESO" | "TCC";
  sequence: number;
  prerequisite_activity_id: string | null;
  prerequisite_required_status: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type RequestStatus =
  | "rascunho"
  | "enviado"
  | "em_analise"
  | "pendente"
  | "aguardando_correcao"
  | "aprovado"
  | "rejeitado"
  | "finalizado";

export interface EnrollmentRequest {
  id: string;
  student_id: string;
  activity_id: string;
  status: RequestStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  justification: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joins
  activity?: Activity;
  student?: Profile;
  reviewer?: Profile;
}

export interface FormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "email" | "select" | "radio" | "checkbox" | "file";
  required: boolean;
  options?: string[];
  help?: string;
}

export interface FormDefinition {
  id: string;
  activity_id: string;
  version: number;
  fields: FormField[];
  is_active: boolean;
  created_at: string;
}

export interface FormSubmission {
  id: string;
  request_id: string;
  form_definition_id: string;
  data: Record<string, string | number>;
  version: number;
  submitted_at: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  request_id: string;
  student_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  source: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  activity_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  is_visible: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  activity?: Activity;
}

export interface Deadline {
  id: string;
  activity_id: string | null;
  deadline_type: "matricula" | "entrega" | "defesa" | "outro";
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  activity?: Activity;
}

export interface RequestHistoryEntry {
  id: string;
  request_id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  observation: string | null;
  created_at: string;
}

export interface AdvisorAssignment {
  id: string;
  advisor_id: string;
  student_id: string;
  activity_id: string;
  assigned_at: string;
  advisor?: Profile;
  student?: Profile;
  activity?: Activity;
}

export interface SupervisorAssignment {
  id: string;
  supervisor_id: string;
  student_id: string;
  activity_id: string;
  assigned_at: string;
  supervisor?: Profile;
  student?: Profile;
  activity?: Activity;
}

export type NotificationType = "correction" | "approved" | "rejeited" | "pending" | "resubmitted" | "info";

export interface AppNotification {
  id: string;
  user_id: string;
  request_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
