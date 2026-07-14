export function parseJsonBody<T>(body: string | null): T {
  if (!body) {
    throw new Error("Corpo da requisicao ausente.");
  }
  return JSON.parse(body) as T;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}
