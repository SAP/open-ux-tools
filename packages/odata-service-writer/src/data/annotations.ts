import type { Editor } from 'mem-fs-editor';
import { join, normalize, posix } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { t } from '../i18n';
import type { NamespaceAlias, OdataService, EdmxAnnotationsInfo, EdmxOdataService, CdsAnnotationsInfo } from '../types';
import prettifyXml from 'prettify-xml';
import { getWebappPath, DirName } from '@sap-ux/project-access';

/**
 * Updates the cds index or service file with the provided annotations.
 * This function takes an Editor instance and cds annotations
 * and updates either the index file or the service file with the given annotations.
 *
 * @param {Editor} fs - The memfs editor instance
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
async function updateCdsIndexOrServiceFile(fs: Editor, annotations: CdsAnnotationsInfo): Promise<void> {
    const dirPath = join(annotations.projectName, DirName.Annotations);
    const annotationPath = normalize(dirPath).split(/[\\/]/g).join(posix.sep);
    const annotationConfig = `\nusing from './${annotationPath}';`;
    // get index and service file paths
    const indexFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'index.cds');
    const serviceFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'services.cds');
    // extend index or service file with annotation config
    if (indexFilePath && fs.exists(indexFilePath)) {
        fs.append(indexFilePath, annotationConfig);
    } else if (fs.exists(serviceFilePath)) {
        fs.append(serviceFilePath, annotationConfig);
    } else {
        fs.write(serviceFilePath, annotationConfig);
    }
}

/**
 * Updates cds files with the provided annotations.
 * This function takes cds annotations and an Editor instance,
 * then updates the relevant cds files with the given annotations.
 *
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @param {Editor} fs - The memfs editor instance
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
export async function updateCdsFilesWithAnnotations(
    annotations: CdsAnnotationsInfo | CdsAnnotationsInfo[],
    fs: Editor
): Promise<void> {
    if (Array.isArray(annotations)) {
        for (const annotationName in annotations) {
            const annotation = annotations[annotationName];
            const annotationCdsPath = join(
                annotation.projectPath,
                annotation.appPath ?? '',
                annotation.projectName,
                'annotations.cds'
            );
            // write into annotations.cds file
            if (fs.exists(annotationCdsPath)) {
                fs.append(annotationCdsPath, annotation.cdsFileContents);
            } else {
                fs.write(annotationCdsPath, annotation.cdsFileContents);
            }
            await updateCdsIndexOrServiceFile(fs, annotation);
        }
    } else {
        const annotationCdsPath = join(
            annotations.projectPath,
            annotations.appPath ?? '',
            annotations.projectName,
            'annotations.cds'
        );
        // write into annotations.cds file
        fs.write(annotationCdsPath, annotations.cdsFileContents);
        await updateCdsIndexOrServiceFile(fs, annotations);
    }
}

/**
 * Removes the cds index or service file with the provided annotations.
 * This function takes an Editor instance and cds annotations
 * and deletes either from the index file or the service file with the given annotations.
 *
 * @param {Editor} fs - The memfs editor instance
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
async function removeCdsIndexOrServiceFile(fs: Editor, annotations: CdsAnnotationsInfo): Promise<void> {
    const dirPath = join(annotations.projectName, DirName.Annotations);
    const annotationPath = normalize(dirPath).split(/[\\/]/g).join(posix.sep);
    const annotationConfig = `\nusing from './${annotationPath}';`;
    // Get index and service file paths
    const indexFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'index.cds');
    const serviceFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'services.cds');
    // Remove annotation config from index or service file
    if (indexFilePath && fs.exists(indexFilePath)) {
        // Read old annotations content and replace it with empty string
        const initialIndexContent = fs.read(indexFilePath);
        const updatedContent = initialIndexContent.replace(annotationConfig, '');
        fs.write(indexFilePath, updatedContent);
    } else if (fs.exists(serviceFilePath)) {
        // Read old annotations content and replace it with empty string
        const initialServiceFileContent = fs.read(serviceFilePath);
        const updatedContent = initialServiceFileContent.replace(annotationConfig, '');
        fs.write(serviceFilePath, updatedContent);
    }
}

/**
 * Removes annotations from CDS files.
 * This function takes cds annotations and an Editor instance,
 * then updates the relevant cds files with the given annotations.
 *
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @param {Editor} fs - The memfs editor instance
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
export async function removeAnnotationsFromCDSFiles(
    annotations: CdsAnnotationsInfo | CdsAnnotationsInfo[],
    fs: Editor
): Promise<void> {
    if (Array.isArray(annotations)) {
        for (const annotationName in annotations) {
            const annotation = annotations[annotationName];
            const annotationCdsPath = join(
                annotation.projectPath,
                annotation.appPath ?? '',
                annotation.projectName,
                'annotations.cds'
            );
            // Remove from annotations.cds file
            if (fs.exists(annotationCdsPath)) {
                // Read old annotations content and replace it with empty string
                const initialCDSContent = fs.read(annotationCdsPath);
                const updatedContent = initialCDSContent.replace(annotation.cdsFileContents, '');
                fs.write(annotationCdsPath, updatedContent);
            }
            await removeCdsIndexOrServiceFile(fs, annotation);
        }
    } else {
        const annotationCdsPath = join(
            annotations.projectPath,
            annotations.appPath ?? '',
            annotations.projectName,
            'annotations.cds'
        );
        // Write into annotations.cds file
        if (fs.exists(annotationCdsPath)) {
            // Read old annotations content and replace it with empty string
            const initialCDSContent = fs.read(annotationCdsPath);
            const updatedContent = initialCDSContent.replace(annotations.cdsFileContents, '');
            fs.write(annotationCdsPath, updatedContent);
        }
        await removeCdsIndexOrServiceFile(fs, annotations);
    }
}

/**
 * Writes local copies of metadata.xml and local annotations.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {string} templateRoot - path to the file templates
 * @param {OdataService} service - the OData service instance with EDMX type
 */
