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
GMGN_KLINE_DELAY_MS=1500
GMGN_RATE_LIMIT_BUFFER_MS=15000
MIN_CALL_MARKET_CAP=5000
CALL_MIN_PROBABILITY=0
CALL_MONITOR_MAX_PER_CYCLE=4
TELEGRAM_ENABLED=false
```

`GLOBAL_MIN_FEE_SOL` is now the shared fee floor used by both `scanner.js` and `call-scanner.js`. The strict flags only matter when GMGN does not return a fee field for a token; leaving them `false` keeps the scanner from dropping otherwise valid candidates just because fee metadata is missing.

The GMGN variables slow down kline polling and add a cooldown buffer after 429 responses. Keep these conservative on Railway because multiple services can share the same outbound IP quota.

`MIN_CALL_MARKET_CAP` blocks calls below the entry market-cap floor. `CALL_MIN_PROBABILITY` enables the learned probability gate when set above `0`; leave it at `0` while collecting candidate data, then run `npm run backtest` locally to choose a threshold.

Telegram is optional. Leave `TELEGRAM_ENABLED=false` when the UI is the primary workflow; set it to `true` only if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured and you still want chat alerts.

## Setup

1. Open the Supabase SQL editor.
2. Run `docs/supabase-schema.sql`.
3. Add the variables above to the Railway service that runs `node scanner.js`.
4. Redeploy Railway.

The app still writes `data/*.json` as a local fallback. On Railway that filesystem is ephemeral, so Supabase is the durable source once the variables are present.

## Notes

- The `signd_records` table stores six scopes: `signals`, `wins`, `misses`, `calls`, `candidates`, and `active_watch`.
- Row Level Security is enabled with no public policies. Backend writes use a secret/service-role key.
- If Supabase is unavailable at boot, Signd falls back to local JSON and logs a warning.
- Check `/api/health` on the deployed app to confirm whether Supabase env vars are present and REST access works.
- An empty table can be normal if no scanner call/win/miss has been created yet; the logs should still show `[supabase] enabled`.
