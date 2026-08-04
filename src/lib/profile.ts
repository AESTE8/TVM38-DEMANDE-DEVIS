import {
  authHeaders,
  clearSession,
  ClientData,
  updateSessionClient,
} from '@/lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export class ProfilSessionExpiree extends Error {
  constructor() {
    super('Session expirée');
    this.name = 'ProfilSessionExpiree';
  }
}

async function verifier<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearSession();
    throw new ProfilSessionExpiree();
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(String(payload.error ?? `Requête échouée (${res.status})`));
  }
  return (await res.json()) as T;
}

export async function fetchProfil(): Promise<ClientData> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/client-portal/profil`, {
    headers: authHeaders(),
  });
  const payload = await verifier<{ client: ClientData }>(res);
  updateSessionClient(payload.client);
  return payload.client;
}

export async function modifierProfil(operation: string, data: Record<string, unknown>): Promise<ClientData> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/update-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ operation, data }),
  });
  const payload = await verifier<{ client: ClientData }>(res);
  updateSessionClient(payload.client);
  return payload.client;
}
