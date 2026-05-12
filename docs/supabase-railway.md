# Supabase + Railway

Signd can persist scanner records to Supabase when these Railway variables are set:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` also works for legacy projects. Keep either key server-side only; do not expose it in frontend code.

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
