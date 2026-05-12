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

  async function request(path, options = {}) {
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
      throw new Error(`${res.status} ${res.statusText}${body ? `: ${body.slice(0, 300)}` : ''}`);
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
      logger.warn(`[supabase] save ${scope} failed; local JSON is still updated: ${error.message}`);
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
      return { ...status, ok: false, error: error.message };
    }
  }

  return { enabled, table, status, loadRecords, saveRecords, health };
}
