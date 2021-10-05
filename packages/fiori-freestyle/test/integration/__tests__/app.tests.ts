import { mkdirSync } from 'fs';
import { removeSync } from 'fs-extra';

const path = require('path');

const host = 'http://localhost';
const reportDir = path.join(__dirname, 'screenshots');

interface AppConfig {
    name: string;
    appId: string;
    listSelectorKey: string | undefined;
    selectorKey: string;
    listPageTitle: string | RegExp;
    title: string;
    url: string;
}

const checkApp = async (config: AppConfig) => {
	await page.goto(config.url, {
		waitUntil: 'load',
		// Remove the timeout
		timeout: 0
	});

    try {
        const selector = await page.waitForSelector(config.selectorKey, { visible: true, timeout: 40000 });
        expect(selector).toBeDefined();

			// if (config.listSelectorKey) {
			//     const listSelector = await page.waitForSelector(config.listSelectorKey, { visible: true, timeout: 40000 });
			//     expect(listSelector).toBeDefined();
			// }
    } catch (e) {
        await page.screenshot({
            path: path.join(
                reportDir,
                // remove http(s)://
                `${config.url
                    .replace(/(^\w+:|^)\/\//, '')
                    .replace(/\//g, '_')
                    .replace(/\./g, '_')}_${config.name.replace('', '_')}.png`
            )
        });
        throw e;
    }
    await expect(page).toMatchElement(config.selectorKey, {
        text: config.listPageTitle
    });
    await expect(page.title()).resolves.toMatch(config.title);
};

