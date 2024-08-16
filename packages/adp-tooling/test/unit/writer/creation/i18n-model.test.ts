import type { Editor } from 'mem-fs-editor';

import type { Manifest } from '@sap-ux/project-access';

import {
    writeI18nModels,
    extractResourceModelPath,
    getI18nDescription,
    FlexLayer,
    getI18nModels
} from '../../../../src';

jest.mock('uuid', () => ({
    v4: () => '1234-uuid'
}));

describe('i18n Model Utilities', () => {
    const fsWriteMock = jest.fn();
    const fsMock = {
        write: fsWriteMock
    } as unknown as Editor;

    afterEach(() => {
        fsWriteMock.mockReset();
    });

    describe('writeI18nModels', () => {
        it('should write i18n models correctly excluding the main i18n path', () => {
            const i18nModels = [
                { key: 'i18n', path: 'i18n/i18n.properties', content: 'value' },
                { key: 'i18nExtra', path: 'i18n/extra.properties', content: 'extraValue' }
            ];
            writeI18nModels('/base/path', i18nModels, fsMock);

            expect(fsWriteMock).toHaveBeenCalledTimes(1);
            expect(fsWriteMock).toHaveBeenCalledWith('/base/path/webapp/i18n/extra.properties', 'extraValue');
        });

        it('should not write models without content', () => {
            const i18nModels = [{ key: 'i18nExtra', path: 'i18n/extra.properties' }];
            writeI18nModels('/base/path', i18nModels, fsMock);

            expect(fsWriteMock).not.toHaveBeenCalled();
        });
    });

    describe('extractResourceModelPath', () => {
        it('should extract the resource model path using uri', () => {
            const ui5Model = { uri: 'i18n/model.properties' };
            const path = extractResourceModelPath(ui5Model, 'model', 'app1');

            expect(path).toEqual('i18n/model.properties');
        });

        it('should construct the resource model path using settings', () => {
            const ui5Model = { settings: { bundleName: 'app1.i18n.model' } };
            const path = extractResourceModelPath(ui5Model, 'model', 'app1');

            expect(path).toEqual('i18n/model.properties');
        });
    });

    describe('getI18nDescription', () => {
        it('should return a description for customer base layer', () => {
            const description = getI18nDescription(FlexLayer.CUSTOMER_BASE);

            expect(description).toContain('#Make sure you provide a unique prefix');
        });

        it('should return a description with app title and UUID for non-customer base layers', () => {
            const description = getI18nDescription(FlexLayer.VENDOR, 'MyApp');

            expect(description).toContain('MyApp');
            expect(description).toContain('1234-uuid');
        });
    });

    describe('getI18nModels', () => {
        it('returns resource models from manifest', () => {
            const manifest = {
                'sap.ui5': {
                    models: {
                        model1: { type: 'sap.ui.model.resource.ResourceModel' }
                    }
                }
            };

            const models = getI18nModels(manifest as unknown as Manifest, FlexLayer.VENDOR, 'app1', 'MyApp');

            expect(models).toHaveLength(1);
            expect(models?.[0]).toHaveProperty('content');
            expect(models?.[0].content).toContain('MyApp');
        });

        it('returns empty array if no models are present', () => {
            const manifest = {};
            const models = getI18nModels(manifest as unknown as Manifest, FlexLayer.VENDOR, 'app1');

            expect(models).toEqual([]);
        });

        it('throws an error when failing to extract models', async () => {
            expect(() => getI18nModels(undefined as unknown as Manifest, FlexLayer.VENDOR, 'app1', 'MyApp')).toThrow(
                'Manifest parsing error: Check manifest/i18n for missing properties'
            );
        });
    });
});
