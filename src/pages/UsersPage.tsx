import { useMemo, useState } from "react";
import { Users, Search, Plus, Link2, UserPlus, Pencil, Ban, CheckCircle, Shield, Eye, EyeOff } from "lucide-react";
import { useProfiles, useActivities } from "@/lib/hooks";
import { Card, PageHeader, Button, EmptyState, Spinner, Badge, Modal, Select, Input } from "@/components/ui";
import { ROLE_META } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuth as useAuthCtx } from "@/lib/auth";
import type { Role, Profile } from "@/lib/types";

export function UsersPage() {
  const { profiles, loading, reload } = useProfiles();
  const { activities } = useActivities();
  const { profile: currentUser } = useAuthCtx();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [assignModal, setAssignModal] = useState<Profile | null>(null);
  const [assignRole, setAssignRole] = useState<"advisor" | "supervisor">("advisor");
  const [assignActivityId, setAssignActivityId] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "advisor" as Role,
    registration_number: "",
    department: "",
    phone: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "advisor" as Role,
    department: "",
    phone: "",
    registration_number: "",
    is_active: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const CREATION_ROLES: { value: Role; label: string }[] = isAdmin
    ? [
        { value: "ctes", label: "CTES / Coordenação" },
        { value: "advisor", label: "Orientador / Professor" },
        { value: "supervisor", label: "Supervisor de Estágio" },
        { value: "admin", label: "Administrador Geral" },
      ]
    : [
        { value: "ctes", label: "CTES / Coordenação" },
        { value: "advisor", label: "Orientador / Professor" },
        { value: "supervisor", label: "Supervisor de Estágio" },
      ];

  const EDIT_ROLES: { value: Role; label: string }[] = isAdmin
    ? [
        { value: "student", label: "Aluno" },
        { value: "ctes", label: "CTES / Coordenação" },
        { value: "advisor", label: "Orientador / Professor" },
        { value: "supervisor", label: "Supervisor de Estágio" },
        { value: "admin", label: "Administrador Geral" },
      ]
    : [
        { value: "student", label: "Aluno" },
        { value: "ctes", label: "CTES / Coordenação" },
        { value: "advisor", label: "Orientador / Professor" },
        { value: "supervisor", label: "Supervisor de Estágio" },
      ];

  const students = useMemo(() => profiles.filter((p) => p.role === "student"), [profiles]);
  const tccActivities = useMemo(() => activities.filter((a) => a.category === "TCC"), [activities]);
  const esoActivities = useMemo(() => activities.filter((a) => a.category === "ESO"), [activities]);

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function handleAssign() {
    if (!assignModal || !assignStudentId || !assignActivityId) return;
    const table = assignRole === "advisor" ? "advisor_assignments" : "supervisor_assignments";
    const col = assignRole === "advisor" ? "advisor_id" : "supervisor_id";
    await supabase.from(table).insert({
      [col]: assignModal.id,
      student_id: assignStudentId,
      activity_id: assignActivityId,
    });
    setAssignModal(null);
    setAssignStudentId("");
    setAssignActivityId("");
  }

  async function handleCreateUser() {
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    if (!createForm.email || !createForm.password || !createForm.full_name) {
      setCreateError("Nome, e-mail e senha são obrigatórios.");
      setCreating(false);
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError("A senha deve ter pelo menos 6 caracteres.");
      setCreating(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(createForm),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setCreateError(result.error || "Erro ao criar usuário.");
      setCreating(false);
      return;
    }

    setCreateSuccess("Usuário criado com sucesso!");
    setCreating(false);
    setCreateForm({
      email: "",
      password: "",
      full_name: "",
      role: "advisor",
      registration_number: "",
      department: "",
      phone: "",
    });
    await reload();
    setTimeout(() => {
      setCreateSuccess(null);
      setCreateModal(false);
    }, 1500);
  }

  function openEditModal(p: Profile) {
    setEditModal(p);
    setEditForm({
      full_name: p.full_name || "",
      role: p.role,
      department: p.department || "",
      phone: p.phone || "",
      registration_number: p.registration_number || "",
      is_active: p.is_active ?? true,
    });
    setEditError(null);
  }

  async function handleEditUser() {
    if (!editModal) return;
    setEditSaving(true);
    setEditError(null);

    const updateData: Record<string, unknown> = {
      full_name: editForm.full_name,
      department: editForm.department || null,
      phone: editForm.phone || null,
    };

    if (isAdmin) {
      updateData.role = editForm.role;
      updateData.registration_number = editForm.registration_number || null;
      updateData.is_active = editForm.is_active;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", editModal.id);

    if (error) {
      setEditError(error.message);
      setEditSaving(false);
      return;
    }

    setEditModal(null);
    setEditSaving(false);
    await reload();
  }

  async function toggleActive(p: Profile) {
    const newActive = !p.is_active;
    await supabase.from("profiles").update({ is_active: newActive }).eq("id", p.id);
    await reload();
  }

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
        title="Usuários"
        subtitle="Gerencie perfis, crie usuários, edite, desative e atribua orientadores e supervisores."
        action={
          <Button onClick={() => { setCreateModal(true); setCreateError(null); setCreateSuccess(null); }}>
            <UserPlus className="w-4 h-4" />
            Criar usuário
          </Button>
        }
      />

      {isAdmin && (
        <div className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-4 py-2.5 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
          <Shield className="w-4 h-4 shrink-0" />
          Você está logado como Administrador Geral — pode criar, editar, desativar usuários e alterar perfis.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Todos os perfis</option>
          <option value="admin">Administrador Geral</option>
          <option value="student">Alunos</option>
          <option value="ctes">CTES</option>
          <option value="advisor">Orientadores</option>
          <option value="supervisor">Supervisores</option>
        </select>
      </div>

      <Card>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.length === 0 ? (
            <EmptyState icon={<Users className="w-10 h-10" />} title="Nenhum usuário encontrado" />
          ) : (
            filtered.map((p) => {
              const isSelf = currentUser?.id === p.id;
              const isEditingAdmin = p.role === "admin";
              const canEdit = isAdmin || (currentUser?.role === "ctes");
              const canToggle = (isAdmin || currentUser?.role === "ctes") && !isSelf && !isEditingAdmin;
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold shrink-0">
                      {(p.full_name || p.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.full_name || "Sem nome"}</p>
                        {!p.is_active && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">inativo</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.email}</p>
                      {p.registration_number && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Matrícula: {p.registration_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={roleBadgeClass(p.role)}>{ROLE_META[p.role].short}</Badge>
                    {(p.role === "advisor" || p.role === "supervisor") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssignModal(p);
                          setAssignRole(p.role as "advisor" | "supervisor");
                          setAssignActivityId("");
                          setAssignStudentId("");
                        }}
                      >
                        <Link2 className="w-4 h-4" />
                        Atribuir
                      </Button>
                    )}
                    {canEdit && !isSelf && (
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(p)}>
                        <Pencil className="w-4 h-4" />
                        Editar
                      </Button>
                    )}
                    {canToggle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(p)}
                        title={p.is_active ? "Desativar usuário" : "Reativar usuário"}
                      >
                        {p.is_active ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Create user modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Criar usuário" size="lg">
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Crie contas de CTES, Orientador/Professor ou Supervisor de Estágio{isAdmin ? " ou Administrador Geral" : ""}. Alunos se cadastram publicamente.
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Nome completo"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
            />
            <Input
              label="E-mail"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pr-10 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Select
              label="Perfil"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
            >
              {CREATION_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Input
              label="Matrícula (opcional)"
              value={createForm.registration_number}
              onChange={(e) => setCreateForm({ ...createForm, registration_number: e.target.value })}
            />
            <Input
              label="Departamento (opcional)"
              value={createForm.department}
              onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
            />
            <Input
              label="Telefone (opcional)"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>

          {createError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {createError}
            </div>
          )}
          {createSuccess && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {createSuccess}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              <Plus className="w-4 h-4" />
              {creating ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit user modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Editar usuário" size="lg">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Nome completo"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            />
            <Select
              label="Perfil"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
              disabled={!isAdmin}
            >
              {EDIT_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Input
              label="Matrícula"
              value={editForm.registration_number}
              onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })}
              disabled={!isAdmin}
            />
            <Input
              label="Departamento"
              value={editForm.department}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            />
            <Input
              label="Telefone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            {isAdmin && (
              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  Usuário ativo
                </label>
              </div>
            )}
          </div>

          {!isAdmin && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A alteração de perfil e matrícula está disponível apenas para o Administrador Geral.
            </p>
          )}

          {editError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {editError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={editSaving}>
              {editSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assignment modal */}
      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Atribuir ${assignRole === "advisor" ? "orientando" : "supervisionado"}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vincular aluno a <strong>{assignModal?.full_name || assignModal?.email}</strong> como{" "}
            {assignRole === "advisor" ? "orientador de TCC" : "supervisor de estágio"}.
          </p>
          <Select label="Aluno" value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)}>
            <option value="">Selecione um aluno...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name || s.email}
              </option>
            ))}
          </Select>
          <Select
            label="Atividade"
            value={assignActivityId}
            onChange={(e) => setAssignActivityId(e.target.value)}
          >
            <option value="">Selecione uma atividade...</option>
            {(assignRole === "advisor" ? tccActivities : esoActivities).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignModal(null)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!assignStudentId || !assignActivityId}>
              Vincular
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case "admin": return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    case "student": return "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "ctes": return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "advisor": return "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800";
    case "supervisor": return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  }
}
