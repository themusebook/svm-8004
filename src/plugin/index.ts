/**
 * Solana Agent Kit plugin for svm-8004.
 *
 * Usage:
 *   import { SolanaAgentKit, KeypairWallet } from 'solana-agent-kit';
 *   import { createSvm8004Plugin } from '@musebook/svm-8004/plugin';
 *
 *   const agent = new SolanaAgentKit(wallet, rpcUrl, config);
 *   const withRegistry = agent.use(createSvm8004Plugin({ cluster: 'devnet' }));
 *   const summary = await withRegistry.methods.getReputation({ asset: assetId });
 *
 * Write actions (registerAgent, giveFeedback, setAgentWallet) need a Keypair
 * signer in plugin options. Solana Agent Kit wallets are signers, not
 * exportable Keypairs, so pass `signer` explicitly for writes. Reads work
 * with the agent's RPC connection alone.
 *
 * Defaults to devnet. Nothing here sends a transaction until a write
 * action is invoked with a signer.
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import type { Action, Plugin, SolanaAgentKit } from 'solana-agent-kit';
import { Svm8004 } from '../core/sdk-solana.js';
import type { Cluster } from '../core/client.js';
import { DEFAULT_CLUSTER, type IndexerPreset } from '../core/defaults.js';
import { Tag } from '../utils/tags.js';

export interface Svm8004PluginOptions {
  cluster?: Cluster;
  indexerPreset?: IndexerPreset;
  indexerGraphqlUrl?: string;
  indexerUrl?: string;
  /** Required for write actions. */
  signer?: Keypair;
}

export interface Svm8004PluginMethods {
  getSdk: () => Svm8004;
  getAgent: (input: { asset: string }) => Promise<Record<string, unknown>>;
  getReputation: (input: { asset: string; minScore?: number }) => Promise<Record<string, unknown>>;
  registerAgent: (input: { metadataUri?: string; collectionPointer?: string }) => Promise<Record<string, unknown>>;
  giveFeedback: (input: {
    asset: string;
    value: string;
    tag1?: string;
    tag2?: string;
    feedbackUri?: string;
  }) => Promise<Record<string, unknown>>;
  setAgentWallet: (input: { asset: string }) => Promise<Record<string, unknown>>;
}

function inferCluster(rpcUrl: string | undefined): Cluster {
  if (!rpcUrl) return DEFAULT_CLUSTER;
  const url = rpcUrl.toLowerCase();
  if (url.includes('devnet')) return 'devnet';
  if (url.includes('testnet')) return 'testnet';
  if (url.includes('127.0.0.1') || url.includes('localhost')) return 'localnet';
  if (url.includes('mainnet')) return 'mainnet-beta';
  return DEFAULT_CLUSTER;
}

function jsonSafe(value: unknown): unknown {
  if (value instanceof PublicKey) return value.toBase58();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = jsonSafe(entry);
    }
    return out;
  }
  return value;
}

export function createSdkFromAgent(
  agent: Pick<SolanaAgentKit, 'connection'>,
  options: Svm8004PluginOptions = {},
): Svm8004 {
  return new Svm8004({
    rpcUrl: agent.connection.rpcEndpoint,
    cluster: options.cluster ?? inferCluster(agent.connection.rpcEndpoint),
    signer: options.signer,
    indexerPreset: options.indexerPreset,
    indexerGraphqlUrl: options.indexerGraphqlUrl,
    indexerUrl: options.indexerUrl,
  });
}

function requireSigner(sdk: Svm8004, action: string): void {
  if (!sdk.canWrite) {
    throw new Error(
      `${action} needs a Keypair signer. Pass one to createSvm8004Plugin({ signer }). ` +
        'Solana Agent Kit wallets cannot be converted into a Keypair.',
    );
  }
}

function buildMethods(sdk: Svm8004, signer?: Keypair): Svm8004PluginMethods {
  return {
    getSdk: () => sdk,
    getAgent: async ({ asset }) => {
      const account = await sdk.getAgent(new PublicKey(asset));
      return {
        status: 'success',
        asset,
        agent: account ? jsonSafe(account) : null,
      };
    },
    getReputation: async ({ asset, minScore }) => {
      const summary = await sdk.getSummary(new PublicKey(asset), minScore);
      return {
        status: 'success',
        asset,
        summary: jsonSafe(summary),
      };
    },
    registerAgent: async ({ metadataUri, collectionPointer }) => {
      requireSigner(sdk, 'registerAgent');
      const result = await sdk.registerAgent(metadataUri, collectionPointer ? { collectionPointer } : undefined);
      return { status: 'success', result: jsonSafe(result) };
    },
    giveFeedback: async ({ asset, value, tag1, tag2, feedbackUri }) => {
      requireSigner(sdk, 'giveFeedback');
      const result = await sdk.giveFeedback(new PublicKey(asset), {
        value,
        tag1: tag1 ?? Tag.starred,
        tag2,
        feedbackUri,
      });
      return { status: 'success', result: jsonSafe(result) };
    },
    setAgentWallet: async ({ asset }) => {
      requireSigner(sdk, 'setAgentWallet');
      if (!signer) {
        throw new Error('setAgentWallet needs the plugin signer Keypair used to construct the SDK.');
      }
      const result = await sdk.setAgentWallet(new PublicKey(asset), signer);
      return { status: 'success', result: jsonSafe(result) };
    },
  };
}

