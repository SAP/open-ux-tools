import { FreestyleApp, generate } from '../src';
import { join } from 'path';
import { TemplateType, OdataService, BootstrapSrc } from '@sap/open-ux-tools-types';
import { rmdirSync } from 'fs';
import { sample } from './sample/metadata';
import { testOutputDir, debug, northwind } from './common';

const TEST_NAME = 'allTemplate';

describe(`Fiori freestyle templates: ${TEST_NAME}`, () => {
    const curTestOutPath = join(testOutputDir, TEST_NAME);

    // eslint-disable-next-line no-console
    if (debug) {
        console.log(testOutputDir);
    }

    const commonConfig = {
        app: {
            id: 'test.me',
            title: 'My Test App',
            description: 'Test App Description',
            flpAppId: 'testme-app'
        },
        package: {
            name: 'test.me'
        },
        ui5: {
            localVersion: '1.90.0',
            version: '', // I.e Latest
            ui5Theme: 'sap_fiori_3',
            ui5Libs: 'sap.m,sap.ushell'
        }
    };

    const northwindV2Metadata: OdataService = Object.assign(northwind, { metadata: sample.NorthwindV2 });

    const configuration: Array<{ name: string; config: FreestyleApp<any> }> = [
        {
            name: 'listdetail',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
                template: {
                    type: TemplateType.ListDetail,
                    settings: {
                        entity: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        },
                        lineItem: { name: 'Products' }
                    }
                }
            }
        },
        {
            name: 'worklist',
            config: {
                ...commonConfig,
                service: northwindV2Metadata,
                template: {
                    type: TemplateType.Worklist,
                    settings: {
                        entity: {
                            name: 'Products',
                            key: 'ProductID',
                            idProperty: 'ProductName',
                            numberProperty: 'UnitsInStock',
                            unitOfMeasureProperty: 'QuantityPerUnit'
                        }
                    }
                }
            }
        }
    ];

    beforeAll(() => {
        rmdirSync(curTestOutPath, { recursive: true });
    });

    test.each(configuration)('Generate files for template: $name', async ({ name, config }) => {
        const testPath = join(curTestOutPath, name);
        const fs = await generate(testPath, config);
        expect((fs as any).dump(testPath)).toMatchSnapshot();
        // write out the files for debugging
        return new Promise((resolve) => {
            fs.commit(resolve);
        });
    });

    describe("set view-and controller-name at scaffolding time", () => {
        const viewPrefix = "MainView"
        const contollerPrefix = "MainView" // well...
        const FreestyleApp: FreestyleApp<any> = {
            app: {
                id: "someId",
            },
            ui5: {
                initialViewName: viewPrefix,
                initialControllerName: contollerPrefix
            },
            package: {
                name: "someId",
            },
            template: {
                type: TemplateType.Basic,
                settings: {}
            }
        }

        test("initial view- and controller-name can be adjusted by configuration", async () => {
            const testPath = join(curTestOutPath, "initViewAndController")
            const fs = await generate(testPath, FreestyleApp)
            expect(fs.exists(join(testPath, "webapp", "view", `${viewPrefix}.view.xml`))).toBeTruthy()
            expect(fs.exists(join(testPath, "webapp", "controller", `${contollerPrefix}.controller.js`))).toBeTruthy()
        })

        test("manifest.json adheres to view-/controller-name set at scaffolding time", async () => {
            const testPath = join(curTestOutPath, "mainfestJson")
            const fs = await generate(testPath, FreestyleApp)
            const manifest = { json: fs.readJSON(join(testPath, "webapp", "manifest.json")) as any }
            expect(
                [
                    manifest.json["sap.ui5"].rootView.viewName,
                    manifest.json["sap.ui5"].rootView.id,
                    manifest.json["sap.ui5"].routing.routes[0].name,
                    manifest.json["sap.ui5"].routing.routes[0].pattern,
                    manifest.json["sap.ui5"].routing.routes[0].target[0],
                    manifest.json["sap.ui5"].routing.targets[`Target${viewPrefix}`].viewId,
                    manifest.json["sap.ui5"].routing.targets[`Target${viewPrefix}`].viewName,
                ].every(entry => entry.includes(viewPrefix))
            ).toBeTruthy()
        })
    })


    describe("index.html UI5 bootstrap location can be set dynamically", () => {
        const FreestyleApp: FreestyleApp<any> = {
            app: {
                id: "someId",
            },
            package: {
                name: "someId",
            },
            template: {
                type: TemplateType.Basic,
                settings: {}
            }
        }

        const testData = [
            [BootstrapSrc.CdnOpenUI5, { ...FreestyleApp, ui5: { bootstrapSrc: BootstrapSrc.CdnOpenUI5 } } as FreestyleApp<any>, "https://openui5.hana.ondemand.com/resources/sap-ui-core.js"],
            [BootstrapSrc.CdnSAPUI5, { ...FreestyleApp, ui5: { bootstrapSrc: BootstrapSrc.CdnSAPUI5 } } as FreestyleApp<any>, "https://sapui5.hana.ondemand.com/resources/sap-ui-core.js"],
            [BootstrapSrc.Local, { ...FreestyleApp, ui5: { bootstrapSrc: BootstrapSrc.Local } } as FreestyleApp<any>, "resources/sap-ui-core.js"],
        ]

        test.each(testData)("%s", async (_, appConfig, expectation) => {
            const testPath = join(curTestOutPath, Date.now().toString())
            const fs = await generate(testPath, appConfig as FreestyleApp<any>)
            const index = { html: fs.read(join(testPath, "webapp", "index.html")) }
            expect(index.html).toContain(expectation)
        })
    })

});
