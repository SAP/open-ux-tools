import { join, relative } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import {
    generateCustomAction,
    generateCustomColumn,
    generateCustomPage,
    TargetControl,
    generateCustomSection,
    generateCustomView
} from '../../src';
import { Placement } from '../../src/common/types';
import { generateListReport, generateObjectPage } from '../../src/page';

describe('use FPM with existing apps', () => {
    const testInput = join(__dirname, '../test-input');
    const testOutput = join(__dirname, '../test-output');
    const debug = !!process.env['UX_DEBUG'];
    const fs = create(createStorage());

    beforeAll(() => {
        fs.delete(testOutput);
    });

    afterAll(() => {
        if (debug) {
            fs.commit(() => {});
        }
    });

    describe('extend UI5 application with FPM', () => {
        const targetPath = join(testOutput, 'lrop');
        const mainEntity = 'Travel';
        beforeAll(() => {
            fs.copy(join(testInput, 'basic-lrop'), targetPath);
        });

        test('generateListReport', () => {
            generateListReport(targetPath, { entity: mainEntity }, fs);
        });

        test('generateObjectPage with navigation from ListReport', () => {
            generateObjectPage(
                targetPath,
                {
                    entity: mainEntity,
                    navigation: {
                        navEntity: mainEntity,
                        sourcePage: 'TravelListReport',
                        navKey: true
                    }
                },
                fs
            );
        });

        test('generateCustomPage with navigation from ObjectPage', () => {
            generateCustomPage(
                targetPath,
                {
                    name: 'MyCustomPage',
                    entity: 'Booking',
                    navigation: {
                        sourcePage: 'TravelObjectPage',
                        navEntity: '_Booking'
                    }
                },
                fs
            );
        });

        test('generateCustomColumn in ListReport', () => {
            generateCustomColumn(
                targetPath,
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
                    properties: ['TotalPrice', 'CurrencyCode']
                },
                fs
            );
        });

        test('generateCustomView in ListReport', () => {
            //pre-requisite is at least one view based on annotations
            fs.extendJSON(join(targetPath, 'webapp/manifest.json'), {
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
                targetPath,
                {
                    target: 'TravelListReport',
                    key: 'CustomViewKey',
                    label: 'Custom View',
                    name: 'NewCustomView',
                    eventHandler: true
                },
                fs
            );
        });

        test('generateCustomAction in ListReport and ObjectPage', () => {
            generateCustomAction(
                targetPath,
                {
                    name: 'MyCustomAction',
                    target: {
                        page: 'TravelListReport',
                        control: TargetControl.table
                    },
                    settings: {
                        text: 'My Custom Action',
                        eventHandler: true
                    }
                },
                fs
            );
            generateCustomAction(
                targetPath,
                {
                    name: 'AnotherCustomAction',
                    target: {
                        page: 'TravelObjectPage',
                        control: TargetControl.header
                    },
                    settings: {
                        text: 'My other Action',
                        eventHandler: true
                    }
                },
                fs
            );
            // Generate custom action by appending existing file
            generateCustomAction(
                targetPath,
                {
                    name: 'AppendedAction',
                    target: {
                        page: 'TravelObjectPage',
                        control: TargetControl.header
                    },
                    settings: {
                        text: 'My other Action',
                        eventHandler: {
                            fileName: 'AnotherCustomAction',
                            fnName: 'OnAppendedFn',
                            insertScript: {
                                fragment: `,\n        OnAppendedFn: function() {\n            MessageToast.show("Custom handler invoked.");\n        }`,
                                position: {
                                    line: 8,
                                    character: 9
                                }
                            }
                        }
                    },
                    folder: join('ext', 'anotherCustomAction')
                },
                fs
            );
        });

        test('generateCustomSection in ObjectPage', () => {
            generateCustomSection(
                targetPath,
                {
                    name: 'MyCustomSection',
                    target: 'TravelObjectPage',
                    title: 'My Custom Section',
                    position: {
                        placement: Placement.After,
                        anchor: 'DummyFacet'
                    },
                    eventHandler: true
                },
                fs
            );
        });

        afterAll(() => {
            expect((fs as any).dump(targetPath, '**/test-output/*/webapp/{manifest.json,ext/**/*}')).toMatchSnapshot();
        });
    });
});
