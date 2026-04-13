import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { readFileSync } from 'node:fs';
import type { Editor } from 'mem-fs-editor';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockGetVariant = jest.fn();
const mockUpdateVariant = jest
    .fn<(basePath: string, variant: unknown, fs: Editor) => Promise<void>>()
    .mockImplementation(async (basePath: string, variant: unknown, fs: Editor) => {
        fs.writeJSON(join(basePath, 'webapp', 'manifest.appdescr_variant'), variant as object);
    });
jest.unstable_mockModule('../../../src/base/helper', () => ({
    getVariant: mockGetVariant,
    updateVariant: mockUpdateVariant,
    flpConfigurationExists: jest.fn(),
    isTypescriptSupported: jest.fn(),
    readUi5Config: jest.fn(),
    extractAdpConfig: jest.fn(),
    extractCfBuildTask: jest.fn(),
    getSpaceGuidFromUi5Yaml: jest.fn(),
    readManifestFromBuildPath: jest.fn(),
    loadAppVariant: jest.fn(),
    getAdpConfig: jest.fn(),
    getExistingAdpProjectType: jest.fn(),
    getWebappFiles: jest.fn(),
    filterAndMapInboundsToManifest: jest.fn(),
    getBaseAppId: jest.fn()
}));

const mockRemoveAndCreateI18nEntries = jest.fn();
const SapShortTextType = { TableTitle: 'XTIT' };
jest.unstable_mockModule('@sap-ux/i18n', () => ({
    removeAndCreateI18nEntries: mockRemoveAndCreateI18nEntries,
    SapShortTextType,
    createPropertiesI18nEntries: jest.fn(),
    createCapI18nEntries: jest.fn(),
    getCapI18nBundle: jest.fn(),
    getI18nFolderNames: jest.fn(),
    getPropertiesI18nBundle: jest.fn()
}));

const { getFlpI18nKeys, updateI18n, generateInboundConfig } = await import('../../../src/writer/inbound-navigation');
import type { InternalInboundNavigation, DescriptorVariant, DescriptorVariantContent } from '../../../src/types';

