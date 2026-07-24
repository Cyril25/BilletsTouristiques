/**
 * Cloudflare Worker — supabase-admin-proxy
 * ==========================================
 * Relais générique vers l'API REST Supabase, protégé par une clé
 * distincte de la vraie clé service_role Supabase (qui ne vit que
 * dans les secrets de ce Worker, jamais sur un poste local).
 *
 * Usage : rejoue n'importe quel appel PostgREST habituel, en remplaçant
 *   https://<ref>.supabase.co/rest/v1/<chemin>
 * par
 *   https://supabase-admin-proxy.<sous-domaine>.workers.dev/rest/v1/<chemin>
 * avec l'en-tête X-Proxy-Key à la place de apikey/Authorization.
 *
 * Secrets à configurer dans Cloudflare :
 *   - SUPABASE_URL          : https://<ref>.supabase.co
 *   - SUPABASE_SERVICE_KEY  : service_role key Supabase
 *   - PROXY_API_KEY         : clé propre à ce Worker (indépendante de Supabase, révocable seule)
 */

const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    const url = new URL(request.url);

    // Seul le chemin /rest/v1/... est relayé — pas d'accès aux autres endpoints Supabase
    if (!url.pathname.startsWith('/rest/v1/')) {
      return new Response('Not found', { status: 404 });
    }

    if (!ALLOWED_METHODS.includes(request.method)) {
      return jsonResponse({ error: 'Méthode non autorisée' }, 405);
    }

    const proxyKey = request.headers.get('X-Proxy-Key');
    if (!proxyKey || proxyKey !== env.PROXY_API_KEY) {
      return jsonResponse({ error: 'Clé invalide' }, 403);
    }

    const targetUrl = env.SUPABASE_URL + url.pathname + url.search;

    const headers = {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };
    // Transmet Prefer (return=minimal / return=representation) si fourni par l'appelant
    const prefer = request.headers.get('Prefer');
    if (prefer) headers['Prefer'] = prefer;

    const init = { method: request.method, headers };
    if (request.method === 'POST' || request.method === 'PATCH') {
      init.body = await request.text();
    }

    try {
      const supabaseRes = await fetch(targetUrl, init);
      const body = await supabaseRes.text();
      return new Response(body, {
        status: supabaseRes.status,
        headers: {
          'Content-Type': supabaseRes.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    } catch (e) {
      console.error('Erreur interne worker:', e.message);
      return jsonResponse({ error: 'Erreur interne' }, 500);
    }
  },
};

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
