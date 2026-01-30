import { SystemLookup } from '@sap-ux/adp-tooling';
import type { Endpoint } from '@sap-ux/adp-tooling';

import type { ExecuteFunctionalityInput } from '../../../../../src/types';
import executeFunctionality from '../../../../../src/tools/functionalities/list-systems/execute-functionality';

const mockGetSystems = jest.fn();

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    SystemLookup: jest.fn().mockImplementation(() => ({
        getSystems: mockGetSystems
    }))
}));

jest.mock('@sap-ux/logger', () => ({
    ...jest.requireActual('@sap-ux/logger'),
    ToolsLogger: jest.fn().mockImplementation(() => ({ debug: jest.fn(), error: jest.fn() }))
}));

describe('list-systems execute-functionality', () => {
    const mockAppPath = '/test/app/path';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should successfully list systems', async () => {
        const mockSystems: Endpoint[] = [
            { Name: 'SystemA', Client: '100', Url: '/systema', Authentication: 'NoAuthentication' },
            { Name: 'SystemB', Client: '200', Url: '/systemb', Authentication: 'Basic' },
            { Name: 'SystemC', Client: '300', Url: '/systemc', Authentication: 'Basic' }
        ];

        mockGetSystems.mockResolvedValue(mockSystems);

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'list-systems',
            parameters: {}
        };

        const result = await executeFunctionality(params);

        expect(SystemLookup).toHaveBeenCalled();
        expect(mockGetSystems).toHaveBeenCalled();
        expect(result).toMatchObject({
            functionalityId: 'list-systems',
            status: 'Success',
            appPath: mockAppPath,
            changes: []
        });
        expect(result.message).toContain('Found 3 system(s)');
        expect(result.message).toContain('SystemA');
        expect(result.message).toContain('SystemB');
        expect(result.message).toContain('SystemC');
        expect(result.message).toContain('"name": "SystemA"');
        expect(result.message).toContain('"client": "100"');
        expect(result.timestamp).toBeDefined();
    });

    test('should handle systems without client', async () => {
        const mockSystems: Endpoint[] = [
            { Name: 'SystemA', Client: '', Url: '/systema', Authentication: 'NoAuthentication' }
        ];

        mockGetSystems.mockResolvedValue(mockSystems);

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'list-systems',
            parameters: {}
        };

        const result = await executeFunctionality(params);

        expect(result.status).toBe('Success');
        expect(result.message).toContain('SystemA');
        // Client should be undefined or empty in the JSON
        const messageJson = result.message.match(/\[[\s\S]*\]/)?.[0];
        if (messageJson) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsed: Array<{ name: string; client?: string }> = JSON.parse(messageJson);
            expect(parsed[0].name).toBe('SystemA');
            // Client may be undefined or empty string
            expect(parsed[0].client === '' || parsed[0].client === undefined).toBe(true);
        }
    });

    test('should handle empty systems list', async () => {
        mockGetSystems.mockResolvedValue([]);

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'list-systems',
            parameters: {}
        };

        const result = await executeFunctionality(params);

        expect(result.status).toBe('Success');
        expect(result.message).toContain('Found 0 system(s)');
        expect(result.message).toContain('[]');
    });

    test('should handle error from SystemLookup.getSystems', async () => {
        const errorMessage = 'Failed to retrieve systems';
        mockGetSystems.mockRejectedValue(new Error(errorMessage));

        const params: ExecuteFunctionalityInput = {
            appPath: mockAppPath,
            functionalityId: 'list-systems',
            parameters: {}
        };

        const result = await executeFunctionality(params);

        expect(result.status).toBe('Error');
        expect(result.message).toContain('Error listing systems');
        expect(result.message).toContain(errorMessage);
        expect(result.appPath).toBe(mockAppPath);
        expect(result.timestamp).toBeDefined();
    });
});
