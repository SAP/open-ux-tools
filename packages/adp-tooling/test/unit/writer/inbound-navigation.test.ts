import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { Editor } from 'mem-fs-editor';

import { removeAndCreateI18nEntries, SapShortTextType } from '@sap-ux/i18n';

import { getVariant } from '../../../src/base/helper';
import { getFlpI18nKeys, updateI18n } from '../../../src/writer/inbound-navigation';
import {
    type InternalInboundNavigation,
    generateInboundConfig,
    type DescriptorVariant,
    type DescriptorVariantContent
} from '../../../src';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    writeJSON: jest.fn()
}));

jest.mock('../../../src/base/helper', () => ({
    ...jest.requireActual('../../../src/base/helper'),
    getVariant: jest.fn()
}));

jest.mock('@sap-ux/i18n', () => ({
    removeAndCreateI18nEntries: jest.fn(),
    SapShortTextType: {
        TableTitle: 'XTIT'
    }
}));

const getVariantMock = getVariant as jest.Mock;
const removeAndCreateI18nEntriesMock = removeAndCreateI18nEntries as jest.Mock;

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
        });

        it('should generate and write inbound configuration to the manifest', async () => {
            // Create a deep copy to avoid mutation affecting the test
            const originalVariant = JSON.parse(JSON.stringify(variant)) as DescriptorVariant;
            getVariantMock.mockReturnValue(variant);

            await generateInboundConfig(basePath, config, mockFs as unknown as Editor);

            expect(getVariantMock).toHaveBeenCalledWith(basePath, expect.any(Object));

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

            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                mockFs as unknown as Editor
            );
        });
        it('should generate and write inbound configuration to the manifest - multiple inbounds', async () => {
            const originalVariant = JSON.parse(JSON.stringify(variant));
            getVariantMock.mockReturnValue(variant);
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

            expect(getVariantMock).toHaveBeenCalledWith(basePath, expect.any(Object));
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

            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                mockFs as unknown as Editor
            );
        });

        it('should generate and write inbound configuration to the manifest - without inbounds', async () => {
            const originalVariant = JSON.parse(JSON.stringify(variant));
            getVariantMock.mockReturnValue(variant);
            const configs = [] as InternalInboundNavigation[];
            await generateInboundConfig(basePath, configs, mockFs as unknown as Editor);

            expect(getVariantMock).toHaveBeenCalledWith(basePath, expect.any(Object));
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

            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                mockFs as unknown as Editor
            );
        });

        it('should generate and write inbound configuration to the manifest without a mem-fs instance', async () => {
            getVariantMock.mockReturnValue(variant);

            const fs = await generateInboundConfig(basePath, config);

            expect(fs).toBeDefined();
            expect(getVariantMock).toHaveBeenCalledWith(basePath, expect.any(Object));
            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                fs
            );
        });

        it('should generate a new inbound ID if not provided', async () => {
            const newConfig = [{ ...config, inboundId: undefined }] as unknown as InternalInboundNavigation[];

            getVariantMock.mockReturnValue(variant);

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

            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                i18nPath,
                expectedEntries,
                keysToRemove,
                basePath,
                mockFs as unknown as Editor
            );
        });
    });
});
