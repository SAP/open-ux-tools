import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import fg from 'fast-glob';
import type { Logger } from '@sap-ux/logger';
import type { AnalyseAppOptions } from '../types';
import type { AnnotationDocument } from '../types/resources';

/**
 * Determine the annotation document format based on file extension.
 *
 * @param path - absolute file system path
 * @returns the inferred annotation format
 */
function determineFormat(path: string): 'xml' | 'json' | 'cds' {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'xml':
            return 'xml';
        case 'json':
            return 'json';
        default:
            return 'cds';
    }
}

/**
 * Read an annotation file and produce a document descriptor.
 *
 * @param path - absolute file system path
 * @returns annotation document or undefined when reading fails
 */
async function readAnnotationFile(path: string): Promise<AnnotationDocument | undefined> {
    try {
        const content = await fs.readFile(path, 'utf8');
        return { path, format: determineFormat(path), content };
    } catch {
        return undefined;
    }
}

/**
 * Load annotation artefacts stored under the application annotations folder.
 *
 * @param options - analyser options containing the application path
 * @param logger - optional logger for diagnostic output
 * @returns annotation documents discovered under the annotations folder
 */
export async function loadAnnotationDocuments(
    options: AnalyseAppOptions,
    logger?: Logger
): Promise<readonly AnnotationDocument[]> {
    const annotationsDir = join(options.appPath, 'annotations');
    try {
        const files = await fg('**/*.{xml,json,cds}', {
            cwd: annotationsDir,
            onlyFiles: true,
            absolute: true
        });
        const documents = await Promise.all(files.map((file) => readAnnotationFile(file)));
        return documents.filter((doc): doc is AnnotationDocument => doc !== undefined);
    } catch (error: unknown) {
        logger?.debug('Unable to load annotations directory', error);
        return [];
    }
}
