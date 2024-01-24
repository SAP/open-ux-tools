import { join } from 'path';
import type { Manifest } from '../../src';
import { getI18nPaths } from '../../src/project/i18n';

describe('Test getI18nPaths()', () => {
    test('No manifest', () => {
        const result = getI18nPaths('webapp', undefined as unknown as Manifest);
        expect(result).toEqual({
            'sap.app': join('webapp/i18n/i18n.properties')
        });
    });

    test('Empty manifest', () => {
        const result = getI18nPaths('webapp', {} as unknown as Manifest);
        expect(result).toEqual({
            'sap.app': join('webapp/i18n/i18n.properties')
        });
    });

    test('No i18n model manifest', () => {
        const result = getI18nPaths('webapp', { 'sap.ui5': { models: {} } } as unknown as Manifest);
        expect(result).toEqual({
            'sap.app': join('webapp/i18n/i18n.properties')
        });
    });

    test('Different path for manifest and model', () => {
        const manifest = {
            'sap.app': {
                i18n: 'app/i18n/i18n.properties'
            },
            'sap.ui5': {
                models: {
                    i18n: {
                        uri: 'model/i18n/i18n.properties'
                    }
                }
            }
        } as unknown as Manifest;
        const result = getI18nPaths('webapp', manifest);
        expect(result).toEqual({
            'sap.app': join('webapp/app/i18n/i18n.properties'),
            'sap.ui5': join('webapp/model/i18n/i18n.properties')
        });
    });

    test('I18n referenced in bundleUrl', () => {
        const manifest = {
            'sap.ui5': {
                models: {
                    i18n: {
                        settings: {
                            bundleUrl: 'bundle/url/i18n.properties'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getI18nPaths('any', manifest);
        expect(result).toEqual({
            'sap.app': join('any/i18n/i18n.properties'),
            'sap.ui5': join('any/bundle/url/i18n.properties')
        });
    });

    test('I18n referenced in bundleName', () => {
        const manifest = {
            'sap.app': {
                id: 'sample.app'
            },
            'sap.ui5': {
                models: {
                    i18n: {
                        settings: {
                            bundleName: 'sample.app.bundle.name.i18n'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getI18nPaths('', manifest);
        expect(result).toEqual({
            'sap.app': join('i18n/i18n.properties'),
            'sap.ui5': join('bundle/name/i18n.properties')
        });
    });
});
