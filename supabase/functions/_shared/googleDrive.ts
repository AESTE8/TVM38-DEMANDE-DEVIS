// Accès Google Drive via un compte de service.
//
// La clé privée du compte de service ne quitte JAMAIS l'infrastructure : elle
// vit dans le secret `GOOGLE_SERVICE_ACCOUNT_JSON` des edge functions. Ni le
// logiciel desktop ni le site web ne la manipulent — un poste compromis ou un
// exécutable décompilé ne donne donc aucun accès au Drive.
//
// ⚠️ Prérequis Google : les comptes de service n'ont pas de quota de stockage
// propre. Le dossier cible doit être un **Drive partagé** (Shared Drive) dont le
// compte de service est membre avec le rôle « Gestionnaire de contenu ».
// Un simple dossier partagé depuis un Drive personnel provoque l'erreur
// « Service Accounts do not have storage quota » à l'upload.

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
// drive.file : le compte de service ne voit que les fichiers qu'il a créés
// lui-même. Portée minimale, il ne peut pas parcourir le reste du Drive.
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Charge le compte de service depuis le secret.
 *
 * La valeur traverse un shell avant d'arriver ici, et c'est là qu'elle s'abîme :
 * guillemets avalés, BOM ajouté par un éditeur Windows, valeur entourée
 * d'apostrophes. On absorbe ces cas plutôt que de renvoyer un `SyntaxError` nu,
 * qui n'apprend rien à celui qui a posé le secret.
 *
 * Le base64 est accepté en plus du JSON brut : c'est la façon la plus sûre de
 * transporter ce secret, aucun shell ne peut le déformer.
 *   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(base64 -w0 compte.json)"
 */
function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON manquant');

  // BOM, espaces, et apostrophes ou guillemets d'enrobage laissés par le shell.
  let texte = raw.replace(/^\uFEFF/, '').trim();
  if (texte.length > 1 && (texte[0] === "'" || texte[0] === '"') && texte.at(-1) === texte[0]) {
    texte = texte.slice(1, -1).trim();
  }

  // Pas du JSON : on tente le base64 avant d'abandonner.
  if (!texte.startsWith('{')) {
    try {
      texte = atob(texte.replace(/\s+/g, '')).trim();
    } catch {
      // On retombe sur l'erreur de parsing ci-dessous, plus parlante.
    }
  }

  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(texte) as ServiceAccount;
  } catch (err) {
    // Les premiers caractères d'un JSON de compte de service ne sont pas
    // sensibles (`{"type":"service_account",...`) — la clé privée est bien plus
    // loin. Les montrer est ce qui permet de comprendre ce qui a été posé.
    const apercu = texte.slice(0, 40).replace(/\s+/g, ' ');
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON illisible (${texte.length} caractères, commence par « ${apercu} ») : ` +
      `${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Une valeur encodée deux fois donne une chaîne, pas un objet.
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON n'est pas un objet JSON (type ${typeof parsed}) — ` +
      'la valeur a probablement été encodée deux fois',
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    const champs = Object.keys(parsed).join(', ') || 'aucun';
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON incomplet — champs trouvés : ${champs}`);
  }
  return parsed;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Les secrets sont souvent collés avec des \n littéraux : on les restaure.
  const normalized = pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
  const body = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Jeton d'accès Google, mis en cache jusqu'à une minute avant son expiration. */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const account = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64Url(encoder.encode(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  })));

  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(`${header}.${claims}`),
  );

  const assertion = `${header}.${claims}.${base64Url(new Uint8Array(signature))}`;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth a refusé l'assertion : ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/**
 * Dépose un PDF dans le Drive partagé.
 *
 * Si `existingFileId` est fourni, le contenu du fichier est **écrasé** au lieu
 * d'en créer un nouveau. C'est le point qui fait tenir tout l'édifice : le lien
 * stocké en base ne change jamais, et le PDF derrière est toujours la dernière
 * version enregistrée par le dispatcher.
 */
export async function uploadPdf(
  bytes: Uint8Array,
  fileName: string,
  folderId: string,
  existingFileId?: string | null,
): Promise<string> {
  const token = await getAccessToken();
  const pdfBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  if (existingFileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}` +
        `?uploadType=media&supportsAllDrives=true`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
        body: pdfBody,
      },
    );

    if (res.ok) return existingFileId;

    // Fichier supprimé du Drive entre-temps : on repart sur une création.
    if (res.status !== 404) {
      throw new Error(`Écrasement du PDF échoué : ${res.status} ${await res.text()}`);
    }
  }

  const boundary = `tvm38-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId], mimeType: 'application/pdf' });

  const head = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    throw new Error(`Dépôt du PDF échoué : ${res.status} ${await res.text()}`);
  }

  const { id } = await res.json();
  return id as string;
}

/**
 * Dépose un nouveau fichier, sans jamais écraser quoi que ce soit.
 *
 * Sert à tout ce qui doit rester figé : la version d'un devis mise à la
 * disposition d'un client, et les justificatifs d'acceptation. Écraser l'un de
 * ces fichiers reviendrait à effacer la pièce sur laquelle un accord a été
 * donné — on ne pourrait plus montrer ce que le client avait sous les yeux.
 */
export async function uploadNewFile(
  bytes: Uint8Array,
  fileName: string,
  folderId: string,
  mimeType = 'application/pdf',
): Promise<string> {
  const token = await getAccessToken();
  const boundary = `tvm38-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId], mimeType });

  const head = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    // 404 sur un dossier existant : la portée drive.file ne laisse voir au
    // compte de service que ce qu'il a lui-même créé. Un dossier fabriqué à la
    // main dans l'interface Drive lui est invisible, même sur un Drive partagé
    // dont il est membre. Le message doit le dire, sinon on cherche un problème
    // de droits là où il n'y en a pas.
    if (res.status === 404) {
      throw new Error(
        `Dossier Drive ${folderId} introuvable pour le compte de service. ` +
        'Avec la portée drive.file, un dossier créé manuellement lui reste invisible : ' +
        'il faut le lui partager explicitement, ou le laisser le créer. ' +
        `Réponse Google : ${detail}`,
      );
    }
    throw new Error(`Dépôt du fichier échoué : ${res.status} ${detail}`);
  }

  const { id } = await res.json();
  return id as string;
}

