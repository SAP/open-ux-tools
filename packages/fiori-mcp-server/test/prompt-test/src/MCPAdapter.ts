import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolCall } from '@langchain/core/messages/tool';
import type { MessageContent } from '@langchain/core/messages';
import { join } from 'path';

// Create client and connect to server
const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: false,
    additionalToolNamePrefix: '',
    useStandardContentBlocks: true,
    mcpServers: {
        ['fiori-mcp-server']: {
            command: 'node',
            args: [join(__dirname, `../../../dist/index.js`)]
        }
    }
});

export const getTools = async (): Promise<Array<DynamicStructuredTool>> => {
    return client.getTools();
};

export const callTool = async (tools: DynamicStructuredTool[], toolCall: ToolCall): Promise<MessageContent> => {
    const tool = tools.find((tool) => tool.name === toolCall.name);
    if (!tool) {
        return `Tool "${toolCall.name}" not found`;
    }
    return tool?.invoke(toolCall.args);
};
