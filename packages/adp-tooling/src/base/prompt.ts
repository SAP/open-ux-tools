import prompts from 'prompts';
import type { AdpWriterConfig } from '../types';

export const enum flexLayer {
    CUSTOMER_BASE = 'CUSTOMER_BASE',
    VENDOR = 'VENDOR'
}
/**
 * Prompt the user for the required properties for an adaptation project.
 *
 * @param defaults optional default values for the prompts
 * @param defaults.id initial id to be used for the new adaptation id prompt
 * @param defaults.reference initial id used for the original application id prompt
 * @param defaults.url initial url used for the target url prompt
 * @returns a configuration for the adp writer
 */
export async function promptGeneratorInput({
    id,
    reference,
    url
}: { id?: string; reference?: string; url?: string } = {}): Promise<AdpWriterConfig> {
    const app = await prompts([
        {
            type: 'select',
            choices: [
                { title: flexLayer.CUSTOMER_BASE, value: flexLayer.CUSTOMER_BASE },
                { title: flexLayer.VENDOR, value: flexLayer.VENDOR }
            ],
            initial: flexLayer.CUSTOMER_BASE,
            name: 'layer',
            message: 'Flex layer:'
        },
        {
            type: 'text',
            name: 'id',
            message: (_prev, values) => {
                if (values.layer === flexLayer.CUSTOMER_BASE) {
                    return 'New adaptation id (CUSTOMER_BASE selected, customer prefix will be automatically added to the id):';
                } else {
                    return 'New adaptation id:';
                }
            },
            initial: id,
            format: (input, values) => {
                if (values.layer === flexLayer.CUSTOMER_BASE && !input.startsWith('customer.')) {
                    return `customer.${input}`;
                } else {
                    return input;
                }
            },
            validate: (input) => input?.length > 0
        },
        {
            type: 'text',
            name: 'reference',
            message: 'Original application id:',
            initial: reference,
            validate: (input) => input?.length > 0
        },
        {
            type: 'text',
            name: 'title',
            message: 'Application title:'
        }
    ]);
    const target = await prompts([
        {
            type: 'text',
            name: 'url',
            message: 'Target system url:',
            initial: url,
            validate: (input) => input?.length > 0
        }
    ]);
    return { app, target };
}