describe('FLP Configuration Functions', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
    const variant = JSON.parse(readFileSync(mockPath, 'utf-8')) as DescriptorVariant;
    const appId = 'F0291';
    const config = [
        {
            title: 'new_title',
            subTitle: 'new_subTitle',
            inboundId: 'displayBank',
            additionalParameters: '{"param1":"value1","param2":"value2"}',
            semanticObject: 'SomeSemanticObject',
            action: 'SomeAction'
        }
    ] as InternalInboundNavigation[];

    const writeJsonSpy = jest.fn();
    const mockFs = { writeJSON: writeJsonSpy };

    describe('generateInboundConfig', () => {
        beforeEach(() => {
            jest.resetAllMocks();
            // Restore updateVariant implementation after resetAllMocks clears it
            mockUpdateVariant.mockImplementation(async (basePath: string, variant: unknown, fs: Editor) => {
                fs.writeJSON(join(basePath, 'webapp', 'manifest.appdescr_variant'), variant as object);
            });
        });

        it('should generate and write inbound configuration to the manifest', async () => {
            // Create a deep copy to avoid mutation affecting the test
            const originalVariant = JSON.parse(JSON.stringify(variant)) as DescriptorVariant;
            mockGetVariant.mockReturnValue(variant);

            await generateInboundConfig(basePath, config, mockFs as unknown as Editor);

            expect(mockGetVariant).toHaveBeenCalledWith(basePath, expect.any(Object));

            // Check that writeJsonSpy was called
            expect(writeJsonSpy).toHaveBeenCalledTimes(1);

            // Get the actual written data
            const [writtenPath, writtenData] = writeJsonSpy.mock.calls[0] as [string, typeof variant];

            // Verify the path is correct
            expect(writtenPath).toBe(join(basePath, 'webapp', 'manifest.appdescr_variant'));

            // Verify the written data has the expected structure and additional content
            expect(writtenData).toEqual(
                expect.objectContaining({
                    id: originalVariant.id,
                    layer: originalVariant.layer,
                    reference: originalVariant.reference
                })
            );

            // Check that new inbound configuration was added to content
            expect(writtenData.content).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        changeType: 'appdescr_app_addNewInbound',
                        content: expect.objectContaining({
                            inbound: expect.objectContaining({
                                [config[0].inboundId]: expect.objectContaining({
                                    action: config[0].action,
                                    semanticObject: config[0].semanticObject,
                                    title: expect.stringContaining('title'),
                                    subTitle: expect.stringContaining('subTitle')
                                })
                            })
                        })
                    }),
                    expect.objectContaining({
                        changeType: 'appdescr_app_removeAllInboundsExceptOne',
                        content: expect.objectContaining({
                            inboundId: config[0].inboundId
                        })
                    })
                ])
            );

            expect(mockRemoveAndCreateI18nEntries).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                mockFs as unknown as Editor
            );
        });
        it('should generate and write inbound configuration to the manifest - multiple inbounds', async () => {
            const originalVariant = JSON.parse(JSON.stringify(variant));
            mockGetVariant.mockReturnValue(variant);
            const configs = [
                ...config,
                {
                    title: 'another_title',
                    subTitle: 'another_subTitle',
                    inboundId: 'editBank',
                    additionalParameters: '{"paramA":"valueA","paramB":"valueB"}',
                    semanticObject: 'AnotherSemanticObject',
                    action: 'AnotherAction'
                }
            ] as InternalInboundNavigation[];
            await generateInboundConfig(basePath, configs, mockFs as unknown as Editor);

            expect(mockGetVariant).toHaveBeenCalledWith(basePath, expect.any(Object));
            expect(writeJsonSpy).toHaveBeenCalledTimes(1);

            const [writtenPath, writtenData] = writeJsonSpy.mock.calls[0];
            expect(writtenPath).toBe(join(basePath, 'webapp', 'manifest.appdescr_variant'));
            expect(writtenData).toEqual(
                expect.objectContaining({
                    id: originalVariant.id,
                    layer: originalVariant.layer,
                    reference: originalVariant.reference
                })
            );
            expect(writtenData.content).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        changeType: 'appdescr_app_addNewInbound',
                        content: expect.objectContaining({
                            inbound: expect.objectContaining({
                                [configs[0].inboundId]: expect.objectContaining({
                                    action: configs[0].action,
                                    semanticObject: configs[0].semanticObject
                                })
                            })
                        })
                    }),
                    expect.objectContaining({
                        changeType: 'appdescr_app_removeAllInboundsExceptOne',
                        content: expect.objectContaining({
                            inboundId: configs[0].inboundId
                        })
                    }),
                    expect.objectContaining({
                        changeType: 'appdescr_app_addNewInbound',
                        content: expect.objectContaining({
                            inbound: expect.objectContaining({
                                [configs[1].inboundId]: expect.objectContaining({
                                    action: configs[1].action,
                                    semanticObject: configs[1].semanticObject
                                })
                            })
                        })
                    })
                ])
            );

            expect(mockRemoveAndCreateI18nEntries).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                mockFs as unknown as Editor
            );
        });

        it('should generate and write inbound configuration to the manifest - without inbounds', async () => {
            const originalVariant = JSON.parse(JSON.stringify(variant));
            mockGetVariant.mockReturnValue(variant);
            const configs = [] as InternalInboundNavigation[];
            await generateInboundConfig(basePath, configs, mockFs as unknown as Editor);

            expect(mockGetVariant).toHaveBeenCalledWith(basePath, expect.any(Object));
            expect(writeJsonSpy).toHaveBeenCalledTimes(1);
            const [writtenPath, writtenData] = writeJsonSpy.mock.calls[0];
            expect(writtenPath).toBe(join(basePath, 'webapp', 'manifest.appdescr_variant'));
            expect(writtenData).toEqual(
                expect.objectContaining({
                    id: originalVariant.id,
                    layer: originalVariant.layer,
                    reference: originalVariant.reference
                })
            );

            const inboundChangeTypes = ['appdescr_app_addNewInbound', 'appdescr_app_removeAllInboundsExceptOne'];
            const hasInboundChanges = writtenData.content.some((item: any) =>
                inboundChangeTypes.includes(item.changeType)
            );
            expect(hasInboundChanges).toBe(false);

            expect(mockRemoveAndCreateI18nEntries).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                mockFs as unknown as Editor
            );
        });

        it('should generate and write inbound configuration to the manifest without a mem-fs instance', async () => {
            mockGetVariant.mockReturnValue(variant);

            const fs = await generateInboundConfig(basePath, config);

            expect(fs).toBeDefined();
            expect(mockGetVariant).toHaveBeenCalledWith(basePath, expect.any(Object));
            expect(mockRemoveAndCreateI18nEntries).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                fs
            );
        });

        it('should generate a new inbound ID if not provided', async () => {
            const newConfig = [{ ...config, inboundId: undefined }] as unknown as InternalInboundNavigation[];

            mockGetVariant.mockReturnValue(variant);

            await generateInboundConfig(basePath, newConfig, mockFs as unknown as Editor);

            expect(newConfig[0].inboundId).toBe(`${variant.id}.InboundID`);
        });
    });

    describe('getFlpI18nKeys', () => {
        it('should generate i18n keys for FLP configuration', () => {
            const keys = getFlpI18nKeys(config[0], appId);

            expect(keys).toEqual([
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config[0].inboundId}.title`,
                    value: config[0].title,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Title' }
                },
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config[0].inboundId}.subTitle`,
                    value: config[0].subTitle,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Subtitle' }
                }
            ]);
        });

        it('should not include subtitle key if subtitle is not provided', () => {
            const newConfig = [{ ...config[0], subTitle: undefined }] as unknown as InternalInboundNavigation[];
            const keys = getFlpI18nKeys(newConfig[0], appId);

            expect(keys).toEqual([
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config[0].inboundId}.title`,
                    value: config[0].title,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Title' }
                }
            ]);
        });
    });

    describe('updateI18n', () => {
        it('should update the i18n.properties file with new FLP configuration entries', async () => {
            const i18nPath = join(basePath, 'webapp', 'i18n', 'i18n.properties');
            const expectedEntries = [
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config[0].inboundId}.title`,
                    value: config[0].title,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Title' }
                },
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config[0].inboundId}.subTitle`,
                    value: config[0].subTitle,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Subtitle' }
                }
            ];
            const keysToRemove = [`${appId}_sap.app.crossNavigation.inbounds`];

            await updateI18n(basePath, appId, config, mockFs as unknown as Editor);

            expect(mockRemoveAndCreateI18nEntries).toHaveBeenCalledWith(
                i18nPath,
                expectedEntries,
                keysToRemove,
                basePath,
                mockFs as unknown as Editor
            );
        });
    });
});
