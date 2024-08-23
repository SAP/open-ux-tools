import { join } from 'path';
import type { Manifest } from '../../../src';
import { getRelativeI18nPropertiesPaths, getI18nPropertiesPaths } from '../../../src/project/i18n/i18n';

describe('Test getI18nPropertiesPaths()', () => {
    test('All paths in manifest', async () => {
        const manifestFolder = join(__dirname, '../../test-data/project/info/cap-project/apps/one/source/webapp');
        const manifestPath = join(manifestFolder, 'manifest.json');
        const result = await getI18nPropertiesPaths(manifestPath);
        expect(result).toEqual({
            'sap.app': join(manifestFolder, 'i18n/i18n.properties'),
            models: {
                i18n: { path: join(manifestFolder, 'ovp/i18n/i18n.properties') },
                '@i18n': { path: join(manifestFolder, 'i18n/i18n.properties') }
            }
        });
    });

    test('Wrong path to manifest.json, should throw error', async () => {
        try {
            await getI18nPropertiesPaths('non-existing-path');
            throw Error('getI18nPropertiesPaths() should have thrown an error but did not.');
        } catch (error) {
            expect(error.message).toContain('non-existing-path');
        }
    });
});

describe('Test getRelativeI18nPropertiesPaths()', () => {
    test('No manifest', () => {
        const result = getRelativeI18nPropertiesPaths(undefined as unknown as Manifest);
        expect(result).toEqual({
            'sap.app': join('i18n/i18n.properties'),
            models: {}
        });
    });

    test('Empty manifest', () => {
        const result = getRelativeI18nPropertiesPaths({} as unknown as Manifest);
        expect(result).toEqual({
            'sap.app': join('i18n/i18n.properties'),
            models: {}
        });
    });

    test('No i18n model manifest', () => {
        const result = getRelativeI18nPropertiesPaths({ 'sap.ui5': { models: {} } } as unknown as Manifest);
        expect(result).toEqual({
            'sap.app': join('i18n/i18n.properties'),
            models: {}
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
                        type: 'sap.ui.model.resource.ResourceModel',
                        uri: 'model/i18n/i18n.properties'
                    }
                }
            }
        } as unknown as Manifest;
        const result = getRelativeI18nPropertiesPaths(manifest);
        expect(result).toEqual({
            'sap.app': join('app/i18n/i18n.properties'),
            models: {
                i18n: { path: join('model/i18n/i18n.properties') }
            }
        });
    });

    test('I18n referenced in bundleUrl', () => {
        const manifest = {
            'sap.app': { i18n: { bundleUrl: 'app/i18n/i18n.properties' } },
            'sap.ui5': {
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        settings: {
                            bundleUrl: 'bundle/url/i18n.properties'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getRelativeI18nPropertiesPaths(manifest);
        expect(result).toEqual({
            'sap.app': join('app/i18n/i18n.properties'),
            models: {
                i18n: { path: join('bundle/url/i18n.properties') }
            }
        });
    });

    test('I18n referenced in bundleName', () => {
        const manifest = {
            'sap.app': {
                id: 'sample.app',
                i18n: { bundleName: 'sample.app.app.bundle.i18n' }
            },
            'sap.ui5': {
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        settings: {
                            bundleName: 'sample.app.model.bundle.i18n'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getRelativeI18nPropertiesPaths(manifest);
        expect(result).toEqual({
            'sap.app': join('app/bundle/i18n.properties'),
            models: {
                i18n: { path: join('model/bundle/i18n.properties') }
            }
        });
    });

    test('All i18n paths filled', () => {
        const manifest = {
            'sap.app': {
                id: 'sample.app',
                'i18n': 'custom/i18n.properties'
            },
            'sap.ui5': {
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        settings: {
                            bundleName: 'sample.app.bundle.name.i18n'
                        }
                    },
                    '@i18n': {
                        type: 'sap.ui.model.resource.ResourceModel',
                        uri: 'any/i18n.properties'
                    }
                }
            }
        } as unknown as Manifest;
        const result = getRelativeI18nPropertiesPaths(manifest);
        expect(result).toEqual({
            'sap.app': join('custom/i18n.properties'),
            models: {
                i18n: { path: join('bundle/name/i18n.properties') },
                '@i18n': { path: join('any/i18n.properties') }
            }
        });
    });
});
