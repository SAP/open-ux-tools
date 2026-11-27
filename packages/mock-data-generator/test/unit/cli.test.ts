import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMockgenCli } from '../../src/cli.js';

describe('mockgen CLI request validation', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-cli-'));
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('rejects a request document that is not JSON with the file and a remedy', async () => {
        // Given a request file that is not JSON
        const input = join(directory, 'request.json');
        await writeFile(input, '<edmx:Edmx/>');
        // When the CLI generates from it
        // Then it fails before generation, naming the file
        await expect(runMockgenCli(['generate', '--input', input])).rejects.toThrow(
            /could not read the request document .*request\.json.*Pass --input with a readable JSON file/
        );
    });

    it('rejects a request document without existing data before generation starts', async () => {
        // Given a request whose existingData is missing
        const input = join(directory, 'request.json');
        await writeFile(
            input,
            JSON.stringify({
                projectRoot: directory,
                dataDirectory: 'webapp/localService/mockdata',
                request: {
                    metadata: { format: 'edmx', content: '<edmx:Edmx/>' },
                    service: { urlPath: '/sap/opu/odata/x/', odataVersion: '2.0' },
                    targets: []
                }
            })
        );
        // When the CLI generates from it
        // Then the error names the missing field
        await expect(runMockgenCli(['generate', '--input', input])).rejects.toThrow(
            /request\.existingData must be an object/
        );
    });

    it('rejects a missing request file', async () => {
        // Given a path that does not exist
        const input = join(directory, 'missing.json');
        // When the CLI generates from it
        // Then it reports the unreadable file
        await expect(runMockgenCli(['generate', '--input', input])).rejects.toThrow(
            /could not read the request document/
        );
    });
});
