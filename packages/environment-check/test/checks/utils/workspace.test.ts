import { FileName, Severity } from '../../../src/types';
import { join } from 'path';
import { getDestinationsFromWorkspace } from '../../../src/checks/utils/workspace';

describe('Test for getDestinationsFromWorkspace()', () => {
    const sampleWorkspace = join(__dirname, '..', '..', 'sample-workspace');
    const sampleAppNoUI5Yaml = join(sampleWorkspace, 'sample-app-NO_UI5_YAML');
    const sampleAppNoBackend = join(sampleWorkspace, 'sample-app-NO_BACKEND');
    const sampleAppNoDest = join(sampleWorkspace, 'sample-app-NO_DEST');

    test('Test destinations recieved from sample-workspace using getDestinationsFromWorkspace()', async () => {
        // Mock setup
        const wsFolders = [sampleWorkspace];

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
