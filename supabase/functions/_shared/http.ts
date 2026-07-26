// Helpers HTTP communs aux edge functions.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function preflight(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Secret de signature des jetons client.
 * On échoue bruyamment au démarrage plutôt que de signer avec une valeur par
 * défaut : un secret deviné rendrait toute l'authentification inutile.
 */
export function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.length < 32) {
    throw new Error(`${name} manquant ou trop court (32 caractères minimum)`);
  }
  return value;
}
