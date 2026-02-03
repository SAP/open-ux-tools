import * as zod from 'zod';

/**
 * Schema for ADP controller extension functionality input
 */
export const AdpControllerExtensionSchema: zod.ZodObject<{
    prompt: zod.ZodString;
    aiResponse?: zod.ZodOptional<zod.ZodString>;
    viewId?: zod.ZodOptional<zod.ZodString>;
    controllerName?: zod.ZodOptional<zod.ZodString>;
}> = zod.object({
    prompt: zod.string().describe('Natural language prompt describing what controller extension or fragment to create'),
    aiResponse: zod
        .string()
        .optional()
        .describe(
            'Optional AI-generated response containing code blocks with Path markers. If not provided, the functionality will only validate the adaptation project.'
        ),
    viewId: zod.string().optional().describe('Optional target view identifier for the controller extension'),
    controllerName: zod
        .string()
        .optional()
        .describe('Optional desired controller extension name (without .js/.ts extension)')
});

export type AdpControllerExtensionInput = zod.infer<typeof AdpControllerExtensionSchema>;
