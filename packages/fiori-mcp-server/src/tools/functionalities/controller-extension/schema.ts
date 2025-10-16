import * as zod from 'zod';
import type { SapuxFtfsFileIO } from '../../../page-editor-api';
import { EXTENSION_FILE_NAME_PATTERN } from '../../../constant';

/**
 * Schema for creating a controller extension.
 */
export const ControllerExtensionCreationSchema: zod.ZodObject<{
    pageType: zod.ZodDefault<zod.ZodEnum>;
    controllerName: zod.ZodString;
    pageId?: zod.ZodOptional<zod.ZodEnum>;
}> = zod.object({
    pageType: zod
        .enum(['ListReport', 'ObjectPage'])
        .describe('Type of page. Use this when defining a global controller extension (not tied to a specific page).')
        .default('ListReport'),
    controllerName: zod.string().regex(EXTENSION_FILE_NAME_PATTERN).describe('Name of new controller extension file')
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
                    'Use this when defining a controller extension for a specific page. Required if the extension should be assigned to a particular page.'
                )
        });
    }

    return ControllerExtensionCreationSchema;
}

export type ControllerExtensionCreationInput = zod.infer<typeof ControllerExtensionCreationSchema>;
