import { describe, expect, it } from '@jest/globals';
import { Keypair } from '@solana/web3.js';
import { ServiceType } from '../../src/models/enums.js';
import {
  directoryRecordAssetId,
  fromMusebookRegistrationDocument,
  musebookDiscoveryConfig,
  MUSEBOOK_HUB,
  MUSEBOOK_REGISTRY,
  toMusebookRegistrationDocument,
} from '../../src/integrations/musebook.js';
import { buildRegistrationFileJson } from '../../src/utils/registration-file-builder.js';

describe('Musebook Agent Kit integration helpers', () => {
  it('points directory config at musebook.trade, not a 8004 indexer', () => {
    const config = musebookDiscoveryConfig();
    expect(config.hub).toBe('https://musebook.trade');
    expect(config.registry).toBe('https://registry.musebook.trade');
    expect(config.hub).toBe(MUSEBOOK_HUB);
    expect(config.registry).toBe(MUSEBOOK_REGISTRY);
  });

  it('round-trips a registration file through the Musebook document shape', () => {
    const file = {
      name: 'Example Agent',
      description: 'A test agent',
      image: 'ipfs://QmImage',
      services: [
        { type: ServiceType.MCP, value: 'https://api.example.com/mcp' },
        { type: ServiceType.A2A, value: 'https://api.example.com/a2a' },
        { type: ServiceType.OASF, value: 'https://api.example.com/oasf' },
      ],
      skills: ['natural_language_processing/natural_language_generation/text_completion'],
      domains: ['technology/software_engineering/software_engineering'],
    };

    const document = toMusebookRegistrationDocument(file, { agentId: 'Asset111' });
    expect(document.type).toContain('eip-8004');
    expect(document.name).toBe('Example Agent');
    expect(document.services.find((svc) => svc.name === 'OASF')?.skills).toEqual(file.skills);

    const back = fromMusebookRegistrationDocument(document);
    expect(back.name).toBe(file.name);
    expect(back.services.map((svc) => svc.type)).toEqual(file.services.map((svc) => svc.type));
    expect(back.skills).toEqual(file.skills);

    const json = buildRegistrationFileJson(back);
    expect(json.name).toBe('Example Agent');
  });

  it('extracts a valid asset id from a directory record', () => {
    const asset = Keypair.generate().publicKey.toBase58();
    expect(directoryRecordAssetId({ assetId: asset, name: 'x' })).toBe(asset);
    expect(directoryRecordAssetId({ assetId: 'not-a-key' })).toBeNull();
  });
});
