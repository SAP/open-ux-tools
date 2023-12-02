import { type ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { merge, parse } from '@sap-ux/edmx-parser';
import type File from 'vinyl';

/**
 *
 * @param files
 */
export function getConvertedAnnotations(files: File[]): ConvertedMetadata {
    const mergedAnnotations = merge(...files.map((file) => parse(file.contents?.toString('utf-8') || '')));
    return convert(mergedAnnotations);
}
