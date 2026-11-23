import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'node:path';
import type { Manifest } from '../../../src/common/types.js';
import {
    generateRoutePattern,
    generateRouteTarget,
    getManifestJsonExtensionHelper,
    PATTERN_SUFFIX,
    validatePageConfig,
    initializeTargetSettings,
    deleteOutboundNavigationDetail
} from '../../../src/page/common.js';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { CustomPage, FpmPage, ObjectPage } from '../../../src/page/types.js';

describe('common page functionality', () => {
    const mainEntity = 'Main';
    const otherEntity = 'Other';
    const routes: ManifestNamespace.Route[] = [
        {
            name: 'MainListReport',
            target: ['MainListReport'],
            pattern: PATTERN_SUFFIX
        },
        {
            name: 'MainObjectPage',
            target: ['MainListReport', 'MainObjectPage'] as any,
            pattern: `Main({MainKey})${PATTERN_SUFFIX}`
        },
        {
            name: 'VeryNestedPage',
            target: ['MainListReport', 'MainObjectPage', 'VeryNestedPage'] as any,
            pattern: PATTERN_SUFFIX
        }
    ];

    describe('generateRoutePattern', () => {
        test('First List', () => {
            expect(generateRoutePattern([], mainEntity)).toBe(PATTERN_SUFFIX);
        });

        test('List->Detail', () => {
            expect(
                generateRoutePattern(routes, mainEntity, {
                    sourcePage: 'MainListReport',
                    navKey: true
                })
            ).toBe(`Main({MainKey})${PATTERN_SUFFIX}`);
        });

        test('Detail->SubDetail', () => {
            expect(
                generateRoutePattern(routes, otherEntity, {
                    sourcePage: 'MainObjectPage',
                    navEntity: 'to_OtherEntity',
                    navKey: true
                })
            ).toBe('Main({MainKey})/to_OtherEntity({to_OtherEntityKey}):?query:');
        });

        test('Detail->OtherDetail', () => {
            expect(
                generateRoutePattern(routes, otherEntity, {
                    sourcePage: 'MainObjectPage',
                    navKey: true
                })
            ).toBe('Other({OtherKey}):?query:');
        });

        test('Detail->List', () => {
            expect(
                generateRoutePattern(routes, otherEntity, {
                    sourcePage: 'MainObjectPage'
                })
            ).toBe('Other:?query:');
        });
    });

    describe('generateRouteTarget', () => {
        const targetName = 'OtherPage';

        test('no FCL - target is always name', () => {
            expect(generateRouteTarget(routes, targetName)).toBe(targetName);
            expect(generateRouteTarget(routes, targetName, false)).toBe(targetName);
            expect(generateRouteTarget(routes, targetName, false, { sourcePage: 'MainListReport' })).toBe(targetName);
        });

        test('FCL - no incoming navigation', () => {
            const target = generateRouteTarget(routes, targetName, true) as string[];
            expect(target.length).toBe(1);
            expect(target).toContain(targetName);
        });

        test('FCL - nested page navigation', () => {
            const target = generateRouteTarget(routes, targetName, true, {
                sourcePage: 'MainListReport'
            }) as string[];
            expect(target.length).toBe(2);
            expect(target).toContain(targetName);
        });

        test('FCL - only 3 columns are supported, additional page should be fullscreen', () => {
            const target = generateRouteTarget(routes, targetName, true, {
                sourcePage: 'VeryNestedPage'
            }) as string[];
            expect(target.length).toBe(1);
            expect(target).toContain(targetName);
        });
    });

    describe('getManifestJsonExtensionHelper', () => {
        const helperFn = getManifestJsonExtensionHelper({
            entity: 'MyEntity',
            name: 'Main'
        } as any);

        test('no routes - add empty array', () => {
            expect(helperFn('routing', {})).toEqual({ routes: [] });
        });

        test('empty routes - add a new route', () => {
            expect((helperFn('routes', []) as unknown[]).length).toBe(1);
        });

        test('anything else - do noting', () => {
            const input = { hello: 'world' };
            expect(helperFn('anything', input)).toBe(input);
        });
    });

    describe('validatePageConfig', () => {
        let fs: Editor;
        const testDir = '' + Date.now();
        const testAppManifest = JSON.stringify(
            {
                'sap.app': {
                    id: 'my.test.App'
                },
                'sap.ui5': {
                    dependencies: {
                        libs: {
                            'sap.fe.templates': {}
                        }
                    },
                    routing: {
                        routes: [
                            {
                                pattern: ':?query:',
                                name: 'TestObjectPage',
                                target: 'TestObjectPage'
                            }
                        ] as ManifestNamespace.Route[],
                        targets: {
                            TestObjectPage: {}
                        }
                    }
                }
            },
            null,
            2
        );

        const config: CustomPage = {
            name: 'CustomPage',
            entity: 'ChildEntity',
            navigation: {
                sourcePage: 'TestObjectPage',
                navEntity: 'navToChildEntity',
                navKey: true
            }
        };

        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
        });

        test('provided navigation config is valid for existing manifest', async () => {
            const manifest = JSON.parse(testAppManifest) as Manifest;

            fs.writeJSON(join(testDir, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(testDir, config, fs)).not.toThrow();
        });

        test('provided navigation config is not valid for existing manifest', async () => {
            const target = join(testDir, 'invalidateNavigation');

            let manifest = JSON.parse(testAppManifest);
            manifest['sap.ui5'] = manifest['sap.ui5'] ?? {};
            manifest['sap.ui5'].routing = manifest['sap.ui5'].routing ?? {};
            manifest['sap.ui5'].routing.routes = [];
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrow();

            delete manifest['sap.ui5']?.routing?.routes;
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrow();

            manifest = JSON.parse(testAppManifest) as Manifest;

            delete manifest['sap.ui5']?.routing?.targets?.['TestObjectPage'];
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrow();

            delete manifest['sap.ui5']?.routing?.targets;
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrow();

            delete manifest['sap.ui5']?.routing;
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrow();

            delete manifest['sap.ui5'];
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrow();
        });
    });

    describe('initializeTargetSettings', () => {
        type testData = {
            data: FpmPage;
            addSettings?: Record<string, unknown>;
            expected: object;
        };
        const testCases: testData[] = [
            {
                data: {
                    entity: 'testEntity',
                    contextPath: undefined,
                    minUI5Version: '1.54'
                },
                expected: {
                    entitySet: 'testEntity',
                    navigation: {}
                }
            },
            {
                data: {
                    entity: 'testEntity',
                    contextPath: '/any/invalid/data',
                    minUI5Version: '1.54'
                },
                expected: {
                    entitySet: 'testEntity',
                    navigation: {}
                }
            },
            {
                data: {
                    entity: 'testEntity',
                    contextPath: '/any/valid/data',
                    minUI5Version: '2.1.1'
                },
                expected: {
                    contextPath: '/any/valid/data',
                    navigation: {}
                }
            },
            {
                data: {
                    entity: 'testEntity',
                    minUI5Version: '1.94.0'
                },
                expected: {
                    contextPath: '/testEntity',
                    navigation: {}
                }
            },
            {
                data: {
                    entity: 'testEntity',
                    minUI5Version: '1.96.1'
                },
                expected: {
                    contextPath: '/testEntity',
                    navigation: {}
                }
            },
            {
                data: {
                    entity: 'testEntity',
                    minUI5Version: '1.118.0'
                },
                addSettings: {
                    any: 'existing'
                },
                expected: {
                    any: 'existing',
                    contextPath: '/testEntity',
                    navigation: {}
                }
            }
        ];
        test.each(testCases)('', (testData) => {
            const settings = initializeTargetSettings(testData.data, testData.addSettings);
            expect(settings).toEqual(testData.expected);
        });
    });

    describe('deleteOutboundNavigationDetail', () => {
        let fs: Editor;
        const testDir = `del-detail-${Date.now()}`;
        const manifestPath = join(testDir, 'webapp/manifest.json');

        const makeManifest = (navEntry?: Record<string, unknown>): Manifest =>
            ({
                'sap.app': { id: 'test' },
                'sap.ui5': {
                    routing: {
                        targets: {
                            ListReport: navEntry
                                ? { options: { settings: { navigation: { Products: navEntry } } } }
                                : {}
                        }
                    }
                }
            }) as unknown as Manifest;

        const baseData: ObjectPage = {
            entity: 'Products',
            navigation: { sourcePage: 'ListReport', navEntity: 'Products' }
        };

        beforeEach(() => {
            fs = create(createStorage());
        });

        test('deletes detail.outbound and writes manifest when outbound exists', () => {
            const manifest = makeManifest({ detail: { outbound: 'MyOutbound', route: 'ProductsObjectPage' } });
            fs.writeJSON(manifestPath, manifest);

            deleteOutboundNavigationDetail(manifestPath, manifest, baseData, fs);

            const written = fs.readJSON(manifestPath) as any;
            const detail = written['sap.ui5'].routing.targets.ListReport.options.settings.navigation.Products.detail;
            expect(detail.outbound).toBeUndefined();
            expect(detail.route).toBe('ProductsObjectPage');
        });

        test('does not write manifest when detail.outbound is absent', () => {
            const manifest = makeManifest({ detail: { route: 'ProductsObjectPage' } });
            fs.writeJSON(manifestPath, manifest);
            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            deleteOutboundNavigationDetail(manifestPath, manifest, baseData, fs);

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('does not write manifest when navigation detail object is missing entirely', () => {
            const manifest = makeManifest({ someOtherProp: true });
            fs.writeJSON(manifestPath, manifest);
            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            deleteOutboundNavigationDetail(manifestPath, manifest, baseData, fs);

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('is a no-op when navigation.sourcePage is not set', () => {
            const manifest = makeManifest({ detail: { outbound: 'MyOutbound' } });
            fs.writeJSON(manifestPath, manifest);
            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            deleteOutboundNavigationDetail(manifestPath, manifest, { entity: 'Products' } as ObjectPage, fs);

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('is a no-op when navigation.navEntity is not set', () => {
            const manifest = makeManifest({ detail: { outbound: 'MyOutbound' } });
            fs.writeJSON(manifestPath, manifest);
            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            deleteOutboundNavigationDetail(
                manifestPath,
                manifest,
                { entity: 'Products', navigation: { sourcePage: 'ListReport' } } as ObjectPage,
                fs
            );

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('is a no-op when sourcePage does not exist in manifest targets', () => {
            const manifest = makeManifest({ detail: { outbound: 'MyOutbound' } });
            fs.writeJSON(manifestPath, manifest);
            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            deleteOutboundNavigationDetail(
                manifestPath,
                manifest,
                { entity: 'Products', navigation: { sourcePage: 'NonExistent', navEntity: 'Products' } } as ObjectPage,
                fs
            );

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });
    });
});
