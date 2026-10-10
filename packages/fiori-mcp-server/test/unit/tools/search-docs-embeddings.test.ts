/**
 * Integration tests that run search_docs against the built MCP server (dist/index.js)
 * without mocking @sap-ux/fiori-docs-embeddings, to verify that content from the
 * OPA5 skill reference files and sap_fe_test_api.md is present and retrievable in the embeddings.
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST_SERVER = join(dirname(fileURLToPath(import.meta.url)), '../../../dist/index.js');

let tools: DynamicStructuredTool[] = [];
let client: MultiServerMCPClient;

function createClient(): MultiServerMCPClient {
    return new MultiServerMCPClient({
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
}

beforeAll(async () => {
    // The MCP initialize handshake has a 60 s SDK-level timeout. On loaded CI runners the
    // server process can take longer to start, causing a spurious MCPClientError -32001.
    // Retry up to 3 times with a fresh client each attempt (the adapter closes the underlying
    // MCP client on timeout, so the same instance cannot be reused).
    const MAX_ATTEMPTS = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const c = createClient();
        try {
            const loaded = await c.getTools();
            if (loaded.length === 0) {
                await c.close();
                throw new Error(
                    `No tools loaded from MCP server at ${DIST_SERVER}. Ensure the package is built before running these tests.`
                );
            }
            client = c;
            tools = loaded;
            return;
        } catch (err) {
            await c.close().catch(() => {});
            lastError = err;
            if (attempt < MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }
    throw lastError;
}, 240000);

afterAll(async () => {
    await client?.close();
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
    it('returns content from sap-fiori-opa5-test-development/v4-instructions.md', async () => {
        const result = await searchDocs('OData V4 sap.fe.test JourneyRunner generated test structure', 5);
        expect(result).toContain('OData V4');
    }, 120000);

    it('returns content from sap-fiori-opa5-test-development/v4-standard-patterns.md', async () => {
        const result = await searchDocs(
            'iStartMyApp iTearDownMyApp OPA5 journey sap.fe.test quick-reference catalogue',
            5
        );
        expect(result).toContain('iStartMyApp');
    }, 120000);

    it('returns content from sap_fe_test_api.md', async () => {
        const result = await searchDocs(
            'sap.fe.test.api.DialogValueHelpActions DialogCreateActions DialogMessageActions',
            5
        );
        expect(result).toContain('sap.fe.test.api');
    }, 120000);
});