function buildActions(getMethods: () => Svm8004PluginMethods): Action[] {
  const handle = (name: keyof Svm8004PluginMethods) => {
    return async (_agent: SolanaAgentKit, input: Record<string, unknown>) => {
      const fn = getMethods()[name] as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
      return fn(input);
    };
  };

  return [
    {
      name: 'SVM8004_GET_AGENT',
      similes: ['look up 8004 agent', 'get svm-8004 agent', 'fetch agent identity'],
      description: 'Read a registered svm-8004 agent account by its Metaplex Core asset address (devnet by default).',
      examples: [
        [
          {
            input: { asset: 'So11111111111111111111111111111111111111112' },
            output: { status: 'success', asset: 'So11111111111111111111111111111111111111112', agent: null },
            explanation: 'Returns the on-chain agent account, or null if it is not registered.',
          },
        ],
      ],
      schema: z.object({ asset: z.string().min(32) }),
      handler: handle('getAgent'),
    },
    {
      name: 'SVM8004_GET_REPUTATION',
      similes: ['get agent reputation', '8004 feedback summary', 'agent score'],
      description: 'Read the svm-8004 reputation summary for an agent asset.',
      examples: [
        [
          {
            input: { asset: 'So11111111111111111111111111111111111111112' },
            output: { status: 'success', summary: { averageScore: 0, totalFeedbacks: 0 } },
            explanation: 'Returns aggregated feedback counts and average score.',
          },
        ],
      ],
      schema: z.object({
        asset: z.string().min(32),
        minScore: z.number().optional(),
      }),
      handler: handle('getReputation'),
    },
    {
      name: 'SVM8004_REGISTER_AGENT',
      similes: ['register 8004 agent', 'mint agent nft', 'create svm-8004 identity'],
      description:
        'Register an agent as a Metaplex Core asset on the 8004 registry. Requires a Keypair signer in plugin options. Defaults to devnet.',
      examples: [
        [
          {
            input: { metadataUri: 'ipfs://QmExampleMetadata' },
            output: { status: 'success', result: { asset: '...' } },
            explanation: 'Uploads are off-chain; this submits the on-chain registration transaction.',
          },
        ],
      ],
      schema: z.object({
        metadataUri: z.string().optional(),
        collectionPointer: z.string().optional(),
      }),
      handler: handle('registerAgent'),
    },
    {
      name: 'SVM8004_GIVE_FEEDBACK',
      similes: ['leave agent feedback', 'rate 8004 agent', 'submit reputation'],
      description: 'Submit reputation feedback for an svm-8004 agent. Requires a Keypair signer in plugin options.',
      examples: [
        [
          {
            input: { asset: 'So11111111111111111111111111111111111111112', value: '99.00' },
            output: { status: 'success' },
            explanation: 'Decimal strings are encoded with the 8004 value/decimals rules.',
          },
        ],
      ],
      schema: z.object({
        asset: z.string().min(32),
        value: z.string(),
        tag1: z.string().optional(),
        tag2: z.string().optional(),
        feedbackUri: z.string().optional(),
      }),
      handler: handle('giveFeedback'),
    },
    {
      name: 'SVM8004_SET_AGENT_WALLET',
      similes: ['set operational wallet', 'bind agent wallet'],
      description: 'Bind an operational wallet to a registered agent. Uses the plugin Keypair as that wallet.',
      examples: [
        [
          {
            input: { asset: 'So11111111111111111111111111111111111111112' },
            output: { status: 'success' },
            explanation: 'The plugin signer becomes the agent operational wallet.',
          },
        ],
      ],
      schema: z.object({ asset: z.string().min(32) }),
      handler: handle('setAgentWallet'),
    },
  ];
}

/**
 * Create a Solana Agent Kit plugin that exposes svm-8004 register, feedback,
 * and reputation actions.
 */
export function createSvm8004Plugin(options: Svm8004PluginOptions = {}): Plugin {
  let methods: Svm8004PluginMethods | undefined;
  let actions: Action[] = [];

  const plugin: Plugin = {
    name: 'svm-8004',
    methods: {},
    actions: [],
    initialize(agent: SolanaAgentKit) {
      const sdk = createSdkFromAgent(agent, options);
      methods = buildMethods(sdk, options.signer);
      actions = buildActions(() => {
        if (!methods) throw new Error('svm-8004 plugin is not initialized');
        return methods;
      });
      plugin.methods = methods;
      plugin.actions = actions;
    },
  };

  return plugin;
}

/** Default plugin instance (devnet, no signer — reads only until you call createSvm8004Plugin). */
export const Svm8004Plugin = createSvm8004Plugin();

export default Svm8004Plugin;
