import { jest } from '@jest/globals';

const mockReadUi5Config = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config
}));

const mockCreateAbapServiceProvider = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

const actualUtils = await import('../../../../src/utils/index.js');
jest.unstable_mockModule('../../../../src/utils', () => ({
    ...actualUtils,
    logger: {
        ...actualUtils.logger,
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

const { getProvider } = await import('../../../../src/tools/services/abap-context.js');

function makeFakeUi5Config(middlewareResult: unknown) {
    return {
        findCustomMiddleware: jest.fn<any>().mockReturnValue(middlewareResult)
    };
}

describe('getProvider (abap-context)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateAbapServiceProvider.mockReturnValue({ isAbapCloud: jest.fn() });
    });

    test('extracts url and client from fiori-tools-preview middleware and creates provider', async () => {
        mockReadUi5Config.mockResolvedValue(
            makeFakeUi5Config({ configuration: { adp: { target: { url: 'http://myhost', client: '100' } } } })
        );

        await getProvider('/app/path');

        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            { url: 'http://myhost', client: '100' },
            { ignoreCertErrors: false },
            false,
            expect.anything()
        );
    });

    test('defaults url and client to empty strings when middleware returns undefined', async () => {
        mockReadUi5Config.mockResolvedValue(makeFakeUi5Config(undefined));

        await getProvider('/app/path');

        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            { url: '', client: '' },
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    test('defaults url and client to empty strings when adp key is missing from configuration', async () => {
        mockReadUi5Config.mockResolvedValue(makeFakeUi5Config({ configuration: {} }));

        await getProvider('/app/path');

        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            { url: '', client: '' },
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });
});
