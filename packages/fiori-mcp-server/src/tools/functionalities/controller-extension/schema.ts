import * as zod from 'zod';
import { SapuxFtfsFileIO } from '../../../page-editor-api';

/**
 * Schema for creating a controller extension.
 */
export const ControllerExtensionCreationSchema: zod.ZodObject<{
    pageType: zod.ZodDefault<zod.ZodEnum>;
    controllerName: zod.ZodString;
    pageId?: zod.ZodOptional<zod.ZodEnum>;
}> = zod.object({
    pageType: zod.enum(['ListReport', 'ObjectPage']).describe('Type of page').default('ListReport'),
    controllerName: zod.string().describe('Name of new controller extension file')
});

/**
 * Builds a Zod schema for creating a controller extension.
 *
 * @param ftfsFileIo - Optional file I/O helper for reading application metadata.
 * @returns A Zod schema for validating controller extension creation input.
 */
export async function buildControllerExtensionSchema(ftfsFileIo?: SapuxFtfsFileIO) {
    let pageIds: string[] = [];
    if (ftfsFileIo) {
        const appData = await ftfsFileIo.readApp();
        pageIds = Object.keys(appData.config.pages ?? {});
    }
    if (pageIds.length > 0) {
        return ControllerExtensionCreationSchema.extend({
            pageId: zod
                .enum(pageIds)
                .optional()
                .describe(
                    'If controller extension should be assigned for specific page, then pageId should be provided'
                )
        });
    }

    return ControllerExtensionCreationSchema;
}

export type ControllerExtensionCreationInput = zod.infer<typeof ControllerExtensionCreationSchema>;
