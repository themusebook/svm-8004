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
3. `indexerPreset: 'musebook'` / `INDEXER_PRESET=musebook`, or
   `indexerPreset: 'quantulabs-public'` / `INDEXER_PRESET=quantulabs-public`
4. localnet defaults to `http://127.0.0.1:3005`
5. otherwise the SDK runs without an indexer and falls back on-chain

### Musebook 8004 indexer

This repo now includes `@musebook/svm-8004-indexer` (the `indexer/`
package). Use `indexerPreset: 'musebook'`. The planned public URL is
`https://indexer.musebook.trade` — **that host is not live yet**. Point a
running instance with `MUSEBOOK_INDEXER_URL` or `INDEXER_URL`
(for example `http://127.0.0.1:3005/rest/v1`).

The indexer speaks the REST v1 shape used by `IndexerClient`. GraphQL v2
is a follow-up.

[registry.musebook.trade](https://registry.musebook.trade) remains a
**directory UI**, not the 8004 indexer. Directory search belongs to
[`@musebook/discovery`](https://www.npmjs.com/package/@musebook/discovery)
against `https://musebook.trade`.
