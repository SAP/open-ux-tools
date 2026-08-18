/**
 * Integration tests that run search_docs against the built MCP server (dist/index.js)
 * to verify the tool is reachable and returns results. Corpus content coverage is
 * verified separately in fiori-docs-embeddings/test/build-embeddings-integration.test.ts.
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
    const tool = tools.find((t) => t.name === 'search_docs');
    if (!tool) {
        throw new Error('search_docs tool not found');
    }
    const result = await tool.invoke({ query, maxResults });
    return typeof result === 'string' ? result : JSON.stringify(result);
}

describe('search_docs embeddings coverage', () => {
    it('returns results for an OPA5 query', async () => {
        const result = await searchDocs('OData V4 OPA5 sap.fe.test JourneyRunner', 5);
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('Result 1:');
    }, 120000);

    it('returns results for a sap.fe.test API query', async () => {
        const result = await searchDocs('sap.fe.test column adaptation OPA5 API', 5);
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('Result 1:');
    }, 120000);
});
