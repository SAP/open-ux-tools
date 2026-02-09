import { enableCardGeneratorConfig } from '../../../src/cards-config';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

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

function createMockLogger(): ToolsLogger {
    return {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;
}

describe('enableCardGenerator', () => {
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

    test('Valid LROP without preview middleware - should add preview middleware with flp configuration', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        const logger = createMockLogger();
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-without-generator.yaml'), logger, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        const yamlContent = fs.read(join(basePath, 'ui5-without-generator.yaml'));
        expect(yamlContent).toMatchSnapshot();
        // When no preview middleware exists, it should be added with flp config
        expect(yamlContent).toContain('flp:');
        expect(yamlContent).toContain('path: /test/flp.html');
        expect(yamlContent).toContain('intent:');
        expect(yamlContent).toContain('object: app');
        expect(yamlContent).toContain('action: preview');
    });

    test('Valid LROP with existing flp config - should not modify flp configuration', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        const logger = createMockLogger();
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), logger, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        const yamlContent = fs.read(join(basePath, 'ui5.yaml'));
        expect(yamlContent).toMatchSnapshot();
        // Should preserve existing flp path (may be normalized with leading /)
        expect(yamlContent).toContain('flpSandbox.html');
        // Should not have called debug for adding flp config since it already exists
        expect(logger.debug).not.toHaveBeenCalledWith('Added flp configuration to preview middleware.');
    });
});
