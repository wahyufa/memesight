const DEFAULT_TABLE = 'signd_records';

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

function recordId(record) {
  return String(record.id || record.address || `${record.ts || Date.now()}`);
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function createRecordStore({ table = DEFAULT_TABLE, logger = console } = {}) {
  const { url, key } = supabaseConfig();
  const enabled = Boolean(url && key && globalThis.fetch);

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
      logger.log(`[supabase] loaded ${rows?.length || 0} ${scope} record(s)`);
      return (rows || []).map(row => row.record).filter(Boolean);
    } catch (error) {
      logger.warn(`[supabase] load ${scope} failed; using local JSON fallback: ${error.message}`);
      return fallbackRecords;
    }
  }

  async function saveRecords(scope, records = []) {
    if (!enabled) return false;

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

  return { enabled, table, loadRecords, saveRecords };
}
