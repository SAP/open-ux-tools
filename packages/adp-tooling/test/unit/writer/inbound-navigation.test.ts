import { join } from 'path';
import { readFileSync } from 'fs';
import type { create, Editor } from 'mem-fs-editor';

import { createPropertiesI18nEntries } from '@sap-ux/i18n';

import { getVariant } from '../../../src/base/helper';
import { getFlpI18nKeys, updateI18n } from '../../../src/writer/inbound-navigation';
import { type InternalInboundNavigation, generateInboundConfig } from '../../../src';

jest.mock('../../../src/base/helper', () => ({
    ...jest.requireActual('../../../src/base/helper'),
    getVariant: jest.fn()
}));

jest.mock('@sap-ux/i18n', () => ({
    createPropertiesI18nEntries: jest.fn()
}));

const getVariantMock = getVariant as jest.Mock;
const createPropertiesI18nEntriesMock = createPropertiesI18nEntries as jest.Mock;

describe('FLP Configuration Functions', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
    const variant = JSON.parse(readFileSync(mockPath, 'utf-8'));
    const appId = 'F0291';
    const config = {
        title: 'new_title',
        subTitle: 'new_subTitle',
        inboundId: 'displayBank',
        addInboundId: false
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

            expect(getVariantMock).toHaveBeenCalledWith(basePath);
            expect(fs.writeJSON).toHaveBeenCalledWith(join(basePath, 'webapp', 'manifest.appdescr_variant'), variant);
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
                expect.any(Array),
                basePath,
                fs
            );
        });

        it('should generate and write inbound configuration to the manifest without a mem-fs instance', async () => {
            getVariantMock.mockReturnValue(variant);

            const fs = await generateInboundConfig(basePath, config);

            expect(fs).toBeDefined();
            expect(getVariantMock).toHaveBeenCalledWith(basePath);
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'i18n', 'i18n.properties'),
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
            expect(newConfig.addInboundId).toBe(true);
        });
    });

    describe('getFlpI18nKeys', () => {
        it('should generate i18n keys for FLP configuration', () => {
            const keys = getFlpI18nKeys(config, appId);

            expect(keys).toEqual([
                { key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title`, value: config.title },
                { key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.subTitle`, value: config.title }
            ]);
        });

        it('should not include subtitle key if subtitle is not provided', () => {
            const newConfig = { ...config, subTitle: undefined };
            const keys = getFlpI18nKeys(newConfig, appId);

            expect(keys).toEqual([
                { key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title`, value: config.title }
            ]);
        });
    });

    describe('updateI18n', () => {
        it('should update the i18n.properties file with new FLP configuration entries', async () => {
            const i18nPath = join(basePath, 'webapp', 'i18n', 'i18n.properties');
            const expectedEntries = [
                { key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title`, value: config.title },
                { key: `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.subTitle`, value: config.title }
            ];

            await updateI18n(basePath, appId, config, fs);

            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(i18nPath, expectedEntries, basePath, fs);
        });
    });
});
