import { jest } from '@jest/globals';
import { createRequire } from 'node:module';
import type { DeployConfigOptions } from '../../src/types';

const require = createRequire(import.meta.url);

const mockHasbinSync = jest.fn();
const mockExistsSync = jest.fn().mockReturnValue(true);

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: mockHasbinSync },
    sync: mockHasbinSync
}));

jest.unstable_mockModule('node:fs', () => {
    const actual = require('node:fs');
    return {
        __esModule: true,
        default: actual,
        ...actual,
        existsSync: mockExistsSync
    };
});

const { getYUIDetails, parseTarget } = await import('../../src/app/utils');
const { isMTAInstalled, getEnvApiHubConfig } = await import('../../src/utils');

describe('Test utils - Deploy', () => {
    beforeEach(() => {});

    beforeAll(() => {
        jest.clearAllMocks();
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
        mockHasbinSync.mockReturnValue(false);
        expect(isMTAInstalled('cf', '')).toEqual('errors.noBinary');
        expect(isMTAInstalled('InvalidParam', '')).toEqual(true);
        expect(isMTAInstalled('abap', '')).toEqual('errors.noBinary');
    });

    it('Validate isMTAInstalled with installed mta', () => {
        mockHasbinSync.mockReturnValue(true);
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

    it('should return prompt step details for yui usage', () => {
        const yuiDetails = getYUIDetails('/path/to/app/project1');
        expect(yuiDetails).toHaveLength(1);
        expect(yuiDetails[0].name).toEqual('Deployment Configuration');
        expect(yuiDetails[0].description).toEqual('Configure Deployment settings - project1');
    });
});
