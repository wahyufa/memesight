const DEFAULT_TABLE = 'signd_records';

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

function recordId(record) {
  return String(record.id || record.address || `${record.ts || Date.now()}`);
}

function mergeRecords(remoteRecords = [], fallbackRecords = []) {
  const byId = new Map();
  for (const record of fallbackRecords) byId.set(recordId(record), record);
  for (const record of remoteRecords) byId.set(recordId(record), record);
  return [...byId.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function summarizeBody(body = '') {
  const compact = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return compact.slice(0, 180);
}

export function createRecordStore({ table = DEFAULT_TABLE, logger = console } = {}) {
  const { url, key } = supabaseConfig();
  const enabled = Boolean(url && key && globalThis.fetch);
  let urlHost = null;
  try { urlHost = url ? new URL(url).host : null; } catch {}
  const status = {
    enabled,
    table,
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
    urlHost,
  };

  logger.log(enabled
    ? `[supabase] enabled for ${status.urlHost}/${table}`
    : `[supabase] disabled; SUPABASE_URL present=${status.hasUrl}, key present=${status.hasKey}`);

  const cooldown = {
    until: 0,
    lastLogAt: 0,
    ms: Number(process.env.SUPABASE_ERROR_COOLDOWN_MS || 120_000),
  };

  function cooldownActive() {
    const remaining = cooldown.until - Date.now();
    if (remaining <= 0) return false;

    if (Date.now() - cooldown.lastLogAt > 30_000) {
      logger.warn(`[supabase] cooldown active; using local JSON for ${Math.ceil(remaining / 1000)}s`);
      cooldown.lastLogAt = Date.now();
    }
    return true;
  }

  function noteTransientFailure(error) {
    if (!error?.transient) return;
    cooldown.until = Math.max(cooldown.until, Date.now() + cooldown.ms);
  }

  async function request(path, options = {}) {
    if (cooldownActive()) {
      const err = new Error('supabase cooldown active');
      err.transient = true;
      throw err;
    }

    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`${res.status} ${res.statusText}${body ? `: ${summarizeBody(body)}` : ''}`);
      err.status = res.status;
      err.transient = res.status >= 500;
      throw err;
    }

    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadRecords(scope, fallbackRecords = []) {
    if (!enabled) return fallbackRecords;

    try {
      const rows = await request(
        `${table}?scope=eq.${encodeURIComponent(scope)}&select=record&order=ts.desc&limit=5000`
      );
      const remoteRecords = (rows || []).map(row => row.record).filter(Boolean);
      const merged = mergeRecords(remoteRecords, fallbackRecords);
      logger.log(`[supabase] loaded ${remoteRecords.length} remote ${scope} record(s), merged ${merged.length}`);
      return merged;
    } catch (error) {
      noteTransientFailure(error);
      logger.warn(`[supabase] load ${scope} failed; using local JSON fallback: ${error.message}`);
      return fallbackRecords;
    }
  }

  async function saveRecords(scope, records = []) {
    if (!enabled) return false;
    if (!records.length) return true;

    const rows = records.map(record => ({
      scope,
      id: recordId(record),
      ts: Number(record.ts || record.updatedAt || Date.now()),
      record,
      updated_at: new Date().toISOString(),
    }));

    try {
      for (const batch of chunks(rows, 500)) {
        await request(`${table}?on_conflict=scope,id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(batch),
        });
      }
      return true;
    } catch (error) {
      noteTransientFailure(error);
      logger.warn(`[supabase] save ${scope} failed; local JSON is still updated: ${error.message}`);
      return false;
    }
  }

  async function saveRecord(scope, record) {
    if (!enabled) return false;
    if (!record) return true;

    const row = {
      scope,
      id: recordId(record),
      ts: Number(record.ts || record.updatedAt || Date.now()),
      record,
      updated_at: new Date().toISOString(),
    };

    try {
      await request(`${table}?on_conflict=scope,id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([row]),
      });
      return true;
    } catch (error) {
      noteTransientFailure(error);
      logger.warn(`[supabase] save ${scope}/${row.id} failed; local JSON is still updated: ${error.message}`);
      return false;
    }
  }

  async function health(scopes = []) {
    if (!enabled) return { ...status, ok: false, reason: 'missing_supabase_env' };

    try {
      const sampleRows = {};
      for (const scope of scopes) {
        const rows = await request(
          `${table}?scope=eq.${encodeURIComponent(scope)}&select=id&limit=1`
        );
        sampleRows[scope] = rows?.length ?? 0;
      }
      return { ...status, ok: true, sampleRows };
    } catch (error) {
      noteTransientFailure(error);
      return { ...status, ok: false, error: error.message };
    }
  }

  return { enabled, table, status, loadRecords, saveRecords, saveRecord, health };
}
