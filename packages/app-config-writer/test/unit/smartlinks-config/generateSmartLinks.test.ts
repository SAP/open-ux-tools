import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import type { Editor } from 'mem-fs-editor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

jest.unstable_mockModule('chalk', () => ({
    default: chalk,
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s
}));

jest.unstable_mockModule('prompts', () => ({
    prompt: jest.fn(),
    inject: jest.fn()
}));

const createGetMock = jest.fn();
const mockCreateForAbap = jest.fn().mockImplementation(() => ({ get: createGetMock }));
const mockCreateForDestination = jest.fn().mockImplementation(() => ({ get: createGetMock }));

const actualAxiosExtension = await import('@sap-ux/axios-extension');
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    ...actualAxiosExtension,
    createForAbap: mockCreateForAbap,
    createForDestination: mockCreateForDestination
}));

const { generateSmartLinksConfig } = await import('../../../src');

describe('Test generateSmartLinksConfig', () => {
    const configMock = {
        target: { url: 'mockUrl', client: '000' },
        auth: { username: 'mockUser', password: 'mockPW' },
        ignoreCertErrors: true
    };
    const inboundTargetsMock = {
        'firstLink': {
            semanticObject: 'dummyObject',
            semanticAction: 'dummyAction',
            text: 'dummyTitle',
            formFactors: {
                desktop: true,
                tablet: true
            },
            signature: {
                additionalParameters: 'ignored'
            },
            applicationType: 'AA',
            url: '/sap/bc/gui/sap'
        }
    };
    const targetResponseMock = {
        status: 200,
        data: JSON.stringify({
            'version': '1.2.02',
            'targetMappings': inboundTargetsMock
        })
    };
    createGetMock.mockResolvedValue(targetResponseMock);

    test(`Add config to 'ui5-deploy.yaml' project`, async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        const fs = await generateSmartLinksConfig(basePath, configMock);
        expect(fs.readJSON(join(basePath, 'appconfig', 'fioriSandboxConfig.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });
    test(`Add config to project with existing smartlinks config`, async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-smartlinks-config');
        const fs = await generateSmartLinksConfig(basePath, configMock);
        expect(fs.readJSON(join(basePath, 'appconfig', 'fioriSandboxConfig.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });
    test(`No target response - Add config to project with existing smartlinks config`, async () => {
        createGetMock.mockResolvedValue({ status: 200, data: JSON.stringify({}) });
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        let fs: Editor | undefined;
        try {
            fs = await generateSmartLinksConfig(basePath, configMock);
            fail('Error should have been thrown');
        } catch (error) {
            expect((error as Error).message).toEqual(`No target definition found: ${configMock.target.url}.`);
            expect(fs?.readJSON(join(basePath, 'appconfig', 'fioriSandboxConfig.json'))).not.toBeDefined();
            expect(fs?.read(join(basePath, 'ui5.yaml'))).not.toBeDefined();
        }
    });
});
