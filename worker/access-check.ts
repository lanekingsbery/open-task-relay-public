import { ownerRequest, type OwnerEnv } from './owner-access';

// Temporary migration diagnostic. No database, assets, or service bindings.
export default {
  async fetch(request: Request, env: OwnerEnv): Promise<Response> {
    const headers = {'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'text/plain; charset=utf-8'};
    if (new URL(request.url).hostname !== 'access-check.opentaskrelay.org') return new Response('Not found', {status:404,headers});
    if (request.method !== 'GET') return new Response('Method not allowed', {status:405,headers});
    const probe = new Request('https://access-check.opentaskrelay.org/moderation', {headers:request.headers});
    const verified = await ownerRequest(probe, {...env,RELAY_SELF_HOSTED:'true'});
    if (verified instanceof Response) {
      const checks: Record<string, boolean> = {
        issuer_configured: !!env.CF_ACCESS_TEAM_DOMAIN,
        audience_configured: !!env.CF_ACCESS_AUD,
        owner_configured: !!env.MODERATOR_EMAIL,
        token_present: !!request.headers.get('cf-access-jwt-assertion'),
      };
      // Diagnostic booleans only: decoded claims are untrusted and never grant access.
      try {
        const parts = request.headers.get('cf-access-jwt-assertion')!.split('.');
        const decode = (s: string) => JSON.parse(atob(s.replaceAll('-', '+').replaceAll('_', '/')));
        const h = decode(parts[0]), c = decode(parts[1]), now = Date.now()/1000;
        Object.assign(checks, {
          algorithm_ok: h.alg === 'RS256', key_id_present: typeof h.kid === 'string',
          type_ok: c.type === 'app', issuer_ok: c.iss === env.CF_ACCESS_TEAM_DOMAIN,
          audience_ok: Array.isArray(c.aud) && c.aud.includes(env.CF_ACCESS_AUD),
          owner_ok: typeof c.email === 'string' && c.email.toLowerCase() === env.MODERATOR_EMAIL?.toLowerCase(),
          expiry_ok: Number.isFinite(c.exp) && c.exp > now,
          issued_at_ok: Number.isFinite(c.iat) && c.iat <= now+30,
          not_before_ok: c.nbf === undefined || (Number.isFinite(c.nbf) && c.nbf <= now+30),
        });
        let stage = 'key_fetch';
        try {
          const r = await fetch(env.CF_ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs', {redirect:'manual',signal:AbortSignal.timeout(5000)});
          checks.key_endpoint_ok = r.ok;
          stage = 'key_parse';
          const data = await r.json() as {keys: (JsonWebKey & {kid?:string})[]};
          checks.key_list_ok = Array.isArray(data.keys) && data.keys.length <= 32;
          const jwk = data.keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
          checks.matching_key_found = !!jwk;
          if (jwk) {
            stage = 'key_import';
            const key = await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
            checks.key_import_ok = true;
            stage = 'signature_verify';
            const signature = Uint8Array.from(atob(parts[2].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
            checks.signature_ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,new TextEncoder().encode(parts[0]+'.'+parts[1]));
          }
        } catch { checks[stage+'_failed'] = true; }
      } catch { checks.token_decodable = false; }
      return new Response('Owner login has not been verified.\nDiagnostic checks (no token contents):\n'+JSON.stringify(checks,null,2), {status:403,headers});
    }
    return new Response('Owner login verified. You can return to the migration conversation.', {headers});
  },
};
