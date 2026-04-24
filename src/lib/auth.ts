const SESSION_KEY = 'tvm38_client_session';
const GUEST_KEY = 'tvm38_guest';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface ClientData {
  id: string;
  nom: string;
  prenom?: string;
  code: string;
  type: 'professionnel' | 'particulier' | 'professionnel_sans_compte';
  email?: string;
  telephone?: string;
  adresse?: string;
  contacts?: Array<{
    id: string;
    nom: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    fonction?: string;
    principal?: boolean;
  }>;
  agences?: Array<{
    id: string;
    nom: string;
    adresse?: string;
  }>;
}

interface ClientSession {
  client: ClientData;
  expiresAt: number;
}

export function getSession(): ClientSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: ClientSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(client: ClientData): void {
  const session: ClientSession = {
    client,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(GUEST_KEY);
}

export function isSessionValid(): boolean {
  return getSession() !== null;
}

export function getConnectedClient(): ClientData | null {
  return getSession()?.client ?? null;
}

export function setGuestMode(): void {
  sessionStorage.setItem(GUEST_KEY, 'true');
}

export function isGuestMode(): boolean {
  return sessionStorage.getItem(GUEST_KEY) === 'true';
}

export function clearGuestMode(): void {
  sessionStorage.removeItem(GUEST_KEY);
}

export function hasAccess(): boolean {
  return isSessionValid() || isGuestMode();
}
