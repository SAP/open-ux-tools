import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { createForAbap, createForDestination } from '@sap-ux/axios-extension';
import { generateSmartLinksConfig } from '../../../src';
import { t } from '../../../src/i18n';
import type { TargetConfig } from '../../../src/types';

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    createForAbap: jest.fn(),
    createForDestination: jest.fn()
}));
const createGetMock = jest.fn();
const createForAbapMock = createForAbap as jest.Mock;
const createForDestinationMock = createForDestination as jest.Mock;

createForAbapMock.mockImplementation(() => ({ get: createGetMock }));
createForDestinationMock.mockImplementation(() => ({ get: createGetMock }));

describe('Test generateSmartLinksConfig', () => {
    const configMock: TargetConfig = {
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
        createGetMock.mockResolvedValue({ data: JSON.stringify({}) });
        const basePath = join(__dirname, '../../fixtures/ui5-deploy-config');
        let fs: Editor | undefined;
        try {
            fs = await generateSmartLinksConfig(basePath, configMock);
            fail('Error should have been thrown');
        } catch (error) {
            expect(error.message).toEqual(`No target definition found: ${configMock.target.url}.`);
            expect(fs?.readJSON(join(basePath, 'appconfig', 'fioriSandboxConfig.json'))).not.toBeDefined();
            expect(fs?.read(join(basePath, 'ui5.yaml'))).not.toBeDefined();
        }
    });
});
