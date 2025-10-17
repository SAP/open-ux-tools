import { type AzureOpenAiChatCallOptions, AzureOpenAiChatClient } from '@sap-ai-sdk/langchain';
import {
    type ApiProvider,
    type CallApiContextParams,
    type CallApiOptionsParams,
    type ProviderResponse
} from 'promptfoo';
import { z } from 'zod';
import fs from 'fs/promises';
import type {
    AzureOpenAiCreateChatCompletionRequest,
    AzureOpenAiResponseFormatJsonSchemaSchema
} from '@sap-ai-sdk/foundation-models/dist/azure-openai/client/inference/schema';
import type { AIMessageChunk, MessageFieldWithRole } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { Runnable } from '@langchain/core/runnables';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { getServiceKeyFromEnv } from './util/service-key';
import { PromptConfig, type PromptConfigResponseFormat } from './util/prompt';
import { validate } from './util/validate';
import { callTool, getTools } from './mcp-server';

/**
 * Schema for the configuration of the AICoreApiProvider.
 */
const AICoreApiProviderConfig = z.object({
    model: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o'),
    label: z.string().optional(),
    format: z.enum(['json', 'plain']).optional(),
    timeout: z.number().default(20000) // Default timeout of 20 seconds
});

type AICoreApiProviderConfig = z.infer<typeof AICoreApiProviderConfig>;

/**
 * API provider for SAP AI Core using Azure OpenAI models.
 */
export default class AICoreApiProvider implements ApiProvider {
    readonly config: AICoreApiProviderConfig;
    readonly label: string;

    private client?: Runnable<BaseLanguageModelInput, AIMessageChunk, AzureOpenAiChatCallOptions>;
    private tools: DynamicStructuredTool[] = [];

    constructor(options: { config: AICoreApiProviderConfig }) {
        this.config = AICoreApiProviderConfig.parse(options.config);

        process.env.AICORE_SERVICE_KEY = JSON.stringify(getServiceKeyFromEnv());

        this.label = `SAP AI Core (${this.config.model})`;
    }

    /**
     * Lazily initializes and returns the Azure OpenAI chat client with bound tool support.
     *
     * @returns Azure OpenAI chat client with bound tool support
     */
    private async getClient(): Promise<Runnable<BaseLanguageModelInput, AIMessageChunk, AzureOpenAiChatCallOptions>> {
        if (!this.client) {
            const client = new AzureOpenAiChatClient({
                modelName: this.config.model
            });
            this.tools = await getTools();
            this.client = client.bindTools(this.tools);
        }
        return this.client;
    }

    /**
     * Returns the provider ID string for this API provider instance.
     *
     * @returns The provider ID string.
     */
    id() {
        return `SAP AI Core: ${this.config.model}`;
    }

    /**
     * Calculate the cost of the request based on the number of tokens used. Cost is in SAP Compute Units (CU).
     *
     * @param promptTokens Number of tokens in the prompt.
     * @param completionTokens Number of tokens in the completion.
     * @returns Cost in SAP Compute Units (CU).
     */
    calculateCost(promptTokens: number, completionTokens: number): number {
        switch (this.config.model) {
            case 'gpt-4o':
                return (6.99 * promptTokens + 20.6115 * completionTokens) / 1e6;
            case 'gpt-4o-mini':
                return (0.2016 * promptTokens + 0.8737 * completionTokens) / 1e6;
        }
    }

    /**
     * Builds the response format configuration for the OpenAI API request.
     *
     * @param configuredResponseFormat The response format configuration from the prompt config.
     * @returns The response format configuration for the OpenAI API request.
     */
    private async buildResponseFormatConfig(
        configuredResponseFormat: PromptConfigResponseFormat | undefined
    ): Promise<Exclude<AzureOpenAiCreateChatCompletionRequest['response_format'], undefined>> {
        switch (configuredResponseFormat) {
            case 'text':
            case undefined:
                return { type: 'text' };
            case 'json_object':
                return { type: 'json_object' };
            default:
                const jsonSchema = configuredResponseFormat.json_schema;
                let schema: AzureOpenAiResponseFormatJsonSchemaSchema | undefined;
                try {
                    schema = JSON.parse(jsonSchema);
                } catch {
                    // next try
                }
                if (!schema) {
                    const schemaFile = await fs.readFile(jsonSchema, 'utf-8');
                    schema = JSON.parse(schemaFile);
                }
                return {
                    type: 'json_schema',
                    json_schema: { strict: true, name: 'result', schema }
                };
        }
    }