export async function writeLocalServiceAnnotationXMLFiles(
    fs: Editor,
    webappPath: string,
    templateRoot: string,
    service: EdmxOdataService
): Promise<void> {
    // Write metadata.xml file
    await writeMetadata(fs, webappPath, service);

    // Adds local annotations to datasources section of manifest.json and writes the annotations file
    if (service.localAnnotationsName) {
        const namespaces = getAnnotationNamespaces(service);
        fs.copyTpl(
            join(templateRoot, 'add', 'annotation.xml'),
            join(webappPath, DirName.Annotations, `${service.localAnnotationsName}.xml`),
            { ...service, namespaces }
        );
    }
}

/**
 * Writes local copy of metadata.xml.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {OdataService} service - the OData service instance with EDMX type
 */
export async function writeMetadata(fs: Editor, webappPath: string, service: EdmxOdataService): Promise<void> {
    if (service.metadata) {
        // mainService should be used in case there is no name defined for service
        fs.write(
            join(webappPath, DirName.LocalService, service.name ?? 'mainService', 'metadata.xml'),
            prettifyXml(service.metadata, { indent: 4 })
        );
    }
}

/**
 * Removes annotation XML files for EDMX annotations.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {string} serviceName - Name of The OData service.
 * @param {OdataService} edmxAnnotations - The OData service annotations.
 */
export async function removeRemoteServiceAnnotationXmlFiles(
    fs: Editor,
    basePath: string,
    serviceName: string,
    edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
): Promise<void> {
    const webappPath = await getWebappPath(basePath, fs);
    // Write annotation xml if annotations are provided and service type is EDMX
    if (Array.isArray(edmxAnnotations)) {
        for (const annotationName in edmxAnnotations) {
            const annotation = edmxAnnotations[annotationName];
            const pathToAnnotationFile = join(
                webappPath,
                DirName.LocalService,
                serviceName,
                `${annotation.technicalName}.xml`
            );
            if (fs.exists(pathToAnnotationFile)) {
                fs.delete(pathToAnnotationFile);
            }
        }
    } else if (edmxAnnotations?.xml) {
        const pathToAnnotationFile = join(
            webappPath,
            DirName.LocalService,
            serviceName,
            `${edmxAnnotations.technicalName}.xml`
        );
        if (fs.exists(pathToAnnotationFile)) {
            fs.delete(pathToAnnotationFile);
        }
    }
}

/**
 * Writes annotation XML files for EDMX service annotations.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {string} serviceName - Name of The OData service.
 * @param {OdataService} edmxAnnotations - The OData service annotations.
 */
