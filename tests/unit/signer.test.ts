import { describe, expect, it, jest } from '@jest/globals';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  fromKeypair,
  fromSolanaAgentKitWallet,
  fromWalletAdapter,
  isKeypair,
  isSvm8004Signer,
  resolveSigner,
} from '../../src/core/signer.js';

const BLOCKHASH = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi';

function transferTx(payer: PublicKey, extraSigner?: PublicKey): Transaction {
  const tx = new Transaction();
  tx.recentBlockhash = BLOCKHASH;
  tx.feePayer = payer;
  tx.add(
    new TransactionInstruction({
      programId: SystemProgram.programId,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        ...(extraSigner
          ? [{ pubkey: extraSigner, isSigner: true, isWritable: false }]
          : []),
      ],
      data: Buffer.from([1, 2, 3, 4]),
    }),
  );
  return tx;
}

describe('Svm8004Signer adapters', () => {
  it('fromKeypair signs a transaction and a message', async () => {
    const keypair = Keypair.generate();
    const signer = fromKeypair(keypair);
    expect(signer.publicKey.equals(keypair.publicKey)).toBe(true);
    expect(signer.keypair).toBe(keypair);

    const tx = transferTx(keypair.publicKey);
    const signed = await signer.signTransaction(tx);
    expect(signed.verifySignatures()).toBe(true);

    const message = new TextEncoder().encode('svm-8004');
    const signature = await signer.signMessage!(message);
    expect(signature.byteLength).toBe(64);
  });

  it('fromKeypair preserves an existing extra-account partial signature', async () => {
    const payer = Keypair.generate();
    const extra = Keypair.generate();
    const signer = fromKeypair(payer);
    const tx = transferTx(payer.publicKey, extra.publicKey);
    tx.partialSign(extra);
    const extraSig = Buffer.from(tx.signatures.find((s) => s.publicKey.equals(extra.publicKey))!.signature!);

    const signed = await signer.signTransaction(tx);
    const still = signed.signatures.find((s) => s.publicKey.equals(extra.publicKey));
    expect(still?.signature).not.toBeNull();
    expect(Buffer.from(still!.signature!)).toEqual(extraSig);
    expect(signed.verifySignatures()).toBe(true);
  });

  it('fromSolanaAgentKitWallet delegates to agent.wallet and does not expose a keypair', async () => {
    const keypair = Keypair.generate();
    const signTransaction = jest.fn(async (tx: Transaction) => {
      tx.partialSign(keypair);
      return tx;
    });
    const signAllTransactions = jest.fn(async (txs: Transaction[]) => {
      return Promise.all(txs.map((tx) => signTransaction(tx)));
    });
    const signMessage = jest.fn(async (message: Uint8Array) => {
      const nacl = await import('tweetnacl');
      return nacl.default.sign.detached(message, keypair.secretKey);
    });

    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction,
      signAllTransactions,
      signMessage,
    };
    const signer = fromSolanaAgentKitWallet(wallet);
    expect(signer.keypair).toBeUndefined();
    expect(isSvm8004Signer(signer)).toBe(true);

    const tx = transferTx(keypair.publicKey);
    const signed = await signer.signTransaction(tx);
    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(signed.verifySignatures()).toBe(true);

    const all = await signer.signAllTransactions!([transferTx(keypair.publicKey)]);
    expect(signAllTransactions).toHaveBeenCalledTimes(1);
    expect(all).toHaveLength(1);

    await signer.signMessage!(new Uint8Array([7, 8, 9]));
    expect(signMessage).toHaveBeenCalledTimes(1);
  });

  it('fromWalletAdapter accepts a base58 publicKey and signs', async () => {
    const keypair = Keypair.generate();
    const signer = fromWalletAdapter({
      publicKey: keypair.publicKey.toBase58(),
      signTransaction: async (tx) => {
        (tx as Transaction).partialSign(keypair);
        return tx;
      },
    });
    expect(signer.publicKey.equals(keypair.publicKey)).toBe(true);
    const signed = await signer.signTransaction(transferTx(keypair.publicKey));
    expect(signed.verifySignatures()).toBe(true);
  });

  it('fromWalletAdapter synthesizes signAllTransactions when the wallet omits it', async () => {
    const keypair = Keypair.generate();
    let calls = 0;
    const signer = fromWalletAdapter({
      publicKey: keypair.publicKey,
      signTransaction: async (tx) => {
        calls += 1;
        (tx as Transaction).partialSign(keypair);
        return tx;
      },
    });
    const signed = await signer.signAllTransactions!([
      transferTx(keypair.publicKey),
      transferTx(keypair.publicKey),
    ]);
    expect(calls).toBe(2);
    expect(signed).toHaveLength(2);
    expect(signer.signMessage).toBeUndefined();
  });

  it('resolveSigner wraps a Keypair and passes through an existing Svm8004Signer', () => {
    const keypair = Keypair.generate();
    expect(isKeypair(keypair)).toBe(true);
    const wrapped = resolveSigner(keypair);
    expect(wrapped?.publicKey.equals(keypair.publicKey)).toBe(true);
    expect(wrapped?.keypair).toBe(keypair);

    const adapter = fromWalletAdapter({
      publicKey: keypair.publicKey,
      signTransaction: async (tx) => tx,
    });
    expect(resolveSigner(adapter)).toBe(adapter);
    expect(resolveSigner(undefined)).toBeUndefined();
  });

  it('fromSolanaAgentKitWallet and fromWalletAdapter reject incomplete wallets', () => {
    expect(() => fromSolanaAgentKitWallet({} as never)).toThrow(/missing publicKey or signTransaction/);
    expect(() => fromWalletAdapter({} as never)).toThrow(/missing publicKey or signTransaction/);
  });
});
