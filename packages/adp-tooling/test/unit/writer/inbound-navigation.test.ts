import { join } from 'path';
import { readFileSync } from 'fs';
import type { create, Editor } from 'mem-fs-editor';

import { removeAndCreateI18nEntries, SapShortTextType } from '@sap-ux/i18n';

import { getVariant } from '../../../src/base/helper';
import { getFlpI18nKeys, updateI18n } from '../../../src/writer/inbound-navigation';
import { type InternalInboundNavigation, generateInboundConfig } from '../../../src';

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
    const variant = JSON.parse(readFileSync(mockPath, 'utf-8'));
    const appId = 'F0291';
    const config = {
        title: 'new_title',
        subTitle: 'new_subTitle',
        inboundId: 'displayBank',
        additionalParameters: '{"param1":"value1","param2":"value2"}',
        addInboundId: false,
        semanticObject: 'SomeSemanticObject',
        action: 'SomeAction'
    } as InternalInboundNavigation;

    let fs: ReturnType<typeof create>;

    beforeEach(() => {
        fs = {
            writeJSON: jest.fn()
        } as unknown as Editor;
        jest.clearAllMocks();
    });

    describe('generateInboundConfig', () => {
        it('should generate and write inbound configuration to the manifest', async () => {
            getVariantMock.mockReturnValue(variant);

            await generateInboundConfig(basePath, config, fs);

            expect(getVariantMock).toHaveBeenCalledWith(basePath, expect.any(Object));
            expect(fs.writeJSON).toHaveBeenCalledWith(join(basePath, 'webapp', 'manifest.appdescr_variant'), variant);
            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                expect.any(Array),
                basePath,
                fs
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
            const newConfig = { ...config, inboundId: undefined } as unknown as InternalInboundNavigation;

            getVariantMock.mockReturnValue(variant);

            await generateInboundConfig(basePath, newConfig, fs);

            expect(newConfig.inboundId).toBe(`${variant.id}.InboundID`);
        });
    });

    describe('getFlpI18nKeys', () => {
        it('should generate i18n keys for FLP configuration', () => {
            const keys = getFlpI18nKeys(config, appId);

            expect(keys).toEqual([
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title`,
                    value: config.title,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Title' }
                },
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.subTitle`,
                    value: config.subTitle,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Subtitle' }
                }
            ]);
        });

        it('should not include subtitle key if subtitle is not provided', () => {
            const newConfig = { ...config, subTitle: undefined };
            const keys = getFlpI18nKeys(newConfig, appId);

            expect(keys).toEqual([
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title`,
                    value: config.title,
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
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title`,
                    value: config.title,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Title' }
                },
                {
                    key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.subTitle`,
                    value: config.subTitle,
                    annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Subtitle' }
                }
            ];
            const keysToRemove = [`${appId}_sap.app.crossNavigation.inbounds`];

            await updateI18n(basePath, appId, config, fs);

            expect(removeAndCreateI18nEntriesMock).toHaveBeenCalledWith(
                i18nPath,
                expectedEntries,
                keysToRemove,
                basePath,
                fs
            );
        });
    });
});