/**
 * Supprime un fichier. Utilisé en compensation : si l'enregistrement en base
 * échoue après le dépôt, le fichier orphelin ne doit pas rester sur le Drive.
 * L'échec de la suppression n'est jamais fatal — mieux vaut un orphelin
 * journalisé qu'une erreur qui masque la cause initiale.
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function getFileMetadata(
  fileId: string,
): Promise<{ id: string; name: string; mimeType: string; size: number } | null> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
      '?supportsAllDrives=true&fields=id,name,mimeType,size',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return {
    id: String(data.id),
    name: String(data.name ?? ''),
    mimeType: String(data.mimeType ?? ''),
    size: Number(data.size ?? 0),
  };
}

/** Retourne le sous-dossier demandé ou le crée dans le dossier Drive fourni. */
export async function ensureFolder(parentFolderId: string, folderName: string): Promise<string> {
  const token = await getAccessToken();
  const escapedName = folderName.replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `'${parentFolderId}' in parents and name = '${escapedName}' and ` +
    `mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const list = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!list.ok) throw new Error(`Recherche du dossier Drive échouée : ${list.status} ${await list.text()}`);
  const existing = (await list.json()) as { files?: Array<{ id: string }> };
  if (existing.files?.[0]?.id) return existing.files[0].id;

  const create = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      parents: [parentFolderId],
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!create.ok) throw new Error(`Création du dossier Drive échouée : ${create.status} ${await create.text()}`);
  return String((await create.json()).id);
}

/** Récupère le contenu d'un PDF privé. Le client ne voit jamais l'URL Drive. */
export async function downloadPdf(fileId: string): Promise<Uint8Array> {
  const token = await getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    throw new Error(`Lecture du PDF échouée : ${res.status} ${await res.text()}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}
