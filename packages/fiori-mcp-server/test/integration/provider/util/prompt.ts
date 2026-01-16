import type { PromptFunction } from 'promptfoo';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { validate } from './validate.js';

const AbstractMessage = z.object({
    role: z.enum(['system', 'user'])
});

/**
 * A message based on a prompt template stored in a file.
 */
const FileTemplateMessage = AbstractMessage.extend({ template: z.string() });
type FileTemplateMessage = z.infer<typeof FileTemplateMessage>;

/**
 * An inline message with a role and content.
 */
const InlineMessage = AbstractMessage.extend({ content: z.string() });

const Message = z.union([FileTemplateMessage, InlineMessage]);
type Message = z.infer<typeof Message>;

const PromptConfigResponseFormat = z
    .union([z.literal('text'), z.literal('json_object'), z.object({ json_schema: z.string() })])
    .default('text');
export type PromptConfigResponseFormat = z.infer<typeof PromptConfigResponseFormat>;

export const PromptConfig = z.object({
    messages: z.array(Message),
    response_format: PromptConfigResponseFormat
});
export type PromptConfig = z.infer<typeof PromptConfig>;

function isFileTemplateMessage(message: Message): message is FileTemplateMessage {
    return 'template' in message;
}

/**
 * Promptfoo prompt function that converts the ISLM prompt template format into Promptfoo template format.
 *
 * @param options The options object.
 * @param options.vars Configuration variables
 * @param options.config Prompt configuration
 * @returns Converted promptfoo template format.
 */
const prompt: PromptFunction = async ({
    vars,
    config
}: {
    vars: Record<string, string>;
    config?: Record<string, string>;
}) => {
    const cfg = validate(config, PromptConfig);
    if (!cfg.success) {
        throw new Error(`Invalid prompt configuration: ${cfg.message}`);
    }

    const islmVars = Object.keys(vars).filter((v) => v.startsWith('ISLM_'));

    return await Promise.all(
        cfg.data.messages.map(async (message) => {
            const template = isFileTemplateMessage(message)
                ? await fs.readFile(message.template, 'utf-8')
                : message.content;

            // Replace ISLM variables in the prompt file with the corresponding values from vars
            const content = islmVars.reduce(
                (content, islmVar) => content.replaceAll(`{${islmVar}}`, vars[islmVar] ?? ''),
                template
            );

            // check if there are unresolved ISLM variables left in the prompt file
            const unresolvedVars = Array.from(content.matchAll(/\{(ISLM_[^}]+)}/g)).map((match) => match[1]);
            if (unresolvedVars.length > 0) {
                throw new Error(`Unresolved prompt variables: ${unresolvedVars.join(', ')}`);
            }

            return { role: message.role, content };
        })
    );
};

export default prompt;
