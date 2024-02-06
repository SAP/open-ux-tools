import Setup from '../../src/jest-puppeteer-setup';
import puppeteer from 'puppeteer-core';

const chalkGreenMock = jest.fn();

jest.mock('chalk', () => ({
    green: (...args: any) => chalkGreenMock(...args)
}));

const writeFileSyncMock = jest.fn();

jest.mock('fs', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('fs') as object),
    writeFileSync: (...args: any) => writeFileSyncMock(...args)
}));

describe('Puppeteer setup', () => {
    let e2eBrowserEnv: string | undefined;
    let puppeteerHeadlessEnv: string | undefined;
    beforeAll(() => {
        require('../../src/jest-circus.setup');
        e2eBrowserEnv = process.env.E2E_BROWSER;
        puppeteerHeadlessEnv = process.env.PUPPETEER_HEADLESS;
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        process.env.E2E_BROWSER = e2eBrowserEnv;
        process.env.PUPPETEER_HEADLESS = puppeteerHeadlessEnv;
    });

    test('setup function (chrome)', async () => {
        process.env.PUPPETEER_HEADLESS = 'true';
        process.env.E2E_BROWSER = 'chrome';
        const browserMock = {
            version: jest.fn(),
            wsEndpoint: jest.fn()
        };
        jest.spyOn(puppeteer, 'launch').mockReturnValue(browserMock);

        await Setup();

        expect(chalkGreenMock).toBeCalledWith(
            'Running Puppeteer in headless mode. Set PUPPETEER_HEADLESS to toggle it...'
        );
        expect(writeFileSyncMock).toBeCalledTimes(1);
    });

    test('setup function (edge)', async () => {
        process.env.PUPPETEER_HEADLESS = 'false';
        process.env.E2E_BROWSER = 'edge';
        const browserMock = {
            version: jest.fn(),
            wsEndpoint: jest.fn()
        };
        jest.spyOn(puppeteer, 'launch').mockReturnValue(browserMock);

        await Setup();

        expect(chalkGreenMock).toBeCalledWith('Running Puppeteer...');
        expect(writeFileSyncMock).toBeCalledTimes(1);
    });

    test('setup function (error)', async () => {
        process.env.E2E_BROWSER = 'firefox';
        const browserMock = {
            version: jest.fn(),
            wsEndpoint: jest.fn()
        };
        jest.spyOn(puppeteer, 'launch').mockReturnValue(browserMock);

        await expect(Setup()).rejects.toThrowError('Unrecognized browser name set to E2E_BROWSER env variable!');
    });

    test('setup function (browser undefined)', async () => {
        delete process.env.E2E_BROWSER;
        const browserMock = {
            version: jest.fn(),
            wsEndpoint: jest.fn()
        };
        jest.spyOn(puppeteer, 'launch').mockReturnValue(browserMock);

        await Setup();

        expect(writeFileSyncMock).toBeCalledTimes(1);
    });
});
