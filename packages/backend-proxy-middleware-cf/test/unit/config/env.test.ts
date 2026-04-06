import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import { buildVcapServicesFromResources, getSpaceGuidFromUi5Yaml, getYamlContent } from '@sap-ux/adp-tooling';

import type { EffectiveOptions } from '../../../src/types';
import {
    loadEnvOptions,
    getConnectivityProxyInfo,
    applyToProcessEnv,
    updateUi5ServerDestinationPort
} from '../../../src/config/env';

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
const buildVcapServicesFromResourcesMock = buildVcapServicesFromResources as jest.Mock;
const getSpaceGuidFromUi5YamlMock = getSpaceGuidFromUi5Yaml as jest.Mock;
const getYamlContentMock = getYamlContent as jest.Mock;

describe('env', () => {
    const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as ToolsLogger;
    const rootPath = path.join(__dirname, '../../fixtures/env');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loadEnvOptions', () => {
        describe('when envOptionsPath is set (load from file)', () => {
            test('throws when env options file does not exist', async () => {
                existsSyncMock.mockReturnValue(false);
                const effectiveOptions = {
                    envOptionsPath: 'default-env.json',
                    destinations: []
                } as unknown as EffectiveOptions;

                await expect(loadEnvOptions(rootPath, effectiveOptions, logger)).rejects.toThrow(
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

                await expect(loadEnvOptions(rootPath, effectiveOptions, logger)).rejects.toThrow(
                    /Failed to read env options from/
                );

                expect(readFileSyncMock).toHaveBeenCalledWith(path.resolve(rootPath, 'opts.json'), 'utf8');
            });

            test('should load file and merge destinations', async () => {
                const opts = {
                    VCAP_SERVICES: { xsuaa: [{ name: 'my-xsuaa' }] },
                    destinations: [{ name: 'backend', url: 'http://localhost:8080' }]
                };
                existsSyncMock.mockReturnValue(true);
                readFileSyncMock.mockReturnValue(JSON.stringify(opts));

                const effectiveOptions = {
                    envOptionsPath: 'default-env.json',
                    destinations: [{ name: 'extra', url: 'http://localhost:9090' }]
                } as unknown as EffectiveOptions;

                const result = await loadEnvOptions(rootPath, effectiveOptions, logger);

                expect(result.VCAP_SERVICES).toEqual(opts.VCAP_SERVICES);
                expect(result.destinations).toEqual([
                    { name: 'backend', url: 'http://localhost:8080' },
                    { name: 'extra', url: 'http://localhost:9090' }
                ]);
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

                await expect(loadEnvOptions(rootPathCf, effectiveOptions, logger)).rejects.toThrow(
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

                await expect(loadEnvOptions(rootPathCf, effectiveOptions, logger)).rejects.toThrow(
                    /mta.yaml not found at/
                );

                expect(existsSyncMock).toHaveBeenCalledWith(mtaPath);
            });

            test('should build VCAP_SERVICES from mta resources and return options', async () => {
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

                const result = await loadEnvOptions(rootPathCf, effectiveOptions, logger);

                expect(getYamlContentMock).toHaveBeenCalledWith(mtaPath);
                expect(buildVcapServicesFromResourcesMock).toHaveBeenCalledWith(mtaYaml.resources, spaceGuid, logger);
                expect(result.VCAP_SERVICES).toEqual(vcapServices);
                expect(result.destinations).toEqual(effectiveOptions.destinations);
            });
        });
    });

    describe('getConnectivityProxyInfo', () => {
        test('should return proxy info when connectivity service is present', () => {
            const vcapServices = {
                connectivity: [{ credentials: { onpremise_proxy_host: 'proxy.internal', onpremise_proxy_port: 20003 } }]
            };

            const result = getConnectivityProxyInfo(vcapServices);

            expect(result).toEqual({ host: 'proxy.internal', port: 20003 });
        });

        test('should return undefined when vcapServices is undefined', () => {
            expect(getConnectivityProxyInfo(undefined)).toBeUndefined();
        });

        test('should return undefined when no connectivity service', () => {
            expect(getConnectivityProxyInfo({ xsuaa: [] })).toBeUndefined();
        });

        test('should return undefined when connectivity entry has no credentials', () => {
            expect(getConnectivityProxyInfo({ connectivity: [{}] })).toBeUndefined();
        });
    });

    describe('applyToProcessEnv', () => {
        let savedVcap: string | undefined;
        let savedDest: string | undefined;

        beforeEach(() => {
            savedVcap = process.env.VCAP_SERVICES;
            savedDest = process.env.destinations;
            delete process.env.VCAP_SERVICES;
            delete process.env.destinations;
        });

        afterEach(() => {
            if (savedVcap !== undefined) {
                process.env.VCAP_SERVICES = savedVcap;
            } else {
                delete process.env.VCAP_SERVICES;
            }
            if (savedDest !== undefined) {
                process.env.destinations = savedDest;
            } else {
                delete process.env.destinations;
            }
        });

        test('should apply VCAP_SERVICES and destinations to process.env as JSON strings', () => {
            const options = {
                VCAP_SERVICES: { xsuaa: [{ name: 'my-xsuaa' }] },
                destinations: [{ name: 'backend', url: 'http://localhost:8080' }]
            };

            applyToProcessEnv(options);

            expect(process.env.destinations).toBe(JSON.stringify(options.destinations));
            expect(JSON.parse(process.env.VCAP_SERVICES!)).toEqual(options.VCAP_SERVICES);
        });

        test('should override connectivity proxy host to localhost', () => {
            const options = {
                VCAP_SERVICES: {
                    connectivity: [
                        { credentials: { onpremise_proxy_host: 'proxy.internal', onpremise_proxy_port: 20003 } }
                    ]
                },
                destinations: []
            };

            applyToProcessEnv(options);

            const vcap = JSON.parse(process.env.VCAP_SERVICES!);
            expect(vcap.connectivity[0].credentials.onpremise_proxy_host).toBe('localhost');
        });

        test('should handle options without VCAP_SERVICES', () => {
            const options = {
                destinations: [{ name: 'backend', url: 'http://localhost:8080' }]
            };

            applyToProcessEnv(options);

            expect(process.env.destinations).toBe(JSON.stringify(options.destinations));
            expect(process.env.VCAP_SERVICES).toBeUndefined();
        });
    });

    describe('updateUi5ServerDestinationPort', () => {
        beforeEach(() => {
            delete process.env.destinations;
        });

        afterEach(() => {
            delete process.env.destinations;
        });

        test('auto-creates ui5-server destination when not configured', () => {
            const effectiveOptions = {
                destinations: [{ name: 'backend', url: 'http://localhost:3000' }]
            } as unknown as EffectiveOptions;

            const result = updateUi5ServerDestinationPort(effectiveOptions, 8080);

            expect(result).toBe(true);
            // Should have added ui5-server to effectiveOptions
            expect(effectiveOptions.destinations).toHaveLength(2);
            expect(effectiveOptions.destinations).toContainEqual({ name: 'ui5-server', url: 'http://localhost:8080' });
            // Should have added to process.env.destinations
            expect(process.env.destinations).toBe(
                JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }])
            );
        });

        test('auto-creates ui5-server with empty destinations array', () => {
            const effectiveOptions = {
                destinations: []
            } as unknown as EffectiveOptions;

            const result = updateUi5ServerDestinationPort(effectiveOptions, 8081);

            expect(result).toBe(true);
            expect(effectiveOptions.destinations).toEqual([{ name: 'ui5-server', url: 'http://localhost:8081' }]);
            expect(process.env.destinations).toBe(
                JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8081' }])
            );
        });

        test('returns false when port matches existing ui5-server', () => {
            const effectiveOptions = {
                destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
            } as unknown as EffectiveOptions;
            process.env.destinations = JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }]);

            const result = updateUi5ServerDestinationPort(effectiveOptions, 8080);

            expect(result).toBe(false);
            expect(effectiveOptions.destinations[0].url).toBe('http://localhost:8080');
        });

        test('updates destination when port differs from configured', () => {
            const effectiveOptions = {
                destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
            } as unknown as EffectiveOptions;
            process.env.destinations = JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }]);

            const result = updateUi5ServerDestinationPort(effectiveOptions, 8081);

            expect(result).toBe(true);
            expect(effectiveOptions.destinations[0].url).toBe('http://localhost:8081');
            expect(process.env.destinations).toBe(
                JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8081' }])
            );
        });

        test('adds ui5-server to process.env.destinations if not present but in effectiveOptions', () => {
            const effectiveOptions = {
                destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
            } as unknown as EffectiveOptions;
            process.env.destinations = JSON.stringify([{ name: 'backend', url: 'http://localhost:3000' }]);

            const result = updateUi5ServerDestinationPort(effectiveOptions, 8081);

            expect(result).toBe(true);
            const envDest = JSON.parse(process.env.destinations!) as { name: string; url: string }[];
            expect(envDest).toContainEqual({ name: 'backend', url: 'http://localhost:3000' });
            expect(envDest).toContainEqual({ name: 'ui5-server', url: 'http://localhost:8081' });
        });

        test('uses BAS external URL when basExternalUrl is provided', () => {
            const effectiveOptions = {
                destinations: []
            } as unknown as EffectiveOptions;
            const basExternalUrl = new URL('https://port8080-workspaces-xxx.bas.cloud.sap/');

            const result = updateUi5ServerDestinationPort(effectiveOptions, 8080, basExternalUrl);

            expect(result).toBe(true);
            expect(effectiveOptions.destinations).toEqual([
                { name: 'ui5-server', url: 'https://port8080-workspaces-xxx.bas.cloud.sap/' }
            ]);
            expect(process.env.destinations).toBe(
                JSON.stringify([{ name: 'ui5-server', url: 'https://port8080-workspaces-xxx.bas.cloud.sap/' }])
            );
        });
    });
});
