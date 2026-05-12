# Supabase + Railway

Signd can persist scanner records to Supabase when these Railway variables are set:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` also works for legacy projects. Keep either key server-side only; do not expose it in frontend code.

Optional scanner tuning:

```text
GLOBAL_MIN_FEE_SOL=2
GLOBAL_STRONG_FEE_SOL=10
GLOBAL_FEE_NEW_CREATION_STRICT=false
GLOBAL_FEE_MIGRATED_STRICT=false
GLOBAL_FEE_NEAR_COMPLETION_STRICT=false
```

`GLOBAL_MIN_FEE_SOL` is now the shared fee floor used by both `scanner.js` and `call-scanner.js`. The strict flags only matter when GMGN does not return a fee field for a token; leaving them `false` keeps the scanner from dropping otherwise valid candidates just because fee metadata is missing.

## Setup

1. Open the Supabase SQL editor.
2. Run `docs/supabase-schema.sql`.
3. Add the variables above to the Railway service that runs `node scanner.js`.
4. Redeploy Railway.

The app still writes `data/*.json` as a local fallback. On Railway that filesystem is ephemeral, so Supabase is the durable source once the variables are present.

## Notes

- The `signd_records` table stores three scopes: `wins`, `misses`, and `calls`.
- Row Level Security is enabled with no public policies. Backend writes use a secret/service-role key.
- If Supabase is unavailable at boot, Signd falls back to local JSON and logs a warning.
- Check `/api/health` on the deployed app to confirm whether Supabase env vars are present and REST access works.
- An empty table can be normal if no scanner call/win/miss has been created yet; the logs should still show `[supabase] enabled`.
