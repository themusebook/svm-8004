import { afterEach, describe, expect, it } from '@jest/globals';

const originalEnv = { ...process.env };

describe('indexer defaults', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.INDEXER_URL;
    delete process.env.INDEXER_GRAPHQL_URL;
    delete process.env.INDEXER_PRESET;
    delete process.env.INDEXER_API_KEY;
    delete process.env.MUSEBOOK_INDEXER_URL;
  });

  it('does not expose remote QuantuLabs URLs unless a preset is selected', async () => {
    delete process.env.INDEXER_URL;
    delete process.env.INDEXER_GRAPHQL_URL;
    delete process.env.INDEXER_PRESET;
    const {
      getDefaultIndexerUrls,
      getDefaultIndexerGraphqlUrls,
    } = await import('../../src/core/indexer-defaults.js');

    expect(getDefaultIndexerUrls('devnet')).toEqual([]);
    expect(getDefaultIndexerGraphqlUrls('devnet')).toEqual([]);
    expect(getDefaultIndexerUrls('mainnet-beta')).toEqual([]);
    expect(getDefaultIndexerGraphqlUrls('mainnet-beta')).toEqual([]);
  });

  it('keeps localnet localhost defaults without a remote preset', async () => {
    delete process.env.INDEXER_URL;
    delete process.env.INDEXER_GRAPHQL_URL;
    delete process.env.INDEXER_PRESET;
    const { getDefaultIndexerUrls, getDefaultIndexerGraphqlUrls } = await import(
      '../../src/core/indexer-defaults.js'
    );

    expect(getDefaultIndexerUrls('localnet')).toEqual(['http://127.0.0.1:3005/rest/v1']);
    expect(getDefaultIndexerGraphqlUrls('localnet')).toEqual(['http://127.0.0.1:3005/v2/graphql']);
  });

  it('exposes QuantuLabs public fallback URLs when the preset is selected', async () => {
    const {
      getDefaultIndexerUrls,
      getDefaultIndexerGraphqlUrls,
    } = await import('../../src/core/indexer-defaults.js');

    expect(getDefaultIndexerUrls('devnet', { preset: 'quantulabs-public' })).toEqual([
      'https://8004-indexer-dev.qnt.sh/rest/v1',
      'https://8004-indexer-dev2.qnt.sh/rest/v1',
    ]);
    expect(getDefaultIndexerGraphqlUrls('devnet', { preset: 'quantulabs-public' })).toEqual([
      'https://8004-indexer-dev.qnt.sh/v2/graphql',
      'https://8004-indexer-dev2.qnt.sh/v2/graphql',
    ]);
    expect(getDefaultIndexerUrls('mainnet-beta', { preset: 'quantulabs-public' })).toEqual([
      'https://8004-indexer-main.qnt.sh/rest/v1',
      'https://8004-indexer-main2.qnt.sh/rest/v1',
    ]);
    expect(getDefaultIndexerGraphqlUrls('mainnet-beta', { preset: 'quantulabs-public' })).toEqual([
      'https://8004-indexer-main.qnt.sh/v2/graphql',
      'https://8004-indexer-main2.qnt.sh/v2/graphql',
    ]);
  });

  it('honors INDEXER_PRESET=quantulabs-public', async () => {
    process.env.INDEXER_PRESET = 'quantulabs-public';
    const { getDefaultIndexerGraphqlUrls } = await import('../../src/core/indexer-defaults.js');
    expect(getDefaultIndexerGraphqlUrls('devnet')[0]).toBe(
      'https://8004-indexer-dev.qnt.sh/v2/graphql',
    );
  });

  it('still honors explicit env overrides over fallback lists', async () => {
    process.env.INDEXER_URL = 'https://custom.example.com/rest/v1';
    process.env.INDEXER_GRAPHQL_URL = 'https://custom.example.com/v2/graphql';
    const { getDefaultIndexerUrls, getDefaultIndexerGraphqlUrls } = await import(
      '../../src/core/indexer-defaults.js'
    );

    expect(getDefaultIndexerUrls('devnet')).toEqual(['https://custom.example.com/rest/v1']);
    expect(getDefaultIndexerGraphqlUrls('devnet')).toEqual(['https://custom.example.com/v2/graphql']);
  });

  it('resolves the musebook preset to the planned host, overridable via MUSEBOOK_INDEXER_URL', async () => {
    delete process.env.INDEXER_URL;
    delete process.env.INDEXER_GRAPHQL_URL;
    delete process.env.INDEXER_PRESET;
    delete process.env.MUSEBOOK_INDEXER_URL;
    const {
      getDefaultIndexerUrls,
      getDefaultIndexerGraphqlUrls,
      MUSEBOOK_INDEXER_HOST,
      resolveIndexerPreset,
    } = await import('../../src/core/indexer-defaults.js');

    expect(resolveIndexerPreset('musebook')).toBe('musebook');
    expect(getDefaultIndexerUrls('devnet', { preset: 'musebook' })).toEqual([
      `${MUSEBOOK_INDEXER_HOST}/rest/v1`,
    ]);
    expect(getDefaultIndexerGraphqlUrls('devnet', { preset: 'musebook' })).toEqual([]);

    process.env.MUSEBOOK_INDEXER_URL = 'http://127.0.0.1:3005/rest/v1';
    expect(getDefaultIndexerUrls('devnet', { preset: 'musebook' })).toEqual([
      'http://127.0.0.1:3005/rest/v1',
    ]);
  });

  it('honors INDEXER_PRESET=musebook', async () => {
    delete process.env.INDEXER_URL;
    process.env.INDEXER_PRESET = 'musebook';
    const { resolveIndexerPreset, getDefaultIndexerUrls, MUSEBOOK_INDEXER_HOST } = await import(
      '../../src/core/indexer-defaults.js'
    );
    expect(resolveIndexerPreset()).toBe('musebook');
    expect(getDefaultIndexerUrls('devnet')[0]).toBe(`${MUSEBOOK_INDEXER_HOST}/rest/v1`);
  });
});
