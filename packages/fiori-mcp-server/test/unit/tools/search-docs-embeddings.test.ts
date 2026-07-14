/**
 * Integration tests that run search_docs against the built MCP server (dist/index.js)
 * without mocking @sap-ux/fiori-docs-embeddings, to verify that content from the three
 * OPA5-related source files is present and retrievable in the embeddings.
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST_SERVER = join(dirname(fileURLToPath(import.meta.url)), '../../../dist/index.js');

let tools: DynamicStructuredTool[] = [];
let client: MultiServerMCPClient;

beforeAll(async () => {
    client = new MultiServerMCPClient({
        throwOnLoadError: true,
        prefixToolNameWithServerName: false,
        additionalToolNamePrefix: '',
        useStandardContentBlocks: true,
        mcpServers: {
            'fiori-mcp-server': {
                command: 'node',
                args: [DIST_SERVER],
                env: { SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY: 'true' }
            }
        }
    });
    tools = await client.getTools();
}, 60000);

afterAll(async () => {
    await client.close();
});

async function searchDocs(query: string, maxResults = 5): Promise<string> {
    const tool = tools.find((t) => t.name === 'search_docs');
    if (!tool) {
        throw new Error('search_docs tool not found');
    }
    const result = await tool.invoke({ query, maxResults });
    return typeof result === 'string' ? result : JSON.stringify(result);
}

describe('search_docs embeddings coverage', () => {
    // Each title is unique to its source file in the embeddings
    it('returns content from fiori-tools-opa-guide.md', async () => {
        const result = await searchDocs('Write OPA Tests for an SAP Fiori Elements for OData V4 Application', 5);
        expect(result).toContain('Write OPA Tests for an SAP Fiori Elements for OData V4 Application');
    }, 60000);

    it('returns content from opa5_docu.md', async () => {
        // Query on terms unique to opa5_docu: page-objects, journey, sap.fe.test API rules
        const result = await searchDocs(
            'sap.fe.test page-objects journey onFilterBar onTable OPA5 integration test rules',
            5
        );
        expect(result).toContain('OPA5 Integration Tests for SAP Fiori Elements applications');
    }, 60000);

    it('returns content from sap_fe_test_api.md', async () => {
        const result = await searchDocs('sap.fe.test.api.DialogActions OPA5 testing', 5);
        expect(result).toContain('sap.fe.test.api.DialogActions');
    }, 60000);
});
