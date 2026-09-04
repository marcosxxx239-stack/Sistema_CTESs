import { useState } from "react";
import { GraduationCap, Mail, Lock, User as UserIcon, Hash, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui";

export function LoginPage() {
  const { signInWithIdentifier, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signInWithIdentifier(identifier.trim(), password);
        if (error) setError(error);
      } else {
        if (password.length < 6) {
          setError("A senha deve ter pelo menos 6 caracteres.");
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          setError("Nome completo é obrigatório.");
          setLoading(false);
          return;
        }
        if (!registrationNumber.trim()) {
          setError("Número de matrícula é obrigatório.");
          setLoading(false);
          return;
        }
        const { error } = await signUp(
          email.trim(),
          password,
          fullName.trim(),
          registrationNumber.trim()
        );
        if (error) setError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: "login" | "signup") {
    setMode(newMode);
    setError(null);
  }

  const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 dark:from-emerald-900 dark:via-gray-900 dark:to-teal-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-teal-300 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">CTES</p>
              <p className="text-sm text-emerald-200 leading-tight">UFRA · Paragominas</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Sistema de Gerenciamento de Atividades Acadêmicas
            </h1>
            <p className="text-emerald-100 text-lg leading-relaxed">
              Comissão de Trabalho de Conclusão de Curso e Estágio Supervisionado
              Obrigatório — Bacharelado em Sistemas de Informação.
            </p>
            <div className="mt-8 space-y-3">
              {["ESO 1 e ESO 2 — Estágio Supervisionado", "TCC 1 e TCC 2 — Trabalho de Conclusão", "Solicitações, formulários, documentos e prazos"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-3 text-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    <span className="text-sm">{item}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <p className="text-xs text-emerald-300">Protótipo acadêmico · TCC · {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={theme === "light" ? "Modo escuro" : "Modo claro"}
          aria-label="Alternar tema"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-600 text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">CTES</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">UFRA · Paragominas</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {mode === "login" ? "Entrar no sistema" : "Cadastro de aluno"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {mode === "login"
                ? "Use seu e-mail ou número de matrícula."
                : "O cadastro público é exclusivo para alunos. Demais perfis são criados pela CTES."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Signup fields */}
              {mode === "signup" && (
                <>
                  <div>
                    <label className={labelClass}>Nome completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className={inputClass}
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Número de matrícula</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        required
                        className={inputClass}
                        placeholder="Ex.: 2026123456"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={inputClass}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Login — single identifier field */}
              {mode === "login" && (
                <div>
                  <label className={labelClass}>Identificação</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className={inputClass}
                      placeholder="E-mail ou matrícula"
                    />
                  </div>
                </div>
              )}

              {/* Password — always shown */}
              <div>
                <label className={labelClass}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClass}
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

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {mode === "login" ? (
                <>
                  Não tem conta?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    Entrar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
