import { getAdpProjectData } from '../../../src/base/workspace';

import type * as fs from 'fs';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getAdpConfig, getProxyConfig, getVariant } from '../../../src/base/helper';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('@sap-ux/btp-utils');
jest.mock('../../../src/base/helper', () => ({
    ...jest.requireActual('../../../src/base/helper'),
    getAdpConfig: jest.fn(),
    getProxyConfig: jest.fn(),
    getVariant: jest.fn()
}));

const isAppStudioMock = isAppStudio as jest.MockedFunction<typeof isAppStudio>;
const getAdpConfigMock = getAdpConfig as jest.MockedFunction<typeof getAdpConfig>;
const getProxyConfigMock = getProxyConfig as jest.MockedFunction<typeof getProxyConfig>;
const getVariantMock = getVariant as jest.MockedFunction<typeof getVariant>;

const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;
const readFileSyncMock = readFileSync as jest.MockedFunction<typeof readFileSync>;

const fixtureRoot = path.resolve(__dirname, '../../fixtures/adaptation-project');
const variantPath = path.join(fixtureRoot, 'webapp', 'manifest.appdescr_variant');
const variantContent = JSON.parse(jest.requireActual('fs').readFileSync(variantPath, 'utf-8'));

describe('getAdpProjectData', () => {
    const projectPath = fixtureRoot;

    beforeEach(() => {
        jest.resetAllMocks();
        getVariantMock.mockResolvedValue(variantContent);
        existsSyncMock.mockReturnValue(false);
        readFileSyncMock.mockReturnValue('');
    });

    it('returns data for legacy BAS project (.adp/config.json)', async () => {
        existsSyncMock.mockImplementation((filePath: fs.PathLike) => {
            return typeof filePath === 'string' && filePath.includes('.adp/config.json');
        });
        readFileSyncMock.mockImplementation((filePath: fs.PathLike | number) => {
            if (typeof filePath === 'string' && filePath.includes('manifest.appdescr_variant')) {
                return JSON.stringify(variantContent);
            }
            return JSON.stringify({
                appvariant: 'App',
                environment: 'ABAP',
                sourceSystem: 'SYS',
                ui5Version: '1.110.0'
            });
        });

        const data = await getAdpProjectData(projectPath);

        expect(data.name).toBe('App');
        expect(data.namespace).toBe(variantContent.namespace);
        expect(getVariant).toHaveBeenCalled();
        expect(getAdpConfig).not.toHaveBeenCalled();
    });

    it('returns data for ui5.yaml-based project (App Studio)', async () => {
        // arrange – config.json missing, ui5.yaml present
        existsSyncMock.mockImplementation((filePath: fs.PathLike) => {
            return typeof filePath === 'string' && filePath.endsWith('ui5.yaml');
        });
        readFileSyncMock.mockImplementation((filePath: fs.PathLike | number) => {
            if (typeof filePath === 'string' && filePath.includes('manifest.appdescr_variant')) {
                return JSON.stringify(variantContent);
            }
            return '';
        });

        getProxyConfigMock.mockResolvedValue({ ui5: { version: '1.112.1' } } as any);
        getAdpConfigMock.mockResolvedValue({
            target: {
                client: '001',
                destination: 'DEST',
                url: 'https://host',
                authenticationType: 'Basic'
            }
        } as any);
        isAppStudioMock.mockReturnValue(true);

        const data = await getAdpProjectData(projectPath);

        expect(data.ui5Version).toBe('1.112.1');
        expect(data.sourceSystem).toBe('DEST');
    });

    it('throws when ui5.yaml is missing', async () => {
        existsSyncMock.mockReturnValue(false);
        await expect(getAdpProjectData(projectPath)).rejects.toThrow('Missing ui5.yaml');
    });
});
