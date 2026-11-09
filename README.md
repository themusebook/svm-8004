# @musebook/svm-8004

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-themusebook%2Fsvm--8004-blue)](https://github.com/themusebook/svm-8004)

TypeScript SDK for **8004** agent identity, reputation, and ProofPass on
Solana. Built for [Musebook Agent Kit](https://github.com/themusebook/agent-kit)
and usable as a [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit)
plugin.

This is one of the more complete TypeScript clients for the 8004-on-Solana
protocol: agent registration as Metaplex Core assets, SEAL v1 feedback,
ATOM reputation reads, and ProofPass.

> Autonomous agents: see [`skill.md`](./skill.md) for a compact SDK
> reference. New here? Start with the [Quickstart](./docs/QUICKSTART.md).

## Attribution

svm-8004 is a Musebook rewrite of the MIT-licensed
[8004-solana](https://github.com/themusebook/svm-8004) SDK (v0.8.5)
by QuantuLabs. The original copyright notice is preserved in
[LICENSE](./LICENSE) and [NOTICE](./NOTICE). On-chain program IDs stay
aligned with the deployed 8004 programs; see [docs/PROGRAMS.md](./docs/PROGRAMS.md).

## Installation

```bash
npm install @musebook/svm-8004
```

For the Solana Agent Kit plugin you also want:

```bash
npm install solana-agent-kit
```

Optional Musebook Agent Kit packages this SDK integrates with:

- [`@musebook/identity`](https://www.npmjs.com/package/@musebook/identity) — EIP-8004 registration documents and Asset Signer PDAs
- [`@musebook/discovery`](https://www.npmjs.com/package/@musebook/discovery) — musebook.trade directory search
- [`@musebook/wallet`](https://www.npmjs.com/package/@musebook/wallet) — signer interfaces
- [`@musebook/agent-kit`](https://www.npmjs.com/package/@musebook/agent-kit) — batteries-included client facade

## Network defaults

- **`devnet` is the implicit default.** RPC and program IDs resolve to the
  deployed 8004 devnet programs unless you say otherwise.
- `mainnet-beta`: pass `cluster: 'mainnet-beta'` explicitly. This package
  does not send transactions for you in the docs or examples.
- `localnet`: supported; set locally deployed `programIds`.
- 8004 indexers are opt-in. See [Indexer](#indexer) and
  [docs/PROGRAMS.md](./docs/PROGRAMS.md).

## Transaction version 1 reads

The SDK-created connection can read legacy, version 0, and version 1
transactions. Raw connection callers must opt into version 1 on each
applicable RPC call:

```typescript
const connection = sdk.getSolanaClient().getConnection();

const transaction = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 1,
});
```

This read compatibility does not add version 1 transaction building or
signing support.

## Quick start

```typescript
import {
  Svm8004,
  IPFSClient,
  buildRegistrationFileJson,
  ServiceType,
  Tag,
} from '@musebook/svm-8004';
import { Keypair } from '@solana/web3.js';

const signer = Keypair.fromSecretKey(/* your key */);
const pinataJwt = 'your-pinata-jwt';
const ipfs = pinataJwt
  ? new IPFSClient({ pinataEnabled: true, pinataJwt })
  : new IPFSClient({ url: 'http://localhost:5001' });

// Devnet is the default. Pass cluster: 'mainnet-beta' only when you mean it.
const sdk = new Svm8004({ cluster: 'devnet', signer, ipfsClient: ipfs });

const collectionInput = {
  name: 'Example Agents',
  symbol: 'EXAG',
  description: 'A collection of example agents',
  image: 'ipfs://QmCollectionImage...',
};
const collection = await sdk.createCollection(collectionInput);

const agentMeta = buildRegistrationFileJson({
  name: 'My AI Agent',
  description: 'Autonomous agent for task automation',
  image: 'ipfs://QmAgentAvatar...',
  services: [
    { type: ServiceType.MCP, value: 'https://api.example.com/mcp' },
    { type: ServiceType.A2A, value: 'https://api.example.com/a2a' },
  ],
  skills: ['natural_language_processing/natural_language_generation/text_completion'],
  domains: ['technology/software_engineering/software_engineering'],
});

const metadataUri = `ipfs://${await ipfs.addJson(agentMeta)}`;
const agent = await sdk.registerAgent(metadataUri, { collectionPointer: collection.pointer! });
console.log('Agent:', agent.asset.toBase58());

const opWallet = Keypair.generate();
await sdk.setAgentWallet(agent.asset, opWallet);

await sdk.giveFeedback(agent.asset, {
  value: '99.77',
  tag1: Tag.uptime,
  tag2: Tag.day,
  feedbackUri: 'ipfs://QmFeedback...',
});

const summary = await sdk.getSummary(agent.asset);
console.log(`Score: ${summary.averageScore}, Feedbacks: ${summary.totalFeedbacks}`);
```

`SolanaSDK` is still exported as an alias of `Svm8004`.

## Solana Agent Kit plugin

```typescript
import { SolanaAgentKit } from 'solana-agent-kit';
import { createSvm8004Plugin } from '@musebook/svm-8004/plugin';

const agent = new SolanaAgentKit(wallet, rpcUrl, config).use(
  createSvm8004Plugin({ cluster: 'devnet', signer }),
);

const reputation = await agent.methods.getReputation({ asset: agentAsset });
```

Actions registered with the kit:

- `SVM8004_GET_AGENT` / `SVM8004_GET_REPUTATION` — reads
- `SVM8004_REGISTER_AGENT` / `SVM8004_GIVE_FEEDBACK` / `SVM8004_SET_AGENT_WALLET` — writes, need a `Keypair` `signer` in plugin options

## Musebook Agent Kit helpers

```typescript
import {
  buildRegistrationFileJson,
  toMusebookRegistrationDocument,
  musebookDiscoveryConfig,
} from '@musebook/svm-8004';

const file = {
  name: 'My AI Agent',
  description: 'Autonomous agent for task automation',
  image: 'ipfs://QmAgentAvatar...',
  services: [],
};

const document = toMusebookRegistrationDocument(file);
// Pass `document` into @musebook/identity helpers, or pin it and register
// the URI with Svm8004.

const directory = musebookDiscoveryConfig();
// directory.hub === 'https://musebook.trade'
// Use @musebook/discovery.searchDirectory(directory, query)
```

## Indexer

No remote indexer is configured by default. For localnet, the SDK looks at
`http://127.0.0.1:3005`. To use the public QuantuLabs 8004 indexers
(protocol-compatible, not Musebook infrastructure):

```typescript
const sdk = new Svm8004({
  cluster: 'devnet',
  indexerPreset: 'quantulabs-public',
});
```

Or set `INDEXER_GRAPHQL_URL` / `INDEXER_URL`, or
`INDEXER_PRESET=quantulabs-public`.

A Musebook 8004 indexer is not available yet. `registry.musebook.trade`
is a directory UI, not this API.

## Documentation

- [Quickstart](./docs/QUICKSTART.md)
- [Methods](./docs/METHODS.md)
- [Feedback / SEAL v1](./docs/FEEDBACK.md)
- [Collections](./docs/COLLECTION.md)
- [ATOM](./docs/ATOM.md)
- [ProofPass](./docs/PROOFPASS.md)
- [OASF taxonomies](./docs/OASF.md)
- [Program IDs and indexer](./docs/PROGRAMS.md)
- [Costs](./docs/COSTS.md)

## License

MIT. Copyright (c) 2026 Musebook and (c) 2025-2026 QuantuLabs.
See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
