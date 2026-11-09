import { describe, expect, it, jest } from '@jest/globals';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createSvm8004Plugin, createSdkFromAgent } from '../../src/plugin/index.js';
import { Svm8004 } from '../../src/core/sdk-solana.js';
import { fromKeypair } from '../../src/core/signer.js';

function fakeAgent(rpcUrl = 'https://api.devnet.solana.com', wallet?: unknown) {
  return {
    connection: new Connection(rpcUrl, 'confirmed'),
    wallet,
  } as unknown as import('solana-agent-kit').SolanaAgentKit;
}

function mockAgentWallet(keypair = Keypair.generate()) {
  return {
    keypair,
    wallet: {
      publicKey: keypair.publicKey,
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(keypair);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) => {
        for (const tx of txs) tx.partialSign(keypair);
        return txs;
      },
      signMessage: async (message: Uint8Array) => {
        const nacl = await import('tweetnacl');
        return nacl.default.sign.detached(message, keypair.secretKey);
      },
    },
  };
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

  it('rejects write actions when no signer and no agent.wallet were provided', async () => {
    const plugin = createSvm8004Plugin({ cluster: 'devnet' });
    plugin.initialize(fakeAgent());
    await expect(plugin.methods.registerAgent({ metadataUri: 'ipfs://QmTest' })).rejects.toThrow(
      /needs a signer/,
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

  it('uses agent.wallet so writes work without a raw Keypair option', () => {
    const { wallet, keypair } = mockAgentWallet();
    const plugin = createSvm8004Plugin({ cluster: 'devnet' });
    plugin.initialize(fakeAgent('https://api.devnet.solana.com', wallet));
    const sdk = plugin.methods.getSdk();
    expect(sdk.canWrite).toBe(true);
    expect(sdk.isReadOnly).toBe(false);
    expect(sdk.getSigner()?.publicKey.equals(keypair.publicKey)).toBe(true);
    expect(sdk.getSigner()?.keypair).toBeUndefined();
  });

  it('register and feedback plugin methods call the SDK when a mock agent wallet is present', async () => {
    const { wallet } = mockAgentWallet();
    const plugin = createSvm8004Plugin({ cluster: 'devnet' });
    plugin.initialize(fakeAgent('https://api.devnet.solana.com', wallet));
    const sdk = plugin.methods.getSdk();

    const register = jest.spyOn(sdk, 'registerAgent').mockResolvedValue({
      success: true,
      signature: 'sig-register',
      asset: Keypair.generate().publicKey,
    } as never);
    const feedback = jest.spyOn(sdk, 'giveFeedback').mockResolvedValue({
      success: true,
      signature: 'sig-feedback',
    } as never);
    const setWallet = jest.spyOn(sdk, 'setAgentWallet').mockResolvedValue({
      success: true,
      signature: 'sig-wallet',
    } as never);

    const asset = Keypair.generate().publicKey.toBase58();
    await expect(plugin.methods.registerAgent({ metadataUri: 'ipfs://QmTest' })).resolves.toEqual({
      status: 'success',
      result: expect.objectContaining({ signature: 'sig-register' }),
    });
    await expect(
      plugin.methods.giveFeedback({ asset, value: '100' }),
    ).resolves.toEqual({
      status: 'success',
      result: expect.objectContaining({ signature: 'sig-feedback' }),
    });
    await expect(plugin.methods.setAgentWallet({ asset })).resolves.toEqual({
      status: 'success',
      result: expect.objectContaining({ signature: 'sig-wallet' }),
    });

    expect(register).toHaveBeenCalledTimes(1);
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(setWallet).toHaveBeenCalledTimes(1);
    expect(setWallet.mock.calls[0][1]).toBe(sdk.getSigner());
  });

  it('explicit Keypair options.signer still wins over agent.wallet', () => {
    const { wallet } = mockAgentWallet();
    const override = Keypair.generate();
    const plugin = createSvm8004Plugin({ cluster: 'devnet', signer: override });
    plugin.initialize(fakeAgent('https://api.devnet.solana.com', wallet));
    expect(plugin.methods.getSdk().getSigner()?.publicKey.equals(override.publicKey)).toBe(true);
    expect(plugin.methods.getSdk().getSigner()?.keypair).toBe(override);
  });

  it('createSdkFromAgent wraps agent.wallet', () => {
    const { wallet, keypair } = mockAgentWallet();
    const sdk = createSdkFromAgent(fakeAgent('https://api.devnet.solana.com', wallet));
    expect(sdk.canWrite).toBe(true);
    expect(sdk.getSigner()?.publicKey.equals(keypair.publicKey)).toBe(true);
    expect(fromKeypair(keypair).publicKey.equals(keypair.publicKey)).toBe(true);
  });
});
