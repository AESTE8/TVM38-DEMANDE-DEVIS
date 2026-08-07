// Primitives cryptographiques partagées par les edge functions.
// Tout est basé sur Web Crypto, disponible nativement dans Deno : aucune
// dépendance externe à faire vivre sur des fonctions critiques.

const PBKDF2_ITERATIONS = 210_000; // Recommandation OWASP pour PBKDF2-SHA256
const KEY_LENGTH_BITS = 256;

const encoder = new TextEncoder();

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
}

/** Comparaison à temps constant — évite de fuiter le hash octet par octet. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: arrayBuffer(salt), iterations, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

/** Produit un hash au format `pbkdf2$<iterations>$<salt_b64>$<hash_b64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  try {
    const derived = await pbkdf2(password, fromBase64(parts[2]), iterations);
    return timingSafeEqual(derived, fromBase64(parts[3]));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// JWT HS256
// ---------------------------------------------------------------------------
// Le site web ne stocke plus un objet client librement modifiable : il stocke un
// jeton signé. Modifier son contenu (pour se faire passer pour un autre client)
// invalide la signature, et les edge functions rejettent le jeton.

export interface ClientTokenPayload {
  sub: string; // clients.id
  code: string;
  nom: string;
  iat: number;
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signClientToken(
  payload: Omit<ClientTokenPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body: ClientTokenPayload = { ...payload, iat: now, exp: now + ttlSeconds };

  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const claims = toBase64Url(encoder.encode(JSON.stringify(body)));
  const data = `${header}.${claims}`;

  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(data));
  return `${data}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Vérifie signature et expiration d'un jeton HS256, et renvoie ses claims.
 *
 * Volontairement générique : deux émetteurs cohabitent sur ce projet. Le site
 * signe les jetons client avec `CLIENT_JWT_SECRET`, tandis que le logiciel de
 * la carrière signe les siens avec son propre secret (voir la fonction `devis`
 * de son dépôt). Les deux sont des HS256 à vérifier de la même façon ; seules
 * les claims attendues diffèrent.
 */
export async function verifyHs256(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const data = `${parts[0]}.${parts[1]}`;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      arrayBuffer(fromBase64Url(parts[2])),
      encoder.encode(data),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(parts[1])),
    ) as Record<string, unknown>;

    // Un jeton sans expiration serait éternel : on le refuse.
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/** Renvoie le payload si le jeton client est valide et non expiré, sinon null. */
export async function verifyClientToken(
  token: string,
  secret: string,
): Promise<ClientTokenPayload | null> {
  const payload = await verifyHs256(token, secret);
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) return null;
  // Un jeton d'accès voyage dans une URL d'e-mail : il ne doit jamais servir de
  // jeton de session. Il s'échange contre une vraie session auprès de
  // `auth-client`, et rien d'autre ne l'accepte.
  if (payload.scope === 'acces') return null;
  return payload as unknown as ClientTokenPayload;
}

// ---------------------------------------------------------------------------
// Jeton d'accès des e-mails
// ---------------------------------------------------------------------------
// Permet au client d'arriver connecté sur son dossier depuis un lien d'e-mail,
// sans que son mot de passe circule dans une URL — une adresse web se retrouve
// dans l'historique du navigateur, les logs, l'en-tête Referer et les aperçus
// de lien des messageries, et un e-mail se transfère.
//
// Le jeton ne donne accès qu'à l'espace de ce client, expire, et se révoque en
// changeant le secret. Un mot de passe, lui, resterait valable indéfiniment.

export interface AccesTokenPayload {
  sub: string;
  scope: 'acces';
  /** Dossier à ouvrir après connexion. Absent : le client arrive sur sa liste. */
  affaire?: string;
  iat: number;
  exp: number;
}

export async function signAccesToken(
  payload: { sub: string; affaire?: string },
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body: AccesTokenPayload = { ...payload, scope: 'acces', iat: now, exp: now + ttlSeconds };

  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const claims = toBase64Url(encoder.encode(JSON.stringify(body)));
  const data = `${header}.${claims}`;

  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(data));
  return `${data}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAccesToken(
  token: string,
  secret: string,
): Promise<AccesTokenPayload | null> {
  const payload = await verifyHs256(token, secret);
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) return null;
  if (payload.scope !== 'acces') return null;
  return payload as unknown as AccesTokenPayload;
}

/** Claims du jeton émis par le logiciel de la carrière à ses opérateurs. */
export interface OperateurTokenPayload {
  sub: string;
  identifiant: string;
  role: 'developpeur' | 'utilisateur' | 'spectateur';
  exp: number;
  iat: number;
}

/**
 * Vérifie le jeton d'un opérateur du logiciel de la carrière.
 *
 * Le logiciel n'utilise pas Supabase Auth : il signe ses propres jetons avec
 * `tvm38-auth-v1:<service_role_key>`, exactement comme le vérifie sa fonction
 * `devis`. Le secret n'est donc pas une valeur à configurer en plus — il se
 * dérive de la clé de service déjà présente dans l'environnement.
 *
 * Les comptes `spectateur` sont refusés : ils sont en lecture seule côté
 * logiciel, ils n'ont pas à déposer de document.
 */
export async function requireOperateur(
  req: Request,
  serviceRoleKey: string,
): Promise<OperateurTokenPayload | null> {
  const header = req.headers.get('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const payload = await verifyHs256(match[1].trim(), `tvm38-auth-v1:${serviceRoleKey}`);
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) return null;
  if (payload.role === 'spectateur') return null;

  return payload as unknown as OperateurTokenPayload;
}

/** Extrait et vérifie le jeton porté par l'en-tête `Authorization: Bearer ...`. */
export async function requireClient(
  req: Request,
  secret: string,
): Promise<ClientTokenPayload | null> {
  const header = req.headers.get('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return await verifyClientToken(match[1].trim(), secret);
}
