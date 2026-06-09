import { jest } from '@jest/globals';
import { enableCardGeneratorConfig, MinimumUI5VersionError } from '../../../src/cards-config/index.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

function createTestFs(basePath: string) {
    const fs = create(createStorage());
    fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
        'sap.app': {
            id: 'test.id',
            title: 'Test App'
        }
    });
    fs.writeJSON(join(basePath, 'package.json'), {});
    fs.write(join(basePath, 'ui5.yaml'), '');
    return fs;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('enableCardGenerator', () => {
    test('Throws MinimumUI5VersionError when UI5 version is too low', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = createTestFs(basePath);
        // Override manifest with low UI5 version
        fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'test.id',
                title: 'Test App'
            },
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.120.0'
                }
            }
        });

        await expect(enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs)).rejects.toThrow(
            MinimumUI5VersionError
        );

        await expect(enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs)).rejects.toThrow(
            /The card generator is only supported for projects with UI5 version/
        );
    });

    test('Valid LROP', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = createTestFs(basePath);
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('V4 LROP with CLI 3.0', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP without cardGenerator config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-without-generator.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-without-generator.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated preview config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-with-deprecated-config.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-config.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated rta config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-with-deprecated-rta-config.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-rta-config.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated config with cards generator', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(
            basePath,
            join(basePath, 'ui5-with-deprecated-config-and-cards-generator.yaml'),
            undefined,
            fs
        );

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-config-and-cards-generator.yaml'))).toMatchSnapshot();
    });
});