    /**
     * Calls the SAP AI Core API with the given prompt and options, returning the provider response.
     *
     * @param prompt The prompt to send to the API.
     * @param context Optional context parameters for the API call.
     * @param options Optional additional options for the API call.
     * @returns The provider response from the API or an error object.
     */
    async callApi(
        prompt: string,
        context?: CallApiContextParams,
        options?: CallApiOptionsParams
    ): Promise<ProviderResponse> {
        // set a default prompt config if not provided
        const promptConfig =
            context?.prompt.config ?? ({ response_format: 'text', messages: [] } satisfies PromptConfig);

        const promptConfigValidation = validate(promptConfig, PromptConfig);
        if (!promptConfigValidation.success) {
            return {
                error: `Invalid prompt configuration: ${promptConfigValidation.message}`
            };
        }

        const responseFormat = await this.buildResponseFormatConfig(promptConfigValidation.data.response_format);

        try {
            const response = await this.invokeCalls(prompt);
            let outputData = response.content;
            const usage = response.response_metadata.tokenUsage;

            if (
                this.config.format === 'json' ||
                responseFormat.type === 'json_schema' ||
                responseFormat.type === 'json_object'
            ) {
                try {
                    outputData = outputData !== null && typeof outputData === 'string' ? JSON.parse(outputData) : null;
                } catch (e) {
                    return {
                        error: `Expected JSON output, but received: ${outputData}. Error: ${
                            e instanceof Error ? e.message : String(e)
                        }`
                    };
                }
            }

            const result: ProviderResponse = {
                output: outputData,
                tokenUsage: {
                    prompt: usage?.promptTokens,
                    completion: usage?.completionTokens,
                    total: usage?.totalTokens
                },
                cost: usage ? this.calculateCost(usage.promptTokens, usage.completionTokens) : undefined
            };

            return result;
        } catch (error) {
            return await this.handleApiError(error, prompt);
        }
    }

    /**
     * Handles AI invocation with MCP tool calls support.
     *
     * This method sends a user prompt to the Azure OpenAI chat client and
     * automatically processes any tool calls returned by the model. When
     * the assistant requests tool usage (via `tool_calls`), each tool is
     * executed using the provided tool registry, and the
     * tool results are appended to the conversation history. The conversation continues until no further
     * tool calls are returned by the model.
     *
     * @param prompt The input text or instruction from the user.
     * @returns The final AI response message after all tool calls have been resolved.
     */
    private async invokeCalls(prompt: string): Promise<AIMessageChunk> {
        const client = await this.getClient();
        // Initialize message history
        const messages: MessageFieldWithRole[] = [
            {
                role: 'user',
                content: prompt
            }
        ];
        // Make first call to AI
        let response = await client.invoke(messages);
        // Resolve tool calls
        while (response.tool_calls?.length) {
            // Request from assistant for tool
            messages.push({
                role: 'assistant',
                content: response.content,
                tool_calls: response.tool_calls
            });
            for (const toolCall of response.tool_calls) {
                try {
                    const result = await callTool(this.tools, toolCall);
                    // Response from tool
                    messages.push({
                        role: 'tool',
                        content: result,
                        tool_call_id: toolCall.id
                    });
                } catch (e) {
                    messages.push({
                        role: 'tool',
                        content: e.message,
                        tool_call_id: toolCall.id
                    });
                }
            }
            response = await client.invoke(messages);
        }

        return response;
    }

    /**
     * Handles errors from the API call, including retry logic for rate limiting.
     *
     * @param error The error thrown during the API call.
     * @param prompt The prompt that was sent to the API.
     * @returns A ProviderResponse containing the error message.
     */
    private async handleApiError(error: unknown, prompt: string): Promise<ProviderResponse> {
        const getPause = (retryAfter: number | string | undefined): number => {
            if (typeof retryAfter === 'number') {
                return retryAfter * 1000; // retry after X seconds
            }
            if (typeof retryAfter === 'string') {
                const retryAfterDate = new Date(retryAfter); // retry after <Date>
                const now = new Date();
                if (!isNaN(retryAfterDate.getTime()) && retryAfterDate > now) {
                    return retryAfterDate.getTime() - now.getTime();
                }
            }

            // Default pause if no retry-after header is provided
            const pauseSeconds = Math.floor(Math.random() * 6) + 5; // between 5 and 10 seconds
            return pauseSeconds * 1000;
        };

        // Based on interface ErrorWithCause from '@sap-cloud-sdk/util'
        if (error && typeof error === 'object' && 'rootCause' in error) {
            const rootCause = error.rootCause as { message?: string };
            if (rootCause && typeof rootCause === 'object' && 'isAxiosError' in rootCause && rootCause.isAxiosError) {
                const response =
                    'response' in rootCause
                        ? (rootCause.response as {
                              headers?: { ['retry-after']?: string };
                              data?: { error?: { message?: string } };
                          })
                        : undefined;
                if ('status' in rootCause && rootCause.status === 429) {
                    const pause = getPause(response?.headers?.['retry-after']);
                    console.warn(`Too many requests: pausing for ${pause} ms before retrying...`);
                    await new Promise((resolve) => setTimeout(resolve, pause));
                    return this.callApi(prompt);
                }
                return {
                    error: `Error from AI Core: ${response?.data?.error?.message ?? rootCause.message}`
                };
            }
        }

        return {
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
