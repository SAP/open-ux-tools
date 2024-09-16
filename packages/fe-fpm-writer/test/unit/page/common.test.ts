import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { Manifest } from '../../../src/common/types';
import {
    generateRoutePattern,
    generateRouteTarget,
    getManifestJsonExtensionHelper,
    PATTERN_SUFFIX,
    validatePageConfig,
    initializeTargetSettings
} from '../../../src/page/common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { CustomPage, FpmPage } from '../../../src/page/types';

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
            await expect(async () => await validatePageConfig(testDir, config, fs)).not.toThrowError();
        });

        test('provided navigation config is not valid for existing manifest', async () => {
            const target = join(testDir, 'invalidateNavigation');

            let manifest = JSON.parse(testAppManifest);
            manifest['sap.ui5'] = manifest['sap.ui5'] ?? {};
            manifest['sap.ui5'].routing = manifest['sap.ui5'].routing ?? {};
            manifest['sap.ui5'].routing.routes = [];
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrowError();

            delete manifest['sap.ui5']?.routing?.routes;
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrowError();

            manifest = JSON.parse(testAppManifest) as Manifest;

            delete manifest['sap.ui5']?.routing?.targets?.['TestObjectPage'];
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrowError();

            delete manifest['sap.ui5']?.routing?.targets;
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrowError();

            delete manifest['sap.ui5']?.routing;
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrowError();

            delete manifest['sap.ui5'];
            fs.writeJSON(join(target, 'webapp/manifest.json'), manifest);
            await expect(async () => await validatePageConfig(target, config, fs)).rejects.toThrowError();
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
});
