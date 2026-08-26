/**
 * Integration tests that run search_docs against the built MCP server (dist/index.js)
 * without mocking @sap-ux/fiori-docs-embeddings, to verify that content from the three
 * OPA5-related source files is present and retrievable in the embeddings.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST_SERVER = join(dirname(fileURLToPath(import.meta.url)), '../../../dist/index.js');
const REQUEST_TIMEOUT_MS = 115000;

let client: Client;

beforeAll(async () => {
    const transport = new StdioClientTransport({
        command: 'node',
        args: [DIST_SERVER],
        env: { ...process.env, SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY: 'true' }
    });
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport, { timeout: REQUEST_TIMEOUT_MS });
    const { tools } = await client.listTools(undefined, { timeout: REQUEST_TIMEOUT_MS });
    if (tools.length === 0) {
        throw new Error(
            `No tools loaded from MCP server at ${DIST_SERVER}. Ensure the package is built before running these tests.`
        );
    }
}, 120000);

afterAll(async () => {
    await client?.close();
});

async function searchDocs(query: string, maxResults = 5): Promise<string> {
    const result = await client.callTool({ name: 'search_docs', arguments: { query, maxResults } }, undefined, {
        timeout: REQUEST_TIMEOUT_MS
    });
    return typeof result === 'string' ? result : JSON.stringify(result);
}

describe('search_docs embeddings coverage', () => {
    // Each title is unique to its source file in the embeddings
    it('returns content from fiori-tools-opa-guide.md', async () => {
        const result = await searchDocs('Write OPA Tests for an SAP Fiori Elements for OData V4 Application', 5);
        expect(result).toContain('Write OPA Tests for an SAP Fiori Elements for OData V4 Application');
    }, 120000);

    it('returns content from opa5_docu.md', async () => {
        // Query on terms unique to opa5_docu: page-objects, journey, sap.fe.test API rules
        const result = await searchDocs(
            'sap.fe.test page-objects journey onFilterBar onTable OPA5 integration test rules',
            5
        );
        expect(result).toContain('OPA5 Integration Tests for SAP Fiori Elements applications');
    }, 120000);

    it('returns content from sap_fe_test_api.md', async () => {
        const result = await searchDocs('sap.fe.test.api.DialogActions OPA5 testing', 5);
        expect(result).toContain('sap.fe.test.api.DialogActions');
    }, 120000);
});
