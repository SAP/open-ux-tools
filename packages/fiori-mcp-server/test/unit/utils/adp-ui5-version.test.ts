import { jest } from '@jest/globals';
import { UI5Config } from '@sap-ux/ui5-config';

const actualAdpTooling = await import('@sap-ux/adp-tooling');
const mockReadUi5Config = jest.fn<typeof actualAdpTooling.readUi5Config>();
const mockIsCFEnvironment = jest.fn<typeof actualAdpTooling.isCFEnvironment>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...actualAdpTooling,
    readUi5Config: mockReadUi5Config,
    isCFEnvironment: mockIsCFEnvironment
}));

const { validateAdpUi5Version } = await import('../../../src/utils/utils.js');
const APP_PATH = '/project';

async function configureVersion(version?: string): Promise<void> {
    mockReadUi5Config.mockResolvedValue(
        await UI5Config.newInstance(
            JSON.stringify({
                server: {
                    customMiddleware: [
                        {
                            name: 'fiori-tools-proxy',
                            configuration: { ui5: { version } }
                        }
                    ]
                }
            })
        )
    );
}

describe('validateAdpUi5Version', () => {
    let originalSkipValidation: string | undefined;

    beforeEach(() => {
        originalSkipValidation = process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION;
        delete process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION;
        jest.resetAllMocks();
        mockIsCFEnvironment.mockResolvedValue(false);
    });

    afterEach(() => {
        if (originalSkipValidation === undefined) {
            delete process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION;
        } else {
            process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION = originalSkipValidation;
        }
    });

    test('accepts an unsupported version when validation is explicitly skipped', async () => {
        process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION = 'true';
        await configureVersion('1.153.0');

        await expect(validateAdpUi5Version(APP_PATH)).resolves.toBeUndefined();
    });

    test('does not require readable project configuration when validation is skipped', async () => {
        process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION = 'true';
        mockReadUi5Config.mockRejectedValue(new Error('Cannot read ui5.yaml'));

        await expect(validateAdpUi5Version(APP_PATH)).resolves.toBeUndefined();
        expect(mockReadUi5Config).not.toHaveBeenCalled();
        expect(mockIsCFEnvironment).not.toHaveBeenCalled();
    });

    test.each([undefined, 'false', '', '1', 'TRUE'])(
        'validates unsupported versions when the skip flag is %s',
        async (skipValidation) => {
            if (skipValidation !== undefined) {
                process.env.SAP_FIORI_MCP_SKIP_UI5_VERSION_VALIDATION = skipValidation;
            }
            await configureVersion('1.153.0');

            await expect(validateAdpUi5Version(APP_PATH)).rejects.toThrow('require SAPUI5 1.154.0 or newer');
        }
    );

    test.each([undefined, ''])('accepts an unset version %s for Cloud Foundry projects', async (version) => {
        await configureVersion(version);
        mockIsCFEnvironment.mockResolvedValue(true);

        await expect(validateAdpUi5Version(APP_PATH)).resolves.toBeUndefined();

        expect(mockIsCFEnvironment).toHaveBeenCalledWith(APP_PATH);
    });

    test('rejects an explicitly configured unsupported version for Cloud Foundry projects', async () => {
        await configureVersion('1.153.0');
        mockIsCFEnvironment.mockResolvedValue(true);

        await expect(validateAdpUi5Version(APP_PATH)).rejects.toThrow('require SAPUI5 1.154.0 or newer');
    });

    test.each([
        '1.154.0',
        '1.154.1',
        '1.155.0',
        '2.0.0',
        'snapshot',
        'snapshot-untested',
        '1.154.0-SNAPSHOT',
        '1.154.1-SNAPSHOT',
        '1.155.0-SNAPSHOT'
    ])('accepts supported version %s', async (version) => {
        await configureVersion(version);

        await expect(validateAdpUi5Version(APP_PATH)).resolves.toBeUndefined();

        expect(mockReadUi5Config).toHaveBeenCalledWith(APP_PATH, 'ui5.yaml');
    });

    test.each(['1.153.99', '1.96.0', '0.999.0', '1.153.0-SNAPSHOT', '', undefined])(
        'rejects unsupported or missing version %s',
        async (version) => {
            await configureVersion(version);

            await expect(validateAdpUi5Version(APP_PATH)).rejects.toThrow('require SAPUI5 1.154.0 or newer');
        }
    );

    test('reports a missing version when the proxy is not configured', async () => {
        mockReadUi5Config.mockResolvedValue(await UI5Config.newInstance('metadata:\n  name: test'));
        await expect(validateAdpUi5Version(APP_PATH)).rejects.toThrow('not configured');
    });

    test('propagates unreadable YAML errors', async () => {
        mockReadUi5Config.mockRejectedValue(new Error('Cannot read ui5.yaml'));
        await expect(validateAdpUi5Version(APP_PATH)).rejects.toThrow('Cannot read ui5.yaml');
    });
});
