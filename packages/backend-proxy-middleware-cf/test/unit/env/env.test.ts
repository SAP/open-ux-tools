import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import type { EffectiveOptions } from '../../../src/types';
import { loadAndApplyEnvOptions } from '../../../src/env';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    buildVcapServicesFromResources: jest.fn(),
    getSpaceGuidFromUi5Yaml: jest.fn(),
    getYamlContent: jest.fn()
}));

const existsSyncMock = fs.existsSync as jest.Mock;
const readFileSyncMock = fs.readFileSync as jest.Mock;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- mock must be set before import
const adpTooling = require('@sap-ux/adp-tooling') as {
    buildVcapServicesFromResources: jest.Mock;
    getSpaceGuidFromUi5Yaml: jest.Mock;
    getYamlContent: jest.Mock;
};
const buildVcapServicesFromResourcesMock = adpTooling.buildVcapServicesFromResources;
const getSpaceGuidFromUi5YamlMock = adpTooling.getSpaceGuidFromUi5Yaml;
const getYamlContentMock = adpTooling.getYamlContent;

describe('env', () => {
    const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as ToolsLogger;
    const rootPath = path.join(__dirname, '../../fixtures/env');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loadAndApplyEnvOptions', () => {
        describe('when envOptionsPath is set (load from file)', () => {
            test('throws when env options file does not exist', async () => {
                existsSyncMock.mockReturnValue(false);
                const effectiveOptions = {
                    envOptionsPath: 'default-env.json',
                    destinations: []
                } as unknown as EffectiveOptions;

                await expect(loadAndApplyEnvOptions(rootPath, effectiveOptions, logger)).rejects.toThrow(
                    /Env options file not found/
                );

                const resolvedPath = path.resolve(rootPath, 'default-env.json');
                expect(existsSyncMock).toHaveBeenCalledWith(resolvedPath);
            });

            test('throws when env options file contains invalid JSON', async () => {
                existsSyncMock.mockReturnValue(true);
                readFileSyncMock.mockReturnValue('not valid json {');
                const effectiveOptions = {
                    envOptionsPath: 'opts.json',
                    destinations: []
                } as unknown as EffectiveOptions;

                await expect(loadAndApplyEnvOptions(rootPath, effectiveOptions, logger)).rejects.toThrow(
                    /Failed to read env options from/
                );

                expect(readFileSyncMock).toHaveBeenCalledWith(path.resolve(rootPath, 'opts.json'), 'utf8');
            });

            test('should load file and merge destinations (file + effectiveOptions, same name wins from effectiveOptions)', async () => {
                const opts = {
                    VCAP_SERVICES: { xsuaa: [{ name: 'my-xsuaa' }] },
                    destinations: [{ name: 'backend', url: 'http://localhost:8080' }]
                };
                existsSyncMock.mockReturnValue(true);
                readFileSyncMock.mockReturnValue(JSON.stringify(opts));

                const effectiveOptions = {
                    envOptionsPath: 'default-env.json',
                    destinations: []
                } as unknown as EffectiveOptions;
                const beforeVcap = process.env.VCAP_SERVICES;
                const beforeDest = process.env.destinations;

                await loadAndApplyEnvOptions(rootPath, effectiveOptions, logger);

                expect(process.env.VCAP_SERVICES).toBe(JSON.stringify(opts.VCAP_SERVICES));
                expect(process.env.destinations).toBe(JSON.stringify(opts.destinations));
                if (beforeVcap !== undefined) {
                    process.env.VCAP_SERVICES = beforeVcap;
                    process.env.destinations = beforeDest;
                } else {
                    delete process.env.VCAP_SERVICES;
                    delete process.env.destinations;
                }
            });
        });

        describe('when envOptionsPath is falsy (load from CF)', () => {
            const rootPathCf = '/project/root';
            const mtaPath = path.resolve(rootPathCf, '..', 'mta.yaml');

            test('throws when getSpaceGuidFromUi5Yaml returns undefined', async () => {
                getSpaceGuidFromUi5YamlMock.mockResolvedValue(undefined);
                const effectiveOptions = {
                    envOptionsPath: undefined,
                    destinations: []
                } as unknown as EffectiveOptions;

                await expect(loadAndApplyEnvOptions(rootPathCf, effectiveOptions, logger)).rejects.toThrow(
                    'No space GUID (from config or ui5.yaml). Cannot load CF env options.'
                );

                expect(getSpaceGuidFromUi5YamlMock).toHaveBeenCalledWith(rootPathCf, logger);
            });

            test('throws when mta.yaml does not exist', async () => {
                getSpaceGuidFromUi5YamlMock.mockResolvedValue('space-guid-123');
                existsSyncMock.mockReturnValue(false);
                const effectiveOptions = {
                    envOptionsPath: undefined,
                    destinations: []
                } as unknown as EffectiveOptions;

                await expect(loadAndApplyEnvOptions(rootPathCf, effectiveOptions, logger)).rejects.toThrow(
                    /mta.yaml not found at/
                );

                expect(existsSyncMock).toHaveBeenCalledWith(mtaPath);
            });

            test('should call buildVcapServicesFromResources and apply result to process.env when spaceGuid and mta exist', async () => {
                const spaceGuid = 'space-guid-123';
                const mtaYaml = { resources: [] };
                const vcapServices = { destination: [{ label: 'destination' }] };

                getSpaceGuidFromUi5YamlMock.mockResolvedValue(spaceGuid);
                existsSyncMock.mockReturnValue(true);
                getYamlContentMock.mockReturnValue(mtaYaml);
                buildVcapServicesFromResourcesMock.mockResolvedValue(vcapServices);

                const effectiveOptions = {
                    envOptionsPath: undefined,
                    destinations: [{ name: 'backend', url: 'http://localhost:8080' }]
                } as unknown as EffectiveOptions;
                const beforeVcap = process.env.VCAP_SERVICES;
                const beforeDest = process.env.destinations;

                await loadAndApplyEnvOptions(rootPathCf, effectiveOptions, logger);

                expect(getYamlContentMock).toHaveBeenCalledWith(mtaPath);
                expect(buildVcapServicesFromResourcesMock).toHaveBeenCalledWith(mtaYaml.resources, spaceGuid, logger);
                expect(process.env.VCAP_SERVICES).toBe(JSON.stringify(vcapServices));
                expect(process.env.destinations).toBe(JSON.stringify(effectiveOptions.destinations));

                if (beforeVcap !== undefined) {
                    process.env.VCAP_SERVICES = beforeVcap;
                } else {
                    delete process.env.VCAP_SERVICES;
                }
                if (beforeDest !== undefined) {
                    process.env.destinations = beforeDest;
                } else {
                    delete process.env.destinations;
                }
            });
        });
    });
});
