import { useState, useEffect, useMemo } from "react";
import { FileText, Plus, Pencil, Trash2, Download, Upload, FolderOpen, Power } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLibraryDocuments, useActivities } from "@/lib/hooks";
import { uploadLibraryDocument, getDocumentUrl } from "@/lib/api";
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
import { formatDate } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { LibraryDocument } from "@/lib/types";

export function LibraryDocumentsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "ctes" || profile?.role === "admin";
  const { documents, loading, reload } = useLibraryDocuments();
  const { activities } = useActivities();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LibraryDocument | null>(null);
  const [form, setForm] = useState({ title: "", description: "", activity_id: "", is_visible: true });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [activityFilter, setActivityFilter] = useState("all");

  useEffect(() => {
    if (documents.length === 0) return;
    Promise.all(
      documents.map(async (d) => {
        const url = await getDocumentUrl(d.file_path);
        return [d.id, url] as [string, string | null];
      })
    ).then((entries) => setDocUrls(Object.fromEntries(entries.filter(([, v]) => v !== null)) as Record<string, string>));
  }, [documents]);

  function openNew() {
    setEditing(null);
    setForm({ title: "", description: "", activity_id: "", is_visible: true });
    setSelectedFile(null);
    setError(null);
    setShowModal(true);
  }

  function openEdit(d: LibraryDocument) {
    setEditing(d);
    setForm({ title: d.title, description: d.description || "", activity_id: d.activity_id || "", is_visible: d.is_visible });
    setSelectedFile(null);
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!profile) return;
    setError(null);

    if (!form.title.trim()) {
      setError("Título é obrigatório.");
      return;
    }

    if (!editing && !selectedFile) {
      setError("Selecione um arquivo.");
      return;
    }

    setUploading(true);

    try {
      if (editing) {
        let filePath = editing.file_path;
        if (selectedFile) {
          const { path, error: upErr } = await uploadLibraryDocument(selectedFile);
          if (upErr) {
            setError(upErr);
            setUploading(false);
            return;
          }
          filePath = path;
        }

        const { error: dbErr } = await supabase
          .from("library_documents")
          .update({
            title: form.title,
            description: form.description || null,
            activity_id: form.activity_id || null,
            is_visible: form.is_visible,
            file_path: filePath,
            file_name: selectedFile ? selectedFile.name : editing.file_name,
            file_size: selectedFile ? selectedFile.size : editing.file_size,
            mime_type: selectedFile ? selectedFile.type : editing.mime_type,
          })
          .eq("id", editing.id);

        if (dbErr) {
          setError(dbErr.message);
          setUploading(false);
          return;
        }
      } else {
        const { path, error: upErr } = await uploadLibraryDocument(selectedFile!);
        if (upErr) {
          setError(upErr);
          setUploading(false);
          return;
        }

        const { error: dbErr } = await supabase.from("library_documents").insert({
          title: form.title,
          description: form.description || null,
          activity_id: form.activity_id || null,
          file_path: path,
          file_name: selectedFile!.name,
          file_size: selectedFile!.size,
          mime_type: selectedFile!.type,
          is_visible: form.is_visible,
          created_by: profile.id,
        });

        if (dbErr) {
          setError(dbErr.message);
          setUploading(false);
          return;
        }
      }

      setShowModal(false);
      await reload();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(d: LibraryDocument) {
    if (!confirm(`Excluir o documento "${d.title}"?`)) return;
    await supabase.storage.from("documents").remove([d.file_path]);
    await supabase.from("library_documents").delete().eq("id", d.id);
    await reload();
  }

  async function handleToggleVisible(d: LibraryDocument) {
    await supabase.from("library_documents").update({ is_visible: !d.is_visible }).eq("id", d.id);
    await reload();
  }

  const filtered = useMemo(() => {
    if (activityFilter === "all") return documents;
    if (activityFilter === "general") return documents.filter((d) => !d.activity_id);
    return documents.filter((d) => d.activity_id === activityFilter);
  }, [documents, activityFilter]);

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
        title="Documentos"
        subtitle={isAdmin ? "Gerencie documentos disponíveis para os alunos." : "Documentos disponibilizados pela CTES."}
        action={isAdmin && <Button onClick={openNew}><Plus className="w-4 h-4" /> Novo documento</Button>}
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setActivityFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activityFilter === "all" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
        >
          Todos
        </button>
        <button
          onClick={() => setActivityFilter("general")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activityFilter === "general" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
        >
          Gerais
        </button>
        {activities.map((a) => (
          <button
            key={a.id}
            onClick={() => setActivityFilter(a.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activityFilter === a.id ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
          >
            {a.code}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderOpen className="w-10 h-10" />}
            title="Nenhum documento"
            description={isAdmin ? "Anexe documentos para os alunos." : "Nenhum documento disponível no momento."}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className={!doc.is_visible ? "opacity-60" : ""}>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{doc.title}</p>
                    {doc.activity && (
                      <Badge className="mt-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                        {doc.activity.code}
                      </Badge>
                    )}
                    {!doc.is_visible && (
                      <Badge className="mt-1 ml-1 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700">
                        Oculto
                      </Badge>
                    )}
                  </div>
                </div>
                {doc.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{doc.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(doc.created_at)}</span>
                  <div className="flex items-center gap-1">
                    {docUrls[doc.id] && (
                      <a
                        href={docUrls[doc.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Baixar
                      </a>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(doc)} title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleVisible(doc)} title={doc.is_visible ? "Ocultar" : "Mostrar"}>
                          <Power className={`w-3.5 h-3.5 ${doc.is_visible ? "text-emerald-500" : "text-gray-400"}`} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} title="Excluir">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar documento" : "Novo documento"}>
        <div className="space-y-4">
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ex.: Modelo de TCC 1"
          />
          <Textarea
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Informações sobre o documento"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {editing ? "Substituir arquivo (opcional)" : "Arquivo"}
            </label>
            <label className="cursor-pointer flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors">
              <Upload className="w-4 h-4" />
              {selectedFile ? selectedFile.name : editing ? editing.file_name : "Selecionar arquivo (PDF, DOCX...)"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                accept=".pdf,.doc,.docx,.odt,.txt,.xls,.xlsx,.ppt,.pptx"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.is_visible}
              onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
            />
            Visível para os alunos
          </label>
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? "Enviando..." : editing ? "Salvar" : "Criar documento"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
