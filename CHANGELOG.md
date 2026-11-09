# Changelog

All notable changes to `@musebook/svm-8004` are documented here.

## 0.1.0 — 2026-11-09

First Musebook release. This package is a rewrite and rebrand of
[8004-solana](https://github.com/themusebook/svm-8004) **0.8.5**
(MIT, QuantuLabs). Protocol-level encoding, discriminators, PDAs, and
the deployed AgentRegistry8004 / ATOM program IDs are preserved so
existing 8004 accounts stay compatible.

### Changed

- Package name is `@musebook/svm-8004`. The primary SDK class is
  `Svm8004` (`SolanaSDK` remains an alias).
- Implicit cluster is `devnet`, not `mainnet-beta`. Mainnet still works
  when you pass `cluster: 'mainnet-beta'`.
- Remote 8004 indexers are opt-in. QuantuLabs public endpoints are
  available only via `indexerPreset: 'quantulabs-public'` or
  `INDEXER_PRESET=quantulabs-public`.
- Documentation, examples, and the agent skill file default to devnet
  and use Musebook / Solana Agent Kit branding.

### Added

- Solana Agent Kit plugin at `@musebook/svm-8004/plugin` with register,
  feedback, reputation, and wallet-binding actions.
- Helpers for `@musebook/identity` registration documents and
  `@musebook/discovery` directory config.
- `NOTICE` and a dual copyright line (Musebook + QuantuLabs) on the
  MIT license.

### Not in this release

- No Musebook 8004 indexer preset yet (see `docs/PROGRAMS.md`).
- No npm publish and no GitHub repository creation in this drop.
