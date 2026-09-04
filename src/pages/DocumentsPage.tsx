import { useEffect, useState, useMemo } from "react";
import { FolderOpen, Download, FileText, BookOpen, Files } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLibraryDocuments, useDocuments, useStudentRequests, useAllRequests } from "@/lib/hooks";
import { getDocumentUrl } from "@/lib/api";
import { Card, PageHeader, EmptyState, Spinner, Badge } from "@/components/ui";
import { DOCUMENT_TYPES, formatDate } from "@/lib/constants";
import type { PageKey } from "@/components/AppLayout";

export function DocumentsPage({ onNavigate }: { onNavigate: (k: PageKey, ctx?: Record<string, string>) => void }) {
  const { profile } = useAuth();
  const isStudent = profile?.role === "student";
  const isCTES = profile?.role === "ctes" || profile?.role === "admin";
  const isAdvisor = profile?.role === "advisor";
  const isSupervisor = profile?.role === "supervisor";

  const { documents: libraryDocs, loading: libLoading } = useLibraryDocuments();
  const { requests } = useAllRequests();
  const { requests: myRequests } = useStudentRequests(isStudent ? profile?.id : undefined);

  // For students: their own uploaded documents. For CTES/advisor/supervisor: all documents from requests they can see
  const { documents: uploadedDocs, loading: upLoading } = useDocuments(isCTES || isAdvisor || isSupervisor ? undefined : profile?.id);

  const [libUrls, setLibUrls] = useState<Record<string, string>>({});
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  // Filter library docs: students only see visible ones
  const visibleLibrary = useMemo(() => {
    if (isCTES) return libraryDocs;
    return libraryDocs.filter((d) => d.is_visible);
  }, [libraryDocs, isCTES]);

  useEffect(() => {
    if (visibleLibrary.length === 0) return;
    Promise.all(
      visibleLibrary.map(async (d) => {
        const url = await getDocumentUrl(d.file_path);
        return [d.id, url] as [string, string | null];
      })
    ).then((entries) => setLibUrls(Object.fromEntries(entries.filter(([, v]) => v !== null)) as Record<string, string>));
  }, [visibleLibrary]);

  useEffect(() => {
    if (uploadedDocs.length === 0) return;
    Promise.all(
      uploadedDocs.map(async (d) => {
        const url = await getDocumentUrl(d.file_path);
        return [d.id, url] as [string, string | null];
      })
    ).then((entries) => setDocUrls(Object.fromEntries(entries.filter(([, v]) => v !== null)) as Record<string, string>));
  }, [uploadedDocs]);

  const requestMap = useMemo(() => {
    const m = new Map<string, { studentName: string; activityCode: string }>();
    requests.forEach((r) => {
      m.set(r.id, {
        studentName: r.student?.full_name || r.student?.email || "Aluno",
        activityCode: r.activity?.code || "",
      });
    });
    myRequests.forEach((r) => {
      m.set(r.id, {
        studentName: r.student?.full_name || r.student?.email || "Aluno",
        activityCode: r.activity?.code || "",
      });
    });
    return m;
  }, [requests, myRequests]);

  // Group library docs by activity
  const libraryGrouped = useMemo(() => {
    const groups: Record<string, typeof visibleLibrary> = { Geral: [] };
    for (const d of visibleLibrary) {
      const key = d.activity?.code || "Geral";
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [visibleLibrary]);

  if (libLoading || upLoading) {
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
        subtitle={
          isStudent
            ? "Documentos disponibilizados pela CTES e seus documentos enviados."
            : isCTES
            ? "Documentos da biblioteca e documentos enviados pelos alunos."
            : isAdvisor
            ? "Documentos de TCC dos seus orientandos."
            : isSupervisor
            ? "Documentos de estágio dos seus supervisionados."
            : "Documentos"
        }
        action={isCTES && <button onClick={() => onNavigate("library")} className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Gerenciar biblioteca</button>}
      />

      {/* Library documents — visible to all */}
      {!isAdvisor && !isSupervisor && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Documentos disponibilizados pela CTES</h2>
          </div>
          {visibleLibrary.length === 0 ? (
            <Card>
              <EmptyState
                icon={<FolderOpen className="w-8 h-8" />}
                title="Nenhum documento disponível"
                description="A CTES ainda não disponibilizou documentos."
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(libraryGrouped).map(([groupKey, docs]) => (
                docs.length > 0 && (
                  <div key={groupKey}>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      {groupKey === "Geral" ? "Documentos gerais" : groupKey}
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {docs.map((doc) => (
                        <Card key={doc.id} className={!doc.is_visible && isCTES ? "opacity-60" : ""}>
                          <div className="p-5">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{doc.title}</p>
                                {doc.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{doc.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center justify-end mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                              {libUrls[doc.id] && (
                                <a
                                  href={libUrls[doc.id]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium"
                                >
                                  <Download className="w-4 h-4" />
                                  Baixar
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* Uploaded documents */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Files className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {isStudent ? "Meus documentos enviados" : "Documentos enviados pelos alunos"}
          </h2>
        </div>
        {uploadedDocs.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FolderOpen className="w-8 h-8" />}
              title="Nenhum documento enviado"
              description={isStudent ? "Os documentos enviados nas suas solicitações aparecerão aqui." : "Nenhum documento enviado."}
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {uploadedDocs.map((doc) => {
              const info = requestMap.get(doc.request_id);
              return (
                <Card key={doc.id}>
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                          {DOCUMENT_TYPES[doc.document_type] || doc.document_type}
                        </Badge>
                        {doc.source === "ctes" && (
                          <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            CTES
                          </Badge>
                        )}
                        {!isStudent && info && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{info.studentName} · {info.activityCode}</span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    {docUrls[doc.id] && (
                      <a
                        href={docUrls[doc.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