jest.setTimeout(200000);
describe('Fiori Freestyle integration tests', () => {
    beforeAll(() => {
				removeSync(reportDir);
        mkdirSync(reportDir);
    });
    describe('allTemplate/listdetail', () => {
        test('npm run start - allTemplate/listdetail - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0-titleText-inner"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:4000/test/flpSandbox.html#testme-app`
            });
        });
        test('npm run start-noflp - allTemplate/listdetail - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="container-test.me---list--listPageTitle-inner"]',
                listPageTitle: /Products /,
                title: 'My Test App',
                url: `${host}:4000/index.html`
            });
        });
        test('npm run start-local - allTemplate/listdetail- should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0-titleText-inner"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Products /,
                title: 'My Test App',
                url: `${host}:4001/test/flpSandbox.html#testme-app`
            });
        });
        // Failing due bug in mockserver
        test.skip('npm run start-mock - allTemplate/listdetail - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-mock',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0-titleText-inner"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Products /,
                title: 'My Test App',
                url: `${host}:4002/test/flpSandbox.html#testme-app`
            });
        });
    });

    describe('allTemplate/worklist', () => {
        test('npm run start - allTemplate/worklist - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-testme-app-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:4003/test/flpSandbox.html#testme-app`
            });
        });
        test('npm run start-noflp - allTemplate/worklist - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="container-test.me---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:4003/index.html`
            });
        });
        test('npm run start-local - allTemplate/worklist- should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-testme-app-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:4004/test/flpSandbox.html#testme-app`
            });
        });
        // Failing due to bug in mocksever
        test.skip('npm run start-mock - allTemplate/worklist - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-mock',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-testme-app-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:4005/test/flpSandbox.html#testme-app`
            });
        });
    });

    describe('basicTemplate/basic_no_datasource', () => {
        test('npm run start - basicTemplate/basic_no_datasource - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: undefined,
                selectorKey: '[id="application-nods1-tile-component---View1--page-title"]',
                listPageTitle: /App Title/,
                title: 'App Title',
                url: `${host}:4006/test/flpSandbox.html#nods1-tile`
            });
        });
        test('npm run start-noflp - basicTemplate/basic_no_datasource - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: undefined,
                selectorKey: '[id="container-nods1---View1--page-title-inner"]',
                listPageTitle: /App Title/,
                title: 'App Title',
                url: `${host}:4006/index.html`
            });
        });
        test('npm run start-local - basicTemplate/basic_no_datasource - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: undefined,
                selectorKey: '[id="application-nods1-tile-component---View1--page-title"]',
                listPageTitle: /App Title/,
                title: 'App Title',
                url: `${host}:4007/test/flpSandbox.html#nods1-tile`
            });
        });
        // no service === no mock
    });

    // listDetailTemplate/listdetail-good
    describe('listDetailTemplate/listdetail-good', () => {
        test('npm run start - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:4009/test/flpSandbox.html#testme-app`
            });
        });
        test('npm run start-noflp - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="container-test.me---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:4009/index.html`
            });
        });
        test('npm run start-local - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:4010/test/flpSandbox.html#testme-app`
            });
        });

        // Failing due to mockserver bug
        // "HTTP request failed",
        // 	"headers": \{},
        // 	"statusCode": "500",
        // 	"statusText": "Internal Server Error",
        // 	"responseText": "Cannot read property 'forEach' of undefined\r\n"
        // }
        test.skip('npm run start-mock - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-mock',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:4011/test/flpSandbox.html#testme-app`
            });
        });
    });

    // worklistTemplate/worklist_service_url_v2
    describe('worklistTemplate/worklist_service_url_v2', () => {
        test('npm run start - worklistTemplate/worklist_service_url_v2 - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:4012/test/flpSandbox.html#wrk1-tile`
            });
        });
        test('npm run start-noflp - worklistTemplate/worklist_service_url_v2 - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="container-wrk1---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:4012/index.html`
            });
        });
        test('npm run start-local - worklistTemplate/worklist_service_url_v2- should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-local',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:4013/test/flpSandbox.html#wrk1-tile`
            });
        });
        test('npm run start-mock - worklistTemplate/worklist_service_url_v2 - should display Fiori page', async () => {
            await checkApp({
                name: 'npm run start-mock',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:4014/test/flpSandbox.html#wrk1-tile`
            });
        });
    });


	// worklistTemplate/worklist_service_url_v4
	describe('worklistTemplate/worklist_service_url_v4', () => {
    // skipped as no url currently
		test.skip('npm run start - worklistTemplate/worklist_service_url_v4 - should display Fiori page', async () => {
			await checkApp({
				name: 'npm run start',
				appId: 'wrk1',
				listSelectorKey: '[id="__item2-__clone0"]',
				selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
				listPageTitle: /Products/,
				title: 'App Title',
				url: `${host}:4015/test/flpSandbox.html#wrk1-tile`
			});
		});
		// skipped as no url currently
		test.skip('npm run start-noflp - worklistTemplate/worklist_service_url_v4 - should display Fiori page', async () => {
			await checkApp({
				name: 'npm run start-noflp',
				appId: 'wrk1',
				listSelectorKey: '[id="__item2-__clone0"]',
				selectorKey: '[id="container-wrk1---worklist--tableHeader-inner"]',
				listPageTitle: /Products/,
				title: 'App Title',
				url: `${host}:4015/index.html`
			});
		});
		// skipped as no url currently
		test.skip('npm run start-local - worklistTemplate/worklist_service_url_v4- should display Fiori page', async () => {
			await checkApp({
				name: 'npm run start-local',
				appId: 'wrk1',

				listSelectorKey: '[id="__item2-__clone0"]',
				selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
				listPageTitle: /Products/,
				title: 'App Title',
				url: `${host}:4016/test/flpSandbox.html#wrk1-tile`
			});
		});
		test('npm run start-mock - worklistTemplate/worklist_service_url_v4 - should display Fiori page', async () => {
			await checkApp({
				name: 'npm run start-mock',
				appId: 'wrk1',
				listSelectorKey: '[id="__item2-__clone0"]',
				selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
				listPageTitle: /Products/,
				title: 'App Title',
				url: `${host}:4017/test/flpSandbox.html#wrk1-tile`
			});
		});
	});


	// worklistTemplate/worklist_metadata_v4
	describe('worklistTemplate/worklist_metadata_v4', () => {
		test('npm run start-mock - worklistTemplate/worklist_metadata_v4 - should display Fiori page', async () => {
			await checkApp({
				name: 'npm run start-mock',
				appId: 'wrk1',
				listSelectorKey: '[id="__item2-__clone0"]',
				selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
				listPageTitle: /SalesOrderItem/,
				title: 'App Title',
				url: `${host}:4018/test/flpSandbox.html#wrk1-tile`
			});
		});
	});
});
