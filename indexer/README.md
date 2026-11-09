# @musebook/svm-8004-indexer

Musebook 8004 indexer. It backfills and polls the deployed Agent Registry
and ATOM programs (devnet by default) and serves the PostgREST-shaped
REST v1 API that `@musebook/svm-8004`'s `IndexerClient` already speaks.

The planned public URL is `https://indexer.musebook.trade` (`indexerPreset: 'musebook'`
in the SDK). That host is **not live yet**. Run this package yourself and
point the SDK at it with `indexerUrl` or `MUSEBOOK_INDEXER_URL`.

GraphQL v2 (`/v2/graphql`) is a follow-up. The SDK prefers GraphQL when a
URL is configured, but every current `IndexerClient` read works over REST.

This process is **read-only**. It never sends a transaction.

## Endpoints

Base URL for the SDK: `http://127.0.0.1:3005/rest/v1`

| Path | Notes |
| --- | --- |
| `GET /health` | Process + store health, ingest counts |
| `GET /rest/v1/agents` | PostgREST filters (`eq`, `order`, `limit`, `offset`, `or`) |
| `GET /rest/v1/feedbacks` | Including `or=(tag1.eq.x,tag2.eq.x)` |
| `GET /rest/v1/agent_reputation` | Derived from agents + feedbacks + ATOM stats |
| `GET /rest/v1/leaderboard` | Agents ordered by `sort_key` desc |
| `POST /rest/v1/rpc/get_leaderboard` | `{ p_collection, p_min_tier, p_limit, p_cursor_sort_key }` |
| `GET /rest/v1/rpc/get_collection_agents` | Collection-filtered agents |
| `GET /rest/v1/metadata` | Metadata entries (values are base64) |
| `GET /rest/v1/feedback_responses` | |
| `GET /rest/v1/revocations` | From revoked on-chain feedbacks |
| `GET /rest/v1/collections` | Canonical collection pointers |
| `GET /rest/v1/collection_pointers` | Alias of `/collections` |
| `GET /rest/v1/collection_assets` | Alias of `/agents` |
| `GET /rest/v1/collection_asset_count` | Singular `{ asset_count }` |
| `GET /rest/v1/collection_stats` | |
| `GET /rest/v1/global_stats` | |
| `Prefer: count=exact` | `Content-Range: 0-9/123` |

Replay / checkpoint routes return empty stubs for now.

## Ingest

1. `getProgramAccounts` backfill of Agent, Feedback, Metadata, and ATOM stats accounts, decoded with the SDK's own Borsh decoders.
2. Derived tag and response accounts are fetched via the SDK PDA helpers.
3. Signature polling (`getSignaturesForAddress` + `getTransaction`) keeps the store current. Websocket logs are optional via `SVM8004_WS_URL` (polling is the default).

Source of truth on devnet:

- Registry `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C`
- ATOM program from the SDK cluster program IDs (`AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF` on devnet)

## Run locally

```bash
# from the repo root
npm install
npm run build --workspace=@musebook/svm-8004-indexer

# SQLite (default), devnet, read-only
cd indexer
SVM8004_CLUSTER=devnet SVM8004_RPC_URL=https://api.devnet.solana.com npm start
```

Then in the SDK:

```ts
const sdk = new Svm8004({
  cluster: 'devnet',
  indexerUrl: 'http://127.0.0.1:3005/rest/v1',
});
const agents = await sdk.indexerClient.getAgents({ limit: 10 });
```

Or `indexerPreset: 'musebook'` once you set `MUSEBOOK_INDEXER_URL` (or when `https://indexer.musebook.trade` is live).

## Configuration

| Variable | Default |
| --- | --- |
| `SVM8004_CLUSTER` | `devnet` |
| `SVM8004_RPC_URL` / `SOLANA_RPC_URL` | `https://api.devnet.solana.com` |
| `SVM8004_WS_URL` | unset (HTTP polling only) |
| `SVM8004_REGISTRY_PROGRAM_ID` | devnet registry |
| `SVM8004_ATOM_PROGRAM_ID` | cluster ATOM id |
| `DATABASE_URL` | `sqlite:./data/indexer.db` |
| `PORT` | `3005` |
| `SVM8004_POLL_INTERVAL_MS` | `15000` |
| `INDEXER_API_KEY` | unset (open) |

`DATABASE_URL=postgres://...` selects Postgres. SQLite is the default for local use.

## Docker / Railway / Render

A `Dockerfile`, `railway.toml`, and `render.yaml` live at the repository
root. They are provided so the service can be deployed later. **This
package is not deployed from this change.**

## License

MIT. Same dual copyright as the SDK (Musebook + QuantuLabs protocol work).
