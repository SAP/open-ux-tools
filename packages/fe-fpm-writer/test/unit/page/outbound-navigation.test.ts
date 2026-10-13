import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'node:path';
import type { OutboundNavigation } from '../../../src/page/types.js';
import { generate } from '../../../src/page/outboundNavigation.js';
import { detectTabSpacing } from '../../../src/common/file.js';
import { tabSizingTestCases } from '../../common/index.js';

describe('OutboundNavigation', () => {
    const testDir = '' + Date.now();
    let fs: Editor;

    const testAppManifest = JSON.stringify(
        {
            'sap.app': {
                id: 'my.test.App'
            },
            'sap.ui5': {
                routing: {
                    targets: {
                        RootEntityListReport: {}
                    }
                }
            }
        },
        null,
        2
    );

    const minimalInput: OutboundNavigation = {
        entity: 'Products',
        navigation: { sourcePage: 'RootEntityListReport' },
        settings: {
            outboundKey: 'ProductsOutbound',
            crossNavigation: {
                semanticObject: 'ProductSO',
                action: 'display'
            }
        }
    };

    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
    });

    describe('generate', () => {
        test('throws when navigation.sourcePage is missing', async () => {
            const target = join(testDir, 'missing-source-page');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            await expect(
                generate(target, { entity: 'Products', settings: { outboundKey: 'key' } } as OutboundNavigation, fs)
            ).rejects.toThrow('Invalid data. Navigation source page name is missing!');
        });

        test('throws when navigation is provided but sourcePage is empty', async () => {
            const target = join(testDir, 'empty-source-page');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            await expect(
                generate(
                    target,
                    {
                        entity: 'Products',
                        navigation: {},
                        settings: { outboundKey: 'key' }
                    } as OutboundNavigation,
                    fs
                )
            ).rejects.toThrow('Invalid data. Navigation source page name is missing!');
        });

        test('throws when sourcePage does not exist in manifest targets', async () => {
            const target = join(testDir, 'unknown-source-page');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            await expect(
                generate(
                    target,
                    {
                        ...minimalInput,
                        navigation: { sourcePage: 'NonExistentPage' }
                    },
                    fs
                )
            ).rejects.toThrow('Could not find navigation source NonExistentPage!');
        });

        test('throws when outbound key already exists in sap.app.crossNavigation.outbounds', async () => {
            const manifestWithExistingOutbound = JSON.parse(testAppManifest);
            manifestWithExistingOutbound['sap.app'].crossNavigation = {
                outbounds: {
                    ProductsOutbound: { semanticObject: 'ProductSO', action: 'display' }
                }
            };
            const target = join(testDir, 'duplicate-outbound-key');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithExistingOutbound, null, 2));

            await expect(generate(target, minimalInput, fs)).rejects.toThrow(
                'The outbound with the key ProductsOutbound already exists!'
            );
        });

        test('does not throw for duplicate outbound key when crossNavigation is not requested', async () => {
            const manifestWithExistingOutbound = JSON.parse(testAppManifest);
            manifestWithExistingOutbound['sap.app'].crossNavigation = {
                outbounds: {
                    ProductsOutbound: { semanticObject: 'ProductSO', action: 'display' }
                }
            };
            const target = join(testDir, 'duplicate-key-no-cross-nav');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithExistingOutbound, null, 2));

            await expect(
                generate(
                    target,
                    {
                        entity: 'Products',
                        navigation: { sourcePage: 'RootEntityListReport' },
                        settings: { outboundKey: 'ProductsOutbound' }
                    },
                    fs
                )
            ).resolves.toBeDefined();
        });

        test('adds outbound navigation with crossNavigation to sap.app and sap.ui5', async () => {
            const target = join(testDir, 'with-cross-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            await generate(target, minimalInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('adds outbound navigation without crossNavigation (sap.ui5 only)', async () => {
            const target = join(testDir, 'no-cross-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            await generate(
                target,
                {
                    entity: 'Products',
                    navigation: { sourcePage: 'RootEntityListReport' },
                    settings: { outboundKey: 'ProductsOutbound' }
                },
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app']?.crossNavigation).toBeUndefined();
            expect(manifest['sap.ui5'].routing.targets.RootEntityListReport).toMatchSnapshot();
        });

        test('replaces existing outbound navigation for the same entity', async () => {
            const manifestWithExistingNav = JSON.parse(testAppManifest);
            manifestWithExistingNav['sap.ui5'].routing.targets.RootEntityListReport = {
                options: {
                    settings: {
                        navigation: {
                            Products: {
                                detail: {
                                    outbound: 'OldOutboundKey'
                                }
                            }
                        }
                    }
                }
            };
            const target = join(testDir, 'replace-nav');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithExistingNav, null, 2));

            await generate(
                target,
                {
                    entity: 'Products',
                    navigation: { sourcePage: 'RootEntityListReport' },
                    settings: {
                        outboundKey: 'NewOutboundKey',
                        crossNavigation: {
                            semanticObject: 'ProductSO',
                            action: 'manage'
                        }
                    }
                },
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            const navOutbound =
                manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation.Products.detail
                    .outbound;
            expect(navOutbound).toBe('NewOutboundKey');
            expect(manifest).toMatchSnapshot();
        });

        test('does not replace navigation for a different entity', async () => {
            const existingOutbound = 'ExistingOutbound';
            const manifestWithExistingNav = JSON.parse(testAppManifest);
            manifestWithExistingNav['sap.ui5'].routing.targets.RootEntityListReport = {
                options: {
                    settings: {
                        navigation: {
                            Customers: {
                                detail: {
                                    outbound: existingOutbound
                                }
                            }
                        }
                    }
                }
            };
            const target = join(testDir, 'keep-other-nav');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithExistingNav, null, 2));

            await generate(
                target,
                {
                    entity: 'Products',
                    navigation: { sourcePage: 'RootEntityListReport' },
                    settings: {
                        outboundKey: 'ProductsOutbound',
                        crossNavigation: { semanticObject: 'ProductSO', action: 'display' }
                    }
                },
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            expect(
                manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation
            ).toMatchSnapshot();
        });

        test('returns the mem-fs editor instance', async () => {
            const target = join(testDir, 'return-value');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            const result = await generate(target, minimalInput, fs);

            expect(result).toBe(fs);
        });

        describe('tab sizing', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                const target = join(testDir, 'tab-sizing');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

                await generate(target, { ...minimalInput, tabInfo }, fs);

                const updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
                const result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });
});
