import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import {
    generateCustomAction,
    generateCustomColumn,
    generateCustomPage,
    TargetControl,
    generateCustomSection,
    generateCustomView,
    enableFPM,
    generateControllerExtension,
    ControllerExtensionPageType
} from '../../src';
import { Placement } from '../../src/common/types';
import { generateListReport, generateObjectPage } from '../../src/page';
import { clearTestOutput, writeFilesForDebugging } from '../common';

describe('use FPM with existing apps', () => {
    const testInput = join(__dirname, '../test-input');
    const testOutput = join(__dirname, '../test-output/integration');
    const fs = create(createStorage());

    beforeAll(() => {
        clearTestOutput(testOutput);
    });

    afterAll(() => {
        return writeFilesForDebugging(fs);
    });

    describe('extend UI5 application with FPM', () => {
        const mainEntity = 'Travel';

        const basicConfig = {
            path: join(testOutput, 'lrop'),
            settings: {}
        };
        const tsConfig = {
            path: join(testOutput, 'ts'),
            settings: {
                replaceAppComponent: true,
                typescript: true
            }
        };
        const configs: { path: string; settings: { typescript?: boolean } }[] = [basicConfig, tsConfig];

        beforeAll(() => {
            fs.copy(join(testInput, 'basic-lrop'), basicConfig.path);
            fs.copy(join(testInput, 'basic-ts'), tsConfig.path);
        });

        test.each(configs)('enableFpm', (config) => {
            enableFPM(config.path, config.settings, fs);
        });

        test.each(configs)('generateListReport', (config) => {
            generateListReport(config.path, { entity: mainEntity, ...config.settings }, fs);
        });

        test.each(configs)('generateObjectPage with navigation from ListReport', (config) => {
            generateObjectPage(
                config.path,
                {
                    entity: mainEntity,
                    navigation: {
                        navEntity: mainEntity,
                        sourcePage: 'TravelListReport',
                        navKey: true
                    },
                    ...config.settings
                },
                fs
            );
        });

        test.each(configs)('generateCustomPage with navigation from ObjectPage', (config) => {
            generateCustomPage(
                config.path,
                {
                    name: 'MyCustomPage',
                    entity: 'Booking',
                    navigation: {
                        sourcePage: 'TravelObjectPage',
                        navEntity: '_Booking'
                    },
                    ...config.settings
                },
                fs
            );
        });

        test.each(configs)('generateCustomColumn in ListReport', (config) => {
            generateCustomColumn(
                config.path,
                {
                    target: 'TravelListReport',
                    targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
                    name: 'NewCustomColumn',
                    header: 'Custom Price and Currency',
                    eventHandler: true,
                    position: {
                        placement: Placement.After,
                        anchor: 'DataField::TravelID'
                    },
                    properties: ['TotalPrice', 'CurrencyCode'],
                    ...config.settings
                },
                fs
            );
        });

        test.each(configs)('generateCustomView in ListReport', (config) => {
            //pre-requisite is at least one view based on annotations
            fs.extendJSON(join(config.path, 'webapp/manifest.json'), {
                'sap.ui5': {
                    routing: {
                        targets: {
                            TravelListReport: {
                                options: {
                                    settings: {
                                        views: {
                                            paths: [
                                                {
                                                    key: 'LineItemView',
                                                    annotationPath: 'com.sap.vocabularies.UI.v1.LineItem'
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            generateCustomView(
                config.path,
                {
                    target: 'TravelListReport',
                    key: 'CustomViewKey',
                    label: 'Custom View',
                    name: 'NewCustomView',
                    eventHandler: true,
                    ...config.settings
                },
                fs
            );
        });

        test.each(configs)('generateCustomAction in ListReport and ObjectPage', (config) => {
            generateCustomAction(
                config.path,
                {
                    name: 'MyCustomAction',
                    target: {
                        page: 'TravelListReport',
                        control: TargetControl.table
                    },
                    settings: {
                        text: 'My Custom Action'
                    },
                    eventHandler: true,
                    ...config.settings
                },
                fs
            );
            generateCustomAction(
                config.path,
                {
                    name: 'AnotherCustomAction',
                    target: {
                        page: 'TravelObjectPage',
                        control: TargetControl.header
                    },
                    settings: {
                        text: 'My other Action'
                    },
                    eventHandler: true,
                    ...config.settings
                },
                fs
            );
            // Generate custom action by appending existing file
            const fragment = config.settings.typescript
                ? `\nexport function onAppended() {\n\twindow.location.href += '/_Booking';\n}`
                : `,\n        onAppended: function() {\n            window.location.href += '/_Booking';\n        }`;
            const position = config.settings.typescript ? { line: 13, character: 9 } : { line: 8, character: 9 };
            generateCustomAction(
                config.path,
                {
                    name: 'AppendedAction',
                    target: {
                        page: 'TravelObjectPage',
                        control: TargetControl.header
                    },
                    settings: {
                        text: 'Navigate to CustomPage (appended action)'
                    },
                    eventHandler: {
                        fileName: 'AnotherCustomAction',
                        fnName: 'onAppended',
                        insertScript: {
                            fragment,
                            position
                        }
                    },
                    folder: join('ext', 'anotherCustomAction'),
                    ...config.settings
                },
                fs
            );
        });

        test.each(configs)('generateCustomSection in ObjectPage', (config) => {
            generateCustomSection(
                config.path,
                {
                    name: 'MyCustomSection',
                    target: 'TravelObjectPage',
                    title: 'My Custom Section',
                    position: {
                        placement: Placement.After,
                        anchor: 'DummyFacet'
                    },
                    eventHandler: true,
                    ...config.settings
                },
                fs
            );
        });

        test.each(configs)('generateControllerExtension in ObjectPage', (config) => {
            generateControllerExtension(
                config.path,
                {
                    name: 'MyControllerExtension',
                    extension: {
                        pageType: ControllerExtensionPageType.ObjectPage
                    },
                    ...config.settings
                },
                fs
            );
        });

        afterAll(() => {
            expect(
                fs.dump(testOutput, '**/test-output/**/webapp/{manifest.json,Component.ts,ext/**/*}')
            ).toMatchSnapshot();
        });
    });
});
