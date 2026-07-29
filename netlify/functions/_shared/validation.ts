export function parseJsonBody<T>(body: string | null): T {
  if (!body) {
    throw new Error("Corpo da requisicao ausente.");
  }
  return JSON.parse(body) as T;
}

export function requireEnv(name: string): string {
  const deno = (globalThis as typeof globalThis & { Deno?: { env: { get(key: string): string | undefined } } }).Deno;
  const value = deno?.env.get(name) ?? process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}
