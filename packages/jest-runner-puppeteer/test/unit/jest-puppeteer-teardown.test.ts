import Teardown from '../../src/jest-puppeteer-teardown';

const chalkGreenMock = jest.fn();

jest.mock('chalk', () => ({
    green: (...args: any) => chalkGreenMock(...args)
}));

const syncMock = jest.fn();

jest.mock('rimraf', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('rimraf') as object),
    sync: (...args: any) => syncMock(...args)
}));

describe('Puppeteer teardown', () => {
    test('teardown function', async () => {
        const globalAny: any = global;

        const __BROWSER_GLOBAL__ = {
            close: jest.fn()
        };
        globalAny.__BROWSER_GLOBAL__ = __BROWSER_GLOBAL__;

        await Teardown();

        expect(chalkGreenMock).toBeCalledWith('Teardown Puppeteer');
        expect(syncMock).toBeCalledTimes(1);
    });
});
