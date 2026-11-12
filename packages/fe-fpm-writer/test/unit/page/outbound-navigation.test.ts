import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'node:path';
import type { OutboundNavigation } from '../../../src/page/types.js';
import { generate, deleteOutboundNavigation } from '../../../src/page/outboundNavigation.js';
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

    describe('deleteOutboundNavigation', () => {
        const manifestWithBoth = JSON.stringify(
            {
                'sap.app': {
                    id: 'my.test.App',
                    crossNavigation: {
                        outbounds: {
                            ProductsOutbound: { semanticObject: 'ProductSO', action: 'display' }
                        }
                    }
                },
                'sap.ui5': {
                    routing: {
                        targets: {
                            RootEntityListReport: {
                                options: {
                                    settings: {
                                        navigation: {
                                            Products: { detail: { outbound: 'ProductsOutbound' } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            null,
            2
        );

        test('returns the mem-fs editor instance', async () => {
            const target = join(testDir, 'delete-return-value');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            const result = await deleteOutboundNavigation(target, minimalInput, fs);

            expect(result).toBe(fs);
        });

        test('creates its own fs editor when none is passed', async () => {
            const target = join(testDir, 'delete-no-fs');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            // write to disk so the internal fs can read it
            await new Promise<void>((resolve) => fs.commit(resolve));

            const result = await deleteOutboundNavigation(target, minimalInput);

            expect(result).toBeDefined();
        });

        test('skips page navigation deletion when sourcePage is not provided', async () => {
            const target = join(testDir, 'delete-no-source-page');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

            await deleteOutboundNavigation(
                target,
                { entity: 'Products', settings: { outboundKey: 'ProductsOutbound' } } as OutboundNavigation,
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            // outbound removed from sap.app
            expect(manifest['sap.app'].crossNavigation.outbounds['ProductsOutbound']).toBeUndefined();
            // page navigation untouched
            expect(
                manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation.Products
            ).toBeDefined();
        });

        test('skips page navigation deletion when sourcePage is empty string', async () => {
            const target = join(testDir, 'delete-empty-source-page');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

            await deleteOutboundNavigation(
                target,
                {
                    entity: 'Products',
                    navigation: { sourcePage: '' },
                    settings: { outboundKey: 'ProductsOutbound' }
                } as OutboundNavigation,
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app'].crossNavigation.outbounds['ProductsOutbound']).toBeUndefined();
            expect(
                manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation.Products
            ).toBeDefined();
        });

        test('throws when sourcePage is provided but does not exist in manifest targets', async () => {
            const target = join(testDir, 'delete-unknown-source-page');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            await expect(
                deleteOutboundNavigation(target, { ...minimalInput, navigation: { sourcePage: 'NonExistentPage' } }, fs)
            ).rejects.toThrow('Could not find navigation source NonExistentPage!');
        });

        test('deletes entity navigation entry when sourcePage and entity navigation both exist', async () => {
            const target = join(testDir, 'delete-entity-nav');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

            await deleteOutboundNavigation(
                target,
                {
                    entity: 'Products',
                    navigation: { sourcePage: 'RootEntityListReport' },
                    settings: { outboundKey: '' }
                } as OutboundNavigation,
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            const navigation = manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation;
            expect(navigation['Products']).toBeUndefined();
        });

        test('does not write manifest when entity navigation does not exist for the given entity', async () => {
            const manifestWithOtherNav = JSON.stringify(
                {
                    'sap.app': { id: 'my.test.App' },
                    'sap.ui5': {
                        routing: {
                            targets: {
                                RootEntityListReport: {
                                    options: {
                                        settings: {
                                            navigation: {
                                                Customers: { detail: { outbound: 'CustomersOutbound' } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                null,
                2
            );
            const target = join(testDir, 'delete-entity-nav-missing');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithOtherNav);

            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            await deleteOutboundNavigation(
                target,
                {
                    entity: 'Products',
                    navigation: { sourcePage: 'RootEntityListReport' },
                    settings: { outboundKey: '' }
                } as OutboundNavigation,
                fs
            );

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('deletes outbound key from sap.app.crossNavigation.outbounds when it exists', async () => {
            const target = join(testDir, 'delete-outbound-key');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

            await deleteOutboundNavigation(target, minimalInput, fs);

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            expect(manifest['sap.app'].crossNavigation.outbounds['ProductsOutbound']).toBeUndefined();
        });

        test('does not write manifest when outbound key does not exist in sap.app', async () => {
            const target = join(testDir, 'delete-outbound-key-missing');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            await deleteOutboundNavigation(target, minimalInput, fs);

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('does not write manifest when outboundKey is empty', async () => {
            const target = join(testDir, 'delete-empty-outbound-key');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            await deleteOutboundNavigation(
                target,
                { entity: 'Products', settings: { outboundKey: '' } } as OutboundNavigation,
                fs
            );

            expect(writeJSONSpy).not.toHaveBeenCalled();
            writeJSONSpy.mockRestore();
        });

        test('deletes both page navigation entry and outbound key when both exist', async () => {
            const target = join(testDir, 'delete-both');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

            await deleteOutboundNavigation(target, minimalInput, fs);

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            const navigation = manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation;
            expect(navigation['Products']).toBeUndefined();
            expect(manifest['sap.app'].crossNavigation.outbounds['ProductsOutbound']).toBeUndefined();
        });

        test('manifest matches snapshot after deleting both entries', async () => {
            const target = join(testDir, 'delete-both-snapshot');
            fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

            await deleteOutboundNavigation(target, minimalInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        describe('tab sizing', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                const target = join(testDir, 'delete-tab-sizing');
                fs.write(join(target, 'webapp/manifest.json'), manifestWithBoth);

                await deleteOutboundNavigation(target, { ...minimalInput, tabInfo }, fs);

                const updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
                const result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });
});
