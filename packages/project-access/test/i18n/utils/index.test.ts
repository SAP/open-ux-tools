import { dirname, join } from 'path';
import { getI18nPropertiesPath } from '../../../src/project/i18n/utils';
import { Manifest, ManifestNamespaceSelection } from '../../../src/types';

describe('getI18nPropertiesPath', () => {
    const root = 'root/to/project';
    const manifestPath = 'relative/path/to/manifest.json';
    const i18nPath = 'i18n/i18n.properties';
    describe('sap.app namespace', () => {
        test('sap.app/i18n - string', async () => {
            const manifest = {
                'sap.app': {
                    id: 'your.app.id',
                    i18n: i18nPath
                }
            } as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest,
                namespaceSelection: ManifestNamespaceSelection.app
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
        test('sap.app/i18n/bundleName', async () => {
            const manifest = {
                'sap.app': {
                    id: 'your.app.id',
                    i18n: {
                        bundleName: 'your.app.id.i18n.i18n',
                        bundleUrl: 'i18n/other/i18n.properties'
                    }
                }
            } as unknown as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest,
                namespaceSelection: ManifestNamespaceSelection.app
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
        test('sap.app/i18n/bundleUrl', async () => {
            const manifest = {
                'sap.app': {
                    id: 'your.app.id',
                    i18n: {
                        bundleUrl: 'i18n/i18n.properties'
                    }
                }
            } as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest,
                namespaceSelection: ManifestNamespaceSelection.app
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
        test('sap.app/i18n entry missing - default', async () => {
            const manifest = {
                'sap.app': {
                    id: 'your.app.id'
                }
            } as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest,
                namespaceSelection: ManifestNamespaceSelection.app
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
    });
    describe('sap.ui5 namespace', () => {
        test('sap.ui5/i18n/models/settings/bundleName', async () => {
            const i18nPath = 'i18n/i18n.properties';
            const manifest = {
                'sap.app': {
                    id: 'your.app.id'
                },
                'sap.ui5': {
                    models: {
                        i18n: {
                            type: 'sap.ui.model.resource.ResourceModel',
                            settings: {
                                bundleName: 'your.app.id.i18n.i18n',
                                bundleUrl: 'i18n/other/uri/i18n.properties'
                            },
                            uri: 'i18n/other/i18n.properties'
                        }
                    }
                }
            } as unknown as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
        test('sap.ui5/i18n/models/settings/bundleUrl', async () => {
            const i18nPath = 'i18n/i18n.properties';
            const manifest = {
                'sap.app': {
                    id: 'your.app.id'
                },
                'sap.ui5': {
                    models: {
                        i18n: {
                            type: 'sap.ui.model.resource.ResourceModel',
                            settings: {
                                bundleUrl: 'i18n/i18n.properties'
                            },
                            uri: 'i18n/other/i18n.properties'
                        }
                    }
                }
            } as unknown as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
        test('sap.ui5/i18n/models/uri', async () => {
            const i18nPath = 'i18n/i18n.properties';
            const manifest = {
                'sap.app': {
                    id: 'your.app.id'
                },
                'sap.ui5': {
                    models: {
                        i18n: {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/i18n.properties'
                        }
                    }
                }
            } as unknown as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
        test('sap.ui5/@i18n/models/uri - forAnnotation', async () => {
            const i18nPath = 'i18n/i18n.properties';
            const manifest = {
                'sap.app': {
                    id: 'your.app.id'
                },
                'sap.ui5': {
                    models: {
                        i18n: {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/other/i18n.properties'
                        },
                        '@i18n': {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/i18n.properties'
                        }
                    }
                }
            } as unknown as Manifest;
            const result = getI18nPropertiesPath({
                root,
                manifestPath,
                manifest,
                forAnnotation: true
            });
            expect(result).toStrictEqual(join(root, dirname(manifestPath), i18nPath));
        });
    });

    test('default', async () => {
        const manifest = {
            'sap.app': {
                id: 'your.app.id'
            },
            'sap.ui5': {}
        } as unknown as Manifest;
        const result = getI18nPropertiesPath({
            root,
            manifestPath,
            manifest
        });
        expect(result).toStrictEqual(undefined);
    });
});
