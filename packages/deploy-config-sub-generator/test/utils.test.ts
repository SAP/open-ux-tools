import { parseTarget } from '../src/app/utils';
import { isMTAInstalled, getEnvApiHubConfig } from '../src/utils';
import type { DeployConfigOptions } from '../src/types';
import hasbin from 'hasbin';
import mockFs from 'fs';

jest.mock('fs');

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

const hasbinSyncMock = hasbin.sync as jest.MockedFunction<typeof hasbin.sync>;

describe('Test utils - Deploy', () => {
    beforeEach(() => {});

    beforeAll(() => {
        jest.clearAllMocks();
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    test('parseTarget', () => {
        expect(parseTarget('HelloWorld', {} as DeployConfigOptions)).toEqual('HelloWorld');
        expect(parseTarget(['HelloWorld'], {} as DeployConfigOptions)).toEqual('HelloWorld');
        expect(parseTarget([], { target: 'HelloTarget' } as DeployConfigOptions)).toEqual('HelloTarget');
    });

    it('Validate isMTAInstalled with missing mta', () => {
        hasbinSyncMock.mockReturnValue(false);
        expect(isMTAInstalled('cf', '')).toEqual(' ');
        expect(isMTAInstalled('InvalidParam', '')).toEqual(true);
        expect(isMTAInstalled('abap', '')).toEqual(' ');
    });

    it('Validate isMTAInstalled with installed mta', () => {
        hasbinSyncMock.mockReturnValue(true);
        expect(isMTAInstalled('cf', '')).toEqual(true);
        expect(isMTAInstalled('InvalidParam', '')).toEqual(true);
        expect(isMTAInstalled('abap', '')).toEqual(true);
    });

    it('Validate getEnvApiHubConfig', () => {
        process.env['API_HUB_API_KEY'] = 'ApiKey';
        process.env['API_HUB_TYPE'] = 'ApiType';
        expect(getEnvApiHubConfig()).toMatchObject({
            apiHubKey: 'ApiKey',
            apiHubType: 'API_HUB'
        });
        delete process.env['API_HUB_API_KEY'];
        delete process.env['API_HUB_TYPE'];
        expect(getEnvApiHubConfig()).toBeUndefined();
    });
});
