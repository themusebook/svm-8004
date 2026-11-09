/**
 * Wallet-agnostic signer used by svm-8004 write paths.
 *
 * The SDK still accepts a raw `@solana/web3.js` Keypair for backward
 * compatibility. Solana Agent Kit `BaseWallet` / `agent.wallet` and
 * wallet-adapter-style objects are adapted so plugin writes no longer
 * require exposing a secret key.
 *
 * Extra new-account Keypairs (for example the Metaplex Core asset minted
 * during `registerAgent`) are generated locally, partial-signed onto the
 * transaction, then the wallet signs.
 */

import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import nacl from 'tweetnacl';

export type SignableTransaction = Transaction | VersionedTransaction;

/**
 * Minimal wallet surface used across SDK write paths.
 * Compatible with Solana Agent Kit v2 `BaseWallet` and wallet-adapter.
 */
export interface Svm8004Signer {
  publicKey: PublicKey;
  signTransaction<T extends SignableTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends SignableTransaction>(transactions: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
  /**
   * Present only when this signer was created from a Keypair.
   * Lets synchronous helpers such as `Svm8004.sign()` keep working.
   * Never set this on wallet-adapter / Agent Kit wallets.
   */
  readonly keypair?: Keypair;
}

/** Solana Agent Kit v2 `BaseWallet` (and compatible wallet objects). */
export interface SolanaAgentKitWalletLike {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

/** Wallet-adapter style object (`publicKey` may be a base58 string). */
export interface WalletAdapterLike {
  publicKey: PublicKey | string;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

export type SignerInput = Keypair | Svm8004Signer;

function toPublicKey(value: PublicKey | string): PublicKey {
  return value instanceof PublicKey ? value : new PublicKey(value);
}

export function isKeypair(value: unknown): value is Keypair {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { publicKey?: unknown; secretKey?: unknown };
  return candidate.publicKey instanceof PublicKey && candidate.secretKey instanceof Uint8Array;
}

export function isSvm8004Signer(value: unknown): value is Svm8004Signer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Svm8004Signer>;
  return (
    candidate.publicKey instanceof PublicKey &&
    typeof candidate.signTransaction === 'function'
  );
}

/**
 * Wrap a Keypair. `signTransaction` uses `partialSign` so existing
 * signatures (new-account keypairs) are preserved.
 */
export function fromKeypair(keypair: Keypair): Svm8004Signer {
  return {
    publicKey: keypair.publicKey,
    keypair,
    async signTransaction<T extends SignableTransaction>(transaction: T): Promise<T> {
      if (transaction instanceof Transaction) {
        transaction.partialSign(keypair);
        return transaction;
      }
      transaction.sign([keypair]);
      return transaction;
    },
    async signAllTransactions<T extends SignableTransaction>(transactions: T[]): Promise<T[]> {
      return Promise.all(transactions.map((tx) => this.signTransaction(tx)));
    },
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      return nacl.sign.detached(message, keypair.secretKey);
    },
  };
}

/**
 * Adapt a Solana Agent Kit v2 wallet (`agent.wallet` / `BaseWallet`).
 */
export function fromSolanaAgentKitWallet(wallet: SolanaAgentKitWalletLike): Svm8004Signer {
  if (!wallet?.publicKey || typeof wallet.signTransaction !== 'function') {
    throw new Error(
      'Solana Agent Kit wallet is missing publicKey or signTransaction. ' +
        'Pass a BaseWallet (agent.wallet) or a Keypair to createSvm8004Plugin({ signer }).',
    );
  }
  return {
    publicKey: wallet.publicKey,
    signTransaction: (transaction) => wallet.signTransaction(transaction),
    signAllTransactions: wallet.signAllTransactions
      ? (transactions) => wallet.signAllTransactions!(transactions)
      : async (transactions) => Promise.all(transactions.map((tx) => wallet.signTransaction(tx))),
    signMessage: wallet.signMessage
      ? (message) => wallet.signMessage!(message)
      : undefined,
  };
}

/**
 * Adapt a wallet-adapter-style object (`publicKey` + `signTransaction`).
 */
export function fromWalletAdapter(wallet: WalletAdapterLike): Svm8004Signer {
  if (!wallet?.publicKey || typeof wallet.signTransaction !== 'function') {
    throw new Error('Wallet adapter is missing publicKey or signTransaction.');
  }
  const publicKey = toPublicKey(wallet.publicKey);
  return {
    publicKey,
    signTransaction: (transaction) => wallet.signTransaction(transaction),
    signAllTransactions: wallet.signAllTransactions
      ? (transactions) => wallet.signAllTransactions!(transactions)
      : async (transactions) => Promise.all(transactions.map((tx) => wallet.signTransaction(tx))),
    signMessage: wallet.signMessage
      ? (message) => wallet.signMessage!(message)
      : undefined,
  };
}

/**
 * Normalize `Keypair | Svm8004Signer | undefined` for SDK / builder constructors.
 * Keypair remains a valid input (backward compatible).
 */
export function resolveSigner(signer?: SignerInput | null): Svm8004Signer | undefined {
  if (!signer) return undefined;
  if (isKeypair(signer)) return fromKeypair(signer);
  if (isSvm8004Signer(signer)) return signer;
  throw new Error(
    'Unsupported signer. Pass a Keypair, Svm8004Signer, Solana Agent Kit wallet, or wallet adapter.',
  );
}

export function requireSigner(signer: Svm8004Signer | undefined, message?: string): Svm8004Signer {
  if (!signer) {
    throw new Error(message ?? 'No signer configured - SDK is read-only.');
  }
  return signer;
}

