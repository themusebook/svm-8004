# Program IDs and indexer configuration

## On-chain programs

`@musebook/svm-8004` talks to the **deployed 8004 programs** from the
upstream 8004-solana protocol (AgentRegistry8004 + ATOM Engine), plus
Metaplex Core. Musebook does not currently ship a replacement 8004
program, so these IDs are kept on purpose. Changing them would break
protocol compatibility with existing agent assets, feedback accounts,
and PDAs.

| Program | Devnet | Mainnet |
| --- | --- | --- |
| AgentRegistry8004 | `8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C` | `8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ` |
| ATOM Engine | `AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF` | `AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb` |
| Metaplex Core | `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d` | same |

The SDK's implicit cluster is **devnet**. `PROGRAM_ID` and
`ATOM_ENGINE_PROGRAM_ID` remain the mainnet addresses, as named aliases
for those deployments — they are not the implicit default used by
`new Svm8004()`.

Override program IDs only when you have deployed a compatible program
yourself (typically localnet):

```ts
import { Svm8004 } from '@musebook/svm-8004';

const sdk = new Svm8004({
  cluster: 'localnet',
  programIds: {
    agentRegistry: 'YourLocalRegistry1111111111111111111111111',
    atomEngine: 'YourLocalAtom11111111111111111111111111111',
  },
});
```

## Indexer

The 8004 indexer (REST v1 / GraphQL v2) is **opt-in**. This package does
not silently use QuantuLabs `*.qnt.sh` endpoints.

Configuration order:

1. `indexerGraphqlUrl` / `indexerUrl` on the SDK config
2. `INDEXER_GRAPHQL_URL` / `INDEXER_URL` environment variables
3. `indexerPreset: 'quantulabs-public'` or `INDEXER_PRESET=quantulabs-public`
4. localnet defaults to `http://127.0.0.1:3005`
5. otherwise the SDK runs without an indexer and falls back on-chain

### TODO: Musebook 8004 indexer

[registry.musebook.trade](https://registry.musebook.trade) is a **directory
UI**. `GET /api/health` is healthy, but `/rest/v1` and `/v2/graphql` are
not 8004 indexer APIs. Directory search belongs to
[`@musebook/discovery`](https://www.npmjs.com/package/@musebook/discovery)
against `https://musebook.trade`. When a Musebook 8004 indexer exists, a
`musebook` preset will be added here.
