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
import { Keypair } from '@solana/web3.js';
import type { Plugin, SolanaAgentKit } from 'solana-agent-kit';
import { Svm8004 } from '../core/sdk-solana.js';
import type { Cluster } from '../core/client.js';
import { type IndexerPreset } from '../core/defaults.js';
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
    getAgent: (input: {
        asset: string;
    }) => Promise<Record<string, unknown>>;
    getReputation: (input: {
        asset: string;
        minScore?: number;
    }) => Promise<Record<string, unknown>>;
    registerAgent: (input: {
        metadataUri?: string;
        collectionPointer?: string;
    }) => Promise<Record<string, unknown>>;
    giveFeedback: (input: {
        asset: string;
        value: string;
        tag1?: string;
        tag2?: string;
        feedbackUri?: string;
    }) => Promise<Record<string, unknown>>;
    setAgentWallet: (input: {
        asset: string;
    }) => Promise<Record<string, unknown>>;
}
export declare function createSdkFromAgent(agent: Pick<SolanaAgentKit, 'connection'>, options?: Svm8004PluginOptions): Svm8004;
/**
 * Create a Solana Agent Kit plugin that exposes svm-8004 register, feedback,
 * and reputation actions.
 */
export declare function createSvm8004Plugin(options?: Svm8004PluginOptions): Plugin;
/** Default plugin instance (devnet, no signer — reads only until you call createSvm8004Plugin). */
export declare const Svm8004Plugin: Plugin;
export default Svm8004Plugin;
//# sourceMappingURL=index.d.ts.map