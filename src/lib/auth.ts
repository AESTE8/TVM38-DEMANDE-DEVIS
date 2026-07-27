const SESSION_KEY = 'tvm38_client_session';
const GUEST_KEY = 'tvm38_guest';

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
  /**
   * Jeton signé par le serveur. C'est lui qui fait autorité : les infos client
   * stockées à côté ne servent qu'à l'affichage (pré-remplissage du formulaire,
   * badge d'en-tête). Modifier le localStorage ne donne accès à rien, puisque
   * les edge functions ne se fient qu'à la signature du jeton.
   */
  token: string;
  expiresAt: number;
}

export function getSession(): ClientSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: ClientSession = JSON.parse(raw);
    if (!session?.token || Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(client: ClientData, token: string, expiresAt: number): void {
  const session: ClientSession = { client, token, expiresAt };
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

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

/** En-tête d'authentification pour les appels aux edge functions. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
