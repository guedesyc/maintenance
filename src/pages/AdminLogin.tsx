import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginAdmin } from "@/services/adminApiService";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/admin";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginAdmin(username, password);
      navigate(from, { replace: true });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-haze px-4">
      <form className="panel w-full max-w-md p-8" onSubmit={onSubmit}>
        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          Acesso administrativo
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-ink">Entrar no painel</h1>
        <p className="mt-2 text-sm text-stone-600">
          Use as credenciais configuradas nas variaveis do Netlify. No teste local do painel, rode com netlify dev.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Usuario</label>
            <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Senha</label>
            <input
              type="password"
              className="input-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" className="button-primary mt-6 w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
