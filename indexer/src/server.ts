import http from 'node:http';
import type { Ingestor, IngestStatus } from './ingest.js';
import { applyQuery, parseQuery } from './query.js';
import type { IndexerStore, Row } from './store.js';

export interface ServerOptions {
  store: IndexerStore;
  port: number;
  host?: string;
  apiKey?: string;
  ingestor?: Ingestor;
}

const JSON_TABLES = new Set([
  'agents',
  'feedbacks',
  'agent_reputation',
  'metadata',
  'feedback_responses',
  'revocations',
  'collection_stats',
  'collection_asset_count',
  'collection_assets',
  'collection_pointers',
  'collections',
  'global_stats',
  'leaderboard',
]);

function send(res: http.ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const json = JSON.stringify(body, (_key, value) => (typeof value === 'bigint' ? value.toString() : value));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, Prefer, Range',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Type',
    ...extraHeaders,
  });
  res.end(json);
}

function notFound(res: http.ServerResponse, message = 'Not found'): void {
  send(res, 404, { error: message });
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function queryTable(store: IndexerStore, table: string, url: URL, prefer?: string | null): Promise<{
  rows: Row[];
  total: number;
  query: ReturnType<typeof parseQuery>;
}> {
  const parsed = parseQuery(url.searchParams, prefer);
  const all = await store.all(table);
  const applied = applyQuery(all, parsed);
  return { ...applied, query: parsed };
}

export function createServer(options: ServerOptions): http.Server {
  const { store, apiKey, ingestor } = options;

  return http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        notFound(res);
        return;
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, Prefer, Range',
        });
        res.end();
        return;
      }

      const url = new URL(req.url, 'http://localhost');
      let pathname = url.pathname;

      if (pathname === '/health' || pathname === '/ready') {
        const counts = await store.counts();
        const status: IngestStatus | undefined = ingestor?.status;
        send(res, 200, {
          status: 'ok',
          database: 'healthy',
          store: store.kind,
          counts,
          ingest: status ?? null,
        });
        return;
      }

      if (apiKey) {
        const provided = req.headers.apikey ?? (String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
        if (provided !== apiKey) {
          send(res, 401, { error: 'Unauthorized' });
          return;
        }
      }

      if (pathname.startsWith('/rest/v1')) {
        pathname = pathname.slice('/rest/v1'.length) || '/';
      }

      if (req.method === 'POST' && pathname === '/rpc/get_leaderboard') {
        const body = JSON.parse((await readBody(req)) || '{}') as {
          p_collection?: string | null;
          p_min_tier?: number;
          p_limit?: number;
          p_cursor_sort_key?: string | null;
        };
        let rows = (await store.all('leaderboard')) as Row[];
        if (body.p_collection) rows = rows.filter((row) => row.collection === body.p_collection || row.collection_pointer === body.p_collection);
        if (body.p_min_tier) rows = rows.filter((row) => Number(row.trust_tier ?? 0) >= Number(body.p_min_tier));
        if (body.p_cursor_sort_key) {
          rows = rows.filter((row) => String(row.sort_key ?? '') < String(body.p_cursor_sort_key));
        }
        rows = rows.slice(0, body.p_limit ?? 50);
        send(res, 200, rows);
        return;
      }

      if (req.method === 'GET' && pathname === '/rpc/get_collection_agents') {
        const collection = url.searchParams.get('collection') ?? url.searchParams.get('p_collection');
        let rows = (await store.all('agents')) as Row[];
        if (collection) {
          const value = collection.startsWith('eq.') ? collection.slice(3) : collection;
          rows = rows.filter((row) => row.collection === value || row.collection_pointer === value);
        }
        send(res, 200, rows);
        return;
      }

      if (pathname.startsWith('/events/') && pathname.endsWith('/replay-data')) {
        send(res, 200, { events: [], note: 'Replay event history is a follow-up; accounts are backfilled from chain state.' });
        return;
      }
      if (pathname.startsWith('/checkpoints/') || pathname.startsWith('/verify/replay/')) {
        send(res, 200, { checkpoints: [], verified: false, note: 'Hash-chain replay verification is a follow-up.' });
        return;
      }

      const table = pathname.replace(/^\//, '').split('/')[0];
      if (req.method === 'GET' && JSON_TABLES.has(table)) {
        const prefer = Array.isArray(req.headers.prefer) ? req.headers.prefer.join(',') : req.headers.prefer;
        const { rows, total, query } = await queryTable(store, table, url, prefer);
        const start = query.offset ?? 0;
        const end = rows.length === 0 ? start : start + rows.length - 1;
        const headers: Record<string, string> = {
          'Content-Range': `${start}-${end}/${total}`,
        };
        if (table === 'collection_asset_count') {
          send(res, 200, rows[0] ?? { asset_count: 0 }, headers);
          return;
        }
        send(res, 200, rows, headers);
        return;
      }

      notFound(res, `No route for ${req.method} ${url.pathname}`);
    } catch (error) {
      send(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

export async function listen(options: ServerOptions): Promise<http.Server> {
  const server = createServer(options);
  await new Promise<void>((resolve) => server.listen(options.port, options.host ?? '0.0.0.0', resolve));
  return server;
}
