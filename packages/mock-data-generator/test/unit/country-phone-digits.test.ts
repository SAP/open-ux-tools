import { generateServiceForTesting } from '../../src/index.js';

function contactService(country: string): Parameters<typeof generateServiceForTesting>[0] {
    return {
        metadata: {
            format: 'csn',
            content: JSON.stringify({
                definitions: {
                    'Demo.Contact': {
                        kind: 'entity',
                        elements: {
                            ID: { type: 'cds.Integer', key: true, notNull: true },
                            SoldToPartyCountry: { type: 'cds.String', length: 2, enum: { [country]: {} } },
                            PhoneNumber: { type: 'cds.String', length: 30 }
                        }
                    }
                }
            })
        },
        service: { urlPath: '/contacts', odataVersion: '4.0' },
        targets: [{ name: 'Contact', kind: 'entity-set' }],
        existingData: {}
    };
}

describe('country-consistent phone numbers', () => {
    it.each([
        ['DK', /^\+45 33 \d{6}$/u],
        ['FR', /^\+33 1 \d{8}$/u],
        ['DE', /^\+49 30 \d{7}$/u]
    ])('uses the subscriber length of %s from the location bank', async (country, pattern) => {
        // Given contacts whose country has a known subscriber number length
        const options = {
            rowsPerEntity: 6,
            seed: 31,
            syntheticScenario: {
                id: 'phone-scenario',
                version: '1',
                domains: {},
                coherence: { Contact: ['country-phone'] as const }
            }
        };
        // When rows are generated
        const result = await generateServiceForTesting(contactService(country), options);
        // Then every phone number has the prefix and subscriber length of that country
        for (const row of result.resources.Contact ?? []) {
            expect(String(row.PhoneNumber)).toMatch(pattern);
        }
    });
});