export async function writeRemoteServiceAnnotationXmlFiles(
    fs: Editor,
    basePath: string,
    serviceName: string,
    edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
): Promise<void> {
    const webappPath = await getWebappPath(basePath, fs);
    // Write annotation xml if annotations are provided and service type is EDMX
    if (Array.isArray(edmxAnnotations)) {
        for (const annotationName in edmxAnnotations) {
            const annotation = edmxAnnotations[annotationName];
            if (annotation?.xml) {
                fs.write(
                    join(webappPath, DirName.LocalService, serviceName, `${annotation.name}.xml`),
                    prettifyXml(annotation.xml, { indent: 4 })
                );
            }
        }
    } else if (edmxAnnotations?.xml) {
        fs.write(
            join(webappPath, DirName.LocalService, serviceName, `${edmxAnnotations.name}.xml`),
            prettifyXml(edmxAnnotations.xml, { indent: 4 })
        );
    }
}

/**
 * Returns the namespaces parsed from the specified metadata and single annotation.
 *
 * @param {EdmxAnnotationsInfo} edmxAnnotation - OData service annotations xml
 * @param {NamespaceAlias[]} schemaNamespaces - namespaces array from metadata
 * @returns A reference to the namspaces array
 */
function getAnnotationNamespacesForSingleAnnotation(
    edmxAnnotation: EdmxAnnotationsInfo,
    schemaNamespaces: NamespaceAlias[]
): NamespaceAlias[] {
    if (edmxAnnotation?.xml) {
        // Parse once
        const annotationsJson: object = xmlToJson(edmxAnnotation.xml);
        return schemaNamespaces.map((schema: NamespaceAlias) => {
            // Check if alias exists in backend annotation file, if so use it
            const annotationAlias =
                edmxAnnotation.xml && schema.namespace ? getAliasFromAnnotation(annotationsJson, schema.namespace) : '';
            if (annotationAlias) {
                schema.alias = annotationAlias;
            }
            return schema;
        });
    }
    return schemaNamespaces;
}

/**
 * Returns the namespaces parsed from the specified metadata and annotations.
 *
 * @param {Partial<OdataService>} service - an odata service where at least metadata and annotations properties are defined
 * @param {string} service.metadata - OData service metadata xml
 * @param {string} service.annotations - OData service annotations xml
 * @returns A reference to the namspaces array
 */
export function getAnnotationNamespaces({ metadata, annotations }: Partial<OdataService>): NamespaceAlias[] {
    // Enhance service with annotations namespaces
    let schemaNamespaces = metadata ? getNamespaces(metadata) : [];
    if (Array.isArray(annotations)) {
        for (const annotationName in annotations) {
            const edmxAnnotation = annotations[annotationName] as EdmxAnnotationsInfo;
            schemaNamespaces = getAnnotationNamespacesForSingleAnnotation(edmxAnnotation, schemaNamespaces);
        }
    } else {
        const edmxAnnotation = annotations as EdmxAnnotationsInfo;
        schemaNamespaces = getAnnotationNamespacesForSingleAnnotation(edmxAnnotation, schemaNamespaces);
    }
    return schemaNamespaces;
}

/**
 * Convert specified xml string to JSON.
 *
 * @param xml - the schema to parse
 * @returns parsed object representation of passed XML
 */
function xmlToJson(xml: string): any | void {
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true
    };

    try {
        const parser = new XMLParser(options);
        return parser.parse(xml, true);
    } catch (error) {
        throw new Error(t('error.unparseableXML', { error }));
    }
}

/**
 * Gets all the schema namespaces and their aliases from the provided metadata.
 *
 * @param metadata - odata service metadata
 * @returns Array of namespaces and their aliases
 */
function getNamespaces(metadata: string): NamespaceAlias[] {
    const jsonMetadata: object = xmlToJson(metadata);
    let schema = jsonMetadata['edmx:Edmx']?.['edmx:DataServices']?.['Schema'];

    if (!schema) {
        return [];
    }

    // Can be array or single item
    if (!Array.isArray(schema)) {
        schema = [schema];
    }

    return schema.map((item) => {
        return {
            namespace: item.Namespace,
            alias: item.Alias || ''
        };
    });
}

/**
 * Gets namespace aliases from the specified annotations xml.
 *
 * @param annotations - annotations definition as json
 * @param namespace - the namespace to search
 * @returns An alias for the specified namespace or empty string
 */
function getAliasFromAnnotation(annotations: object, namespace: string): string {
    let references = annotations['edmx:Edmx']?.['edmx:Reference'];

    // Can be array or single item
    if (!Array.isArray(references)) {
        references = [references];
    }

    const annoNamespace = references.find(
        (ref) => ref['edmx:Include']?.['Namespace'] === namespace && ref['edmx:Include']?.['Alias']
    );
    return annoNamespace ? annoNamespace['edmx:Include']?.['Alias'] : '';
}
