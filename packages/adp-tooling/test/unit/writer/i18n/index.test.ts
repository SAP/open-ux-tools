import { v4 as uuidv4 } from 'uuid';

import {
    FlexLayer,
    MAIN_I18N_PATH,
    type ResourceModel,
    RESOURCE_BUNDLE_TEXT,
    BASE_I18N_DESCRIPTION,
    TRANSLATION_UUID_TEXT
} from '../../../../src';
import { getI18nDescription } from '../../../../src/writer/i18n';
import { writeI18nModels, extractResourceModelPath, getI18nModels } from '../../../../src/writer/i18n';

jest.mock('uuid', () => ({
    v4: jest.fn()
}));

const uuidMock = uuidv4 as jest.Mock;

describe('writeI18nModels', () => {
    const mockFs = { write: jest.fn() };

    beforeEach(() => {
        mockFs.write.mockClear();
    });

    it('should write valid non-main i18n models to the file system', () => {
        const models: ResourceModel[] = [
            { key: 'custom', path: 'i18n/custom.properties', content: 'Custom Content' },
            { key: 'i18n', path: MAIN_I18N_PATH, content: 'Main i18n' } // should be skipped
        ];
        writeI18nModels('/myApp', models, mockFs as any);

        expect(mockFs.write).toHaveBeenCalledTimes(1);
        expect(mockFs.write).toHaveBeenCalledWith('/myApp/webapp/i18n/custom.properties', 'Custom Content');
    });

    it('should do nothing if i18nModels is undefined', () => {
        writeI18nModels('/myApp', undefined, mockFs as any);
        expect(mockFs.write).not.toHaveBeenCalled();
    });
});

describe('extractResourceModelPath', () => {
    const appId = 'my.app.id';

    it('should return path from uri if available', () => {
        const model = { uri: 'i18n/custom.properties' };
        const path = extractResourceModelPath(model as any, 'custom', appId);
        expect(path).toBe('i18n/custom.properties');
    });

    it('should generate path from bundleName when appId is prefix', () => {
        const model = {
            settings: { bundleName: 'my.app.id.i18n.custom' }
        };
        const path = extractResourceModelPath(model as any, 'custom', appId);
        expect(path).toBe('i18n/custom.properties');
    });

    it('should fallback to generic path when appId does not match bundleName', () => {
        const model = {
            settings: { bundleName: 'some.other.bundle' }
        };
        const path = extractResourceModelPath(model as any, 'resModel', appId);
        expect(path).toBe('i18n/resModel.properties');
    });
});

describe('getI18nModels', () => {
    const appId = 'my.app.id';
    const title = 'My App';

    it('should return resource models from manifest with proper path and content', () => {
        const manifest = {
            'sap.ui5': {
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        uri: 'i18n/i18n.properties'
                    },
                    custom: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        settings: { bundleName: 'my.app.id.i18n.custom' }
                    }
                }
            }
        };

        const models = getI18nModels(manifest as any, FlexLayer.CUSTOMER_BASE, appId, title);
        expect(models).toEqual([
            {
                key: 'i18n',
                path: 'i18n/i18n.properties',
                content: BASE_I18N_DESCRIPTION
            },
            {
                key: 'custom',
                path: 'i18n/custom.properties',
                content: BASE_I18N_DESCRIPTION
            }
        ]);
    });

    it('should return undefined if no models present', () => {
        const manifest = { 'sap.ui5': {} };
        const models = getI18nModels(manifest as any, FlexLayer.CUSTOMER_BASE, appId, title);
        expect(models).toEqual([]);
    });

    it('should not throw an error if manifest is invalid', () => {
        expect(() => getI18nModels(undefined, FlexLayer.CUSTOMER_BASE, appId, title)).not.toThrow(); // undefined is allowed

        expect(() => getI18nModels({ bad: 'structure' } as any, FlexLayer.CUSTOMER_BASE, appId, title)).not.toThrow(); // still returns []

        const brokenManifest = {
            'sap.ui5': {
                models: {
                    i18n: { type: 'sap.ui.model.resource.ResourceModel', settings: {} }
                }
            }
        };
        expect(() => getI18nModels(brokenManifest as any, FlexLayer.VENDOR, appId)).not.toThrow();
    });
});

describe('getI18nDescription', () => {
    beforeEach(() => {
        uuidMock.mockClear();
    });

    it('should return only base description for CUSTOMER_BASE layer', () => {
        const result = getI18nDescription(FlexLayer.CUSTOMER_BASE, 'My App');
        expect(result).toBe(BASE_I18N_DESCRIPTION);
        expect(uuidMock).not.toHaveBeenCalled();
    });

    it('should return full description with fixed UUID for non-customer layer', () => {
        const mockUUID = '123e4567-e89b-12d3-a456-42661';
        uuidMock.mockReturnValue(mockUUID);

        const appTitle = 'Demo App';
        const result = getI18nDescription(FlexLayer.VENDOR, appTitle);

        expect(uuidMock).toHaveBeenCalled();
        expect(result).toBe(BASE_I18N_DESCRIPTION + RESOURCE_BUNDLE_TEXT + appTitle + TRANSLATION_UUID_TEXT + mockUUID);
    });
});
