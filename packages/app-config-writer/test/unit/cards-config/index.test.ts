import { enableCardGeneratorConfig } from '../../../src/cards-config';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import * as projectAccess from '@sap-ux/project-access';

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

    test('CAP project - should skip script generation', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = createTestFs(basePath);

        // Mock getProjectType to return CAPNodejs
        const getProjectTypeSpy = jest.spyOn(projectAccess, 'getProjectType').mockResolvedValue('CAPNodejs');

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), mockLogger as any, fs);

        // Verify that the logger was called with the CAP project message
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('Skipping script generation for CAP project')
        );

        // Verify that the package.json does not have the start-cards-generator script
        const packageJson = JSON.parse(fs.read(join(basePath, 'package.json')));
        expect(packageJson.scripts?.['start-cards-generator']).toBeUndefined();

        getProjectTypeSpy.mockRestore();
    });

    test('CAP Java project - should skip script generation', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = createTestFs(basePath);

        // Mock getProjectType to return CAPJava
        const getProjectTypeSpy = jest.spyOn(projectAccess, 'getProjectType').mockResolvedValue('CAPJava');

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), mockLogger as any, fs);

        // Verify that the logger was called with the CAP project message
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('Skipping script generation for CAP project')
        );

        // Verify that the package.json does not have the start-cards-generator script
        const packageJson = JSON.parse(fs.read(join(basePath, 'package.json')));
        expect(packageJson.scripts?.['start-cards-generator']).toBeUndefined();

        getProjectTypeSpy.mockRestore();
    });

    test('CAP project with deprecated dependency - should remove dependency', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());

        // Create package.json with the deprecated dependency
        fs.writeJSON(join(basePath, 'package.json'), {
            devDependencies: {
                '@sap-ux/cards-editor-middleware': '^1.0.0'
            }
        });
        fs.write(join(basePath, 'ui5.yaml'), '');
        fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'test.id',
                title: 'Test App'
            }
        });

        // Mock getProjectType to return CAPNodejs
        const getProjectTypeSpy = jest.spyOn(projectAccess, 'getProjectType').mockResolvedValue('CAPNodejs');

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), mockLogger as any, fs);

        // Verify that the deprecated dependency was removed
        const packageJson = JSON.parse(fs.read(join(basePath, 'package.json')));
        expect(packageJson.devDependencies?.['@sap-ux/cards-editor-middleware']).toBeUndefined();

        // Verify that the logger was called with the removal message
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('Removed devDependency @sap-ux/cards-editor-middleware')
        );

        getProjectTypeSpy.mockRestore();
    });
});
