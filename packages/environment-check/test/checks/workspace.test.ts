import { jest } from '@jest/globals';
import { join } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFindAllApps = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    findAllApps: mockFindAllApps
}));

const { FileName, Severity } = await import('../../src/types');
const { getDestinationsFromWorkspace } = await import('../../src/checks/workspace');

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
            `No destination defined for application: ${sampleAppNoUI5Yaml} - The application: ${sampleAppNoUI5Yaml} does not have a \`ui5.yaml\` file. Unable to retrieve the destinations.`
        );
        expect(noBackendMessage?.text).toMatch(`No destinations found in application: ${sampleAppNoBackend}.`);
        expect(noDestMessage?.text).toMatch(`No destinations found in application: ${sampleAppNoDest}.`);
    });
});
