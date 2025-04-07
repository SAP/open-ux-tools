import yeomanTest from 'yeoman-test';
import { AppWizard } from '@sap-devx/yeoman-ui-types';
import { join } from 'path';
import BspAppDownloadGenerator from '../src/app';
import * as prompts from '../src/prompts/prompts';
import type { BspAppDownloadQuestions } from '../src/app/types';
import { PromptNames } from '../src/app/types';
import { readManifest } from '../src/utils/file-helpers';
import fs from 'fs';
import { getAppConfig } from '../src/app/config';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { adtSourceTemplateId } from '../src/utils/constants';

jest.mock('../src/utils/file-helpers');
jest.mock('../src/app/config');

describe('BSP App Download', () => {
	const bspAppDownloadGenPath = join(__dirname, '../src/app/index.ts');
    afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
		jest.resetModules();
	})

	beforeEach(() => {
		const promptSpy = jest.spyOn(prompts, 'getPrompts').mockResolvedValue([
                {
                    type: 'list',
                    name: PromptNames.systemSelection,
                    message: 'Select a system',
                    choices: [
                        { name: 'system1', value: 'system1' },
                        { name: 'system2', value: 'system2' },
                        { name: 'system3', value: 'system3' }
                    ]
                }, 
				{
					type: 'list',
					name: PromptNames.selectedApp,
					message: 'Select an app',
					choices: [
						{ name: 'App 1', value: { appId: 'app-1', title: 'App 1', description: 'App 1 description', repoName: 'app-1-repo', url: 'url-1' } },
						{ name: 'App 2', value: { appId: 'app-2', title: 'App 2', description: 'App 2 description', repoName: 'app-2-repo', url: 'url-2' } }
					]
				}, 
				{
					type: 'input',
					name: PromptNames.targetFolder,
					message: 'Enter the target folder',
					default: 'target-folder'
				}
			] as any
		);
	});

    test('run bsp app download', async () => {

		const metadata = fs.readFileSync(join(__dirname, 'fixtures', 'metadata.xml'), 'utf8');
        // const appWizard: Partial<AppWizard> = {
		// 	setHeaderTitle: jest.fn(),
		// 	showWarning: jest.fn(),
		// 	showError: jest.fn(),
		// 	showInformation: jest.fn()
		// };
		const appConfig: FioriElementsApp<LROPSettings> = {
            app: {
                id: 'app-1',
                title: 'App 1',
                description: 'App 1 description',
                sourceTemplate: {
                    id: adtSourceTemplateId
                },
                projectType: 'EDMXBackend',
                flpAppId: `app-1-tile`
            },
            package: {
                name: 'app-1',
                description: 'App 1 description',
                devDependencies: {},
                scripts: {},
                version: '0.0.1'
            },
            template: {
                type: TemplateType.ListReportObjectPage,
                settings: {
                    entityConfig: {
						mainEntityName: 'Booking'
					}
                }
            },
            service: {
                path: '/sap/opu/odata4/sap/zsb_travel_draft/srvd/dmo/ui_travel_d_d/0001/',
                version: OdataVersion.v4,
                metadata: metadata,
                url: 'url-1'
            },
            appOptions: {
                addAnnotations: true,
                addTests: true
            },
            ui5: {
                version: '1.88.0'
            }
        };
		
		
		// (readManifest as jest.Mock).mockReturnValue({
		// 	'sap.app': {
		// 		sourceTemplate: {
		// 			id: 'id'
		// 		}, 
		// 		dataSources: {
		// 			mainService: {
		// 				uri: "/sap/opu/odata4/sap/zsb_travel_draft/srvd/dmo/ui_travel_d_d/0001/",
		// 				type: "OData",
		// 				settings: {
		// 					odataVersion: "4.0"
		// 				}
		// 			}
		// 		}
		// 	}
		// })
		(getAppConfig as jest.Mock).mockResolvedValue(appConfig);
		await yeomanTest
		.run(BspAppDownloadGenerator, { 
			resolved: bspAppDownloadGenPath
		})
		.cd('.')
		.withPrompts({
			systemSelection: 'system3',
			selectedApp: {
				appId: 'app-1',
				title: 'App 1',
				description: 'App 1 description',
				repoName: 'app-1-repo',
				url: 'url-1'
			},
			targetFolder: 'target-folder'
		})
    });
});

//index.ts                     |   58.02 |    32.25 |   33.33 |   58.02 | 120-125,155-320    