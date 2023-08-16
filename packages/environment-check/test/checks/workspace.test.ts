import { FileName, Severity } from '../../src/types';
import { join } from 'path';
import { getDestinationsFromWorkspace } from '../../src/checks/workspace';
import { findAllApps } from '@sap-ux/project-access';

jest.mock('@sap-ux/project-access', () => ({
    findAllApps: jest.fn()
}));
const mockFindAllApps = findAllApps as jest.Mock;

jest.mock('fs', () => {
    const fs = jest.requireActual('fs');
    return fs;
});

describe('Test for getDestinationsFromWorkspace()', () => {
    const sampleWorkspace = join(__dirname, '..', 'sample-workspace');
    const sampleAppA = join(sampleWorkspace, 'sample-app-A');
    const sampleAppB = join(sampleWorkspace, 'sample-app-B');
    const sampleAppNoUI5Yaml = join(sampleWorkspace, 'sample-app-NO_UI5_YAML');
    const sampleAppNoBackend = join(sampleWorkspace, 'sample-app-NO_BACKEND');
    const sampleAppNoDest = join(sampleWorkspace, 'sample-app-NO_DEST');

    test('Test destinations recieved from sample-workspace using getDestinationsFromWorkspace()', async () => {
        // Mock setup
        const wsFolders = [sampleWorkspace];
        mockFindAllApps.mockImplementationOnce(() => {
            return [
                {
                    appRoot: sampleAppA
                },
                {
                    appRoot: sampleAppB
                },
                {
                    appRoot: sampleAppNoUI5Yaml
                },
                {
                    appRoot: sampleAppNoBackend
                },
                {
                    appRoot: sampleAppNoDest
                }
            ];
        });

        // Test execution
        const result = await getDestinationsFromWorkspace(wsFolders);
        const noUI5YamlMessage = result.messages.find(
            (msg) => msg.severity === Severity.Debug && msg.text.includes(FileName.Ui5Yaml)
        );
        const noBackendMessage = result.messages.find(
            (msg) => msg.severity === Severity.Debug && msg.text.includes('NO_BACKEND')
        );
        const noDestMessage = result.messages.find(
            (msg) => msg.severity === Severity.Debug && msg.text.includes('NO_DEST')
        );
        // Result check
        expect(result.destinations.sort()).toEqual(['TEST_DEST_A', 'TEST_DEST_B1', 'TEST_DEST_B2']);
        expect(noUI5YamlMessage?.text).toMatch(
            `No destination defined for app ${sampleAppNoUI5Yaml} : App ${sampleAppNoUI5Yaml} has no ui5.yaml. Not able to get destinations`
        );
        expect(noBackendMessage?.text).toMatch(`No destinations found in app ${sampleAppNoBackend}`);
        expect(noDestMessage?.text).toMatch(`No destinations found in app ${sampleAppNoDest}`);
    });
});
