import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { ConvertedMetadata, RawMetadata } from '@sap-ux/vocabularies-types';
import { parse, merge } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';

const MAIN_APP_KEY = '';
const MAIN_SERVICE_KEY = 'mainService';
const METADATA_FILE_ID = 'metadata';
const ANNOTATION_FILE_ID_PREFIX = 'annotation';

interface XmlSource {
    fileIdentification: string;
    xml: string;
}

/**
 * Reads an XML file from the mem-fs editor, swallowing read errors.
 *
 * @param filePath - absolute path to the XML file
 * @param fs - mem-fs editor used to read the file
 * @param log - optional logger
 * @returns XML content, or undefined if the file is missing or unreadable
 */
function readXmlFile(filePath: string, fs?: Editor, log?: Logger): string | undefined {
    if (!fs) {
        return undefined;
    }
    try {
        const content = fs.read(filePath);
        return content || undefined;
    } catch (error) {
        log?.debug(`Could not read XML file ${filePath}: ${(error as Error).message}`);
        return undefined;
    }
}

/**
 * Collects metadata and annotation XML sources for the main OData service.
 *
 * @param appAccess - application access from project-access
 * @param fs - mem-fs editor used to read the XML files
 * @param log - optional logger
 * @param metadataOverride - optional pre-read metadata XML; when provided, annotation files are skipped
 * @returns metadata + annotation XML sources for the main OData service
 */
function collectServiceXmlSources(
    appAccess: ApplicationAccess | undefined,
    fs?: Editor,
    log?: Logger,
    metadataOverride?: string
): XmlSource[] {
    const sources: XmlSource[] = [];

    if (metadataOverride) {
        sources.push({ fileIdentification: METADATA_FILE_ID, xml: metadataOverride });
        return sources;
    }

    const service = appAccess?.project?.apps[MAIN_APP_KEY]?.services?.[MAIN_SERVICE_KEY];

    if (service?.local) {
        const metadataXml = readXmlFile(service.local, fs, log);
        if (metadataXml) {
            sources.push({ fileIdentification: METADATA_FILE_ID, xml: metadataXml });
        }
    }

    service?.annotations?.forEach((annotation, index) => {
        if (annotation.local) {
            const annotationXml = readXmlFile(annotation.local, fs, log);
            if (annotationXml) {
                sources.push({
                    fileIdentification: `${ANNOTATION_FILE_ID_PREFIX}_${index}`,
                    xml: annotationXml
                });
            }
        }
    });

    return sources;
}

/**
 * Loads the OData metadata of the main service together with its referenced local annotation files,
 * and returns the converted metadata model.
 *
 * This module is the single home for all XML loading and parsing in this package; other utilities
 * should consume the returned `ConvertedMetadata` rather than dealing with raw XML.
 *
 * @param appAccess - application access from project-access (provides resolved service paths)
 * @param fs - mem-fs editor used to read the XML files
 * @param log - optional logger
 * @param metadataOverride - optional pre-read metadata XML; when provided, annotation files are skipped
 * @returns converted metadata, or undefined if no XML could be loaded or conversion failed
 */
export async function loadServiceMetadata(
    appAccess: ApplicationAccess | undefined,
    fs?: Editor,
    log?: Logger,
    metadataOverride?: string
): Promise<ConvertedMetadata | undefined> {
    const sources = collectServiceXmlSources(appAccess, fs, log, metadataOverride);

    if (sources.length === 0) {
        return undefined;
    }

    try {
        const parsed: RawMetadata[] = sources.map((entry) => parse(entry.xml, entry.fileIdentification));
        const mergedRaw = parsed.length > 1 ? merge(...parsed) : parsed[0];
        return convert(mergedRaw);
    } catch (error) {
        log?.debug(`Failed to parse or convert service metadata: ${(error as Error).message}`);
        return undefined;
    }
}
