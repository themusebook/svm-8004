import { PublicKey } from '@solana/web3.js';
import {
  DEFAULT_AGENT_REGISTRY_PROGRAM_ID,
  DEFAULT_ATOM_ENGINE_PROGRAM_ID,
  DEFAULT_CLUSTER,
  getProgramIdsForCluster,
  type Cluster,
} from '@musebook/svm-8004';

export interface IndexerConfig {
  cluster: Cluster;
  rpcUrl: string;
  wsUrl?: string;
  registryProgramId: PublicKey;
  atomProgramId: PublicKey;
  databaseUrl: string;
  host: string;
  port: number;
  pollIntervalMs: number;
  maxSignaturesPerPoll: number;
  apiKey?: string;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function asCluster(value: string | undefined): Cluster {
  if (value === 'devnet' || value === 'testnet' || value === 'mainnet-beta' || value === 'localnet') {
    return value;
  }
  return DEFAULT_CLUSTER;
}

function defaultRpc(cluster: Cluster): string {
  if (cluster === 'localnet') return 'http://127.0.0.1:8899';
  if (cluster === 'testnet') return 'https://api.testnet.solana.com';
  if (cluster === 'mainnet-beta') return 'https://api.mainnet-beta.solana.com';
  return 'https://api.devnet.solana.com';
}

export function loadConfig(overrides: Partial<IndexerConfig> = {}): IndexerConfig {
  const cluster = overrides.cluster ?? asCluster(env('SVM8004_CLUSTER') ?? env('SOLANA_CLUSTER'));
  const ids = getProgramIdsForCluster(cluster);
  const rpcUrl = overrides.rpcUrl ?? env('SVM8004_RPC_URL') ?? env('SOLANA_RPC_URL') ?? defaultRpc(cluster);
  const registry =
    overrides.registryProgramId ??
    (env('SVM8004_REGISTRY_PROGRAM_ID')
      ? new PublicKey(env('SVM8004_REGISTRY_PROGRAM_ID')!)
      : cluster === 'devnet'
        ? DEFAULT_AGENT_REGISTRY_PROGRAM_ID
        : ids.agentRegistry);
  const atom =
    overrides.atomProgramId ??
    (env('SVM8004_ATOM_PROGRAM_ID')
      ? new PublicKey(env('SVM8004_ATOM_PROGRAM_ID')!)
      : ids.atomEngine);

  return {
    cluster,
    rpcUrl,
    wsUrl: overrides.wsUrl ?? env('SVM8004_WS_URL') ?? env('SOLANA_WS_URL'),
    registryProgramId: registry,
    atomProgramId: atom ?? DEFAULT_ATOM_ENGINE_PROGRAM_ID,
    databaseUrl:
      overrides.databaseUrl ??
      env('DATABASE_URL') ??
      env('SVM8004_DATABASE_URL') ??
      'sqlite:./data/indexer.db',
    host: overrides.host ?? env('HOST') ?? '0.0.0.0',
    port: overrides.port ?? Number(env('PORT') ?? env('SVM8004_INDEXER_PORT') ?? 3005),
    pollIntervalMs: overrides.pollIntervalMs ?? Number(env('SVM8004_POLL_INTERVAL_MS') ?? 30_000),
    maxSignaturesPerPoll: overrides.maxSignaturesPerPoll ?? Number(env('SVM8004_MAX_SIGNATURES_PER_POLL') ?? 40),
    apiKey: overrides.apiKey ?? env('INDEXER_API_KEY') ?? env('SVM8004_INDEXER_API_KEY'),
  };
}
