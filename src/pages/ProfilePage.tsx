import { useState } from "react";
import { User, Save, CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader, Button, Input, Spinner, Badge } from "@/components/ui";
import { ROLE_META } from "@/lib/constants";

import { supabase } from "@/lib/supabase";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [registrationNumber, setRegistrationNumber] = useState(profile?.registration_number ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  const roleMeta = ROLE_META[profile.role];

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        registration_number: registrationNumber || null,
        department: department || null,
        phone: phone || null,
      })
      .eq("id", profile.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Perfil" subtitle="Gerencie seus dados pessoais." />

      <Card className="mb-5">
        <div className="p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-2xl font-bold shrink-0">
            {(profile.full_name || profile.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{profile.full_name || "Sem nome"}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={roleBadgeClass(profile.role)}>
                {roleMeta.label}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Lock className="w-3 h-3" />
                Definido pela CTES
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="E-mail" value={profile.email} disabled />

          {/* Role field — read-only for all users, managed by CTES */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Perfil</label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2">
              <Badge className={roleBadgeClass(profile.role)}>{roleMeta.label}</Badge>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                O perfil é controlado pela CTES e não pode ser alterado pelo usuário.
              </span>
            </div>
          </div>

          <Input label="Matrícula" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Número de matrícula" />
          <Input label="Departamento" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Departamento/Setor" />
          <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Perfil atualizado com sucesso.
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "student": return "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "ctes": return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "advisor": return "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800";
    case "supervisor": return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    default: return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
}
