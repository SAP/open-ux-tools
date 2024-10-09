import { readFile } from 'fs/promises';
import { join } from 'path';

import { propertiesToI18nEntry } from '@sap-ux/i18n';

export const mockBundle = {
    getText: jest.fn(),
    hasText: jest.fn()
};

export default {
    create: jest.fn().mockImplementation(async (params: { bundleUrl?: string }) => {
        if (params.bundleUrl === '/preview/client/messagebundle.properties') {
            const path = join(__dirname, '..', '..', '..', '..', '..', 'src', 'messagebundle.properties');

            const text = await readFile(path, { encoding: 'utf-8' });
            const entries = propertiesToI18nEntry(text, '');

            const cache = new Map<string, string>();
            for (const { key, value } of entries) {
                cache.set(key.value, value.value);
            }
            const bundle = {
                getText: (key: string) => {
                    return cache.get(key);
                },
                hasText: (key: string) => {
                    return cache.has(key);
                }
            };
            return bundle;
        } else {
            return mockBundle;
        }
    })
};
