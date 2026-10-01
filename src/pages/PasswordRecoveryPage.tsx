import { useState } from "react";
import { CheckCircle2, GraduationCap, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

export function PasswordRecoveryPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-600 text-white">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">CTES</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">UFRA · Paragominas</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 dark:text-emerald-400" />
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Senha atualizada</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sua senha foi alterada. Você já pode voltar ao sistema.</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Criar nova senha</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Escolha uma nova senha para acessar sua conta.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Pelo menos 6 caracteres" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmar nova senha</label>
                <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required minLength={6} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Digite novamente" />
              </div>
              {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</div>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Atualizando..." : "Atualizar senha"}</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
