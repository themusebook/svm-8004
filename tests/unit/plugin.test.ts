import { describe, expect, it } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createSvm8004Plugin, createSdkFromAgent } from '../../src/plugin/index.js';
import { Svm8004 } from '../../src/core/sdk-solana.js';

function fakeAgent(rpcUrl = 'https://api.devnet.solana.com') {
  return {
    connection: new Connection(rpcUrl, 'confirmed'),
  } as unknown as import('solana-agent-kit').SolanaAgentKit;
}

describe('Solana Agent Kit plugin', () => {
  it('creates a plugin named svm-8004 with register, feedback, and reputation actions', () => {
    const plugin = createSvm8004Plugin({ cluster: 'devnet' });
    expect(plugin.name).toBe('svm-8004');
    plugin.initialize(fakeAgent());
    const names = plugin.actions.map((action) => action.name).sort();
    expect(names).toEqual([
      'SVM8004_GET_AGENT',
      'SVM8004_GET_REPUTATION',
      'SVM8004_GIVE_FEEDBACK',
      'SVM8004_REGISTER_AGENT',
      'SVM8004_SET_AGENT_WALLET',
    ]);
    expect(plugin.methods.getSdk()).toBeInstanceOf(Svm8004);
    expect(plugin.methods.getSdk().getCluster()).toBe('devnet');
  });

  it('infers localnet from a localhost RPC', () => {
    const sdk = createSdkFromAgent(fakeAgent('http://127.0.0.1:8899'));
    expect(sdk.getCluster()).toBe('localnet');
  });

  it('rejects write actions when no Keypair signer was provided', async () => {
    const plugin = createSvm8004Plugin({ cluster: 'devnet' });
    plugin.initialize(fakeAgent());
    await expect(plugin.methods.registerAgent({ metadataUri: 'ipfs://QmTest' })).rejects.toThrow(
      /Keypair signer/,
    );
  });

  it('accepts a write-capable SDK when a signer is provided (does not send)', () => {
    const signer = Keypair.generate();
    const plugin = createSvm8004Plugin({ cluster: 'devnet', signer });
    plugin.initialize(fakeAgent());
    expect(plugin.methods.getSdk().canWrite).toBe(true);
    expect(plugin.methods.getSdk().isReadOnly).toBe(false);
  });

  it('validates action schemas without calling the network', () => {
    const plugin = createSvm8004Plugin({ cluster: 'devnet' });
    plugin.initialize(fakeAgent());
    const reputation = plugin.actions.find((action) => action.name === 'SVM8004_GET_REPUTATION');
    expect(reputation).toBeDefined();
    const parsed = reputation!.schema.safeParse({
      asset: Keypair.generate().publicKey.toBase58(),
    });
    expect(parsed.success).toBe(true);
    const bad = reputation!.schema.safeParse({ asset: 'short' });
    expect(bad.success).toBe(false);
    expect(PublicKey.isOnCurve(Keypair.generate().publicKey)).toBe(true);
  });
});
