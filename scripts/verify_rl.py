# scripts\verify_rl.py

#  Script de diagnostic one-shot pour vérifier que le rate limiting était bien appliqué dans les 6 edges
#  après le fix du bug rateLimited → isRateLimited.
#  Il scanne chaque supabase/functions/*/index.ts 
# et confirme la présence du pattern await isRateLimited(req, rateLimitKey(...)). 
# Plus nécessaire, peut être supprimé.


import pathlib, re
for d in ['sync-printful','create-printful-order','printful-webhook','stripe-checkout','stripe-webhook','health']:
    t = pathlib.Path(f'supabase/functions/{d}/index.ts').read_text(encoding='utf-8')
    pat = r'await isRateLimited\(req,\s*rateLimitKey\(req,\s*[\'"]'
    ok = bool(re.search(pat, t))
    print(f'{d}: rateLimit applied={ok}')
