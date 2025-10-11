import type { ServiceProvider } from '@sap-ux/axios-extension';
import { ODataVersion } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { hostEnvironment, type HostEnvironmentId } from '@sap-ux/fiori-generator-shared';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { XMLParser } from 'fast-xml-parser';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../i18n';
import LoggerHelper from '../prompts/logger-helper';
import { PromptState } from './prompt-state';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { removeSync } from 'circular-reference-remover';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey } from '@sap-ux/store';

/**
 * Determine if the current prompting environment is cli or a hosted extension (app studio or vscode).
 *
 * @returns the platform name and technical name
 */
export function getPromptHostEnvironment(): { name: string; technical: HostEnvironmentId } {
    if (!PromptState.isYUI) {
        return hostEnvironment.cli;
    } else {
        return isAppStudio() ? hostEnvironment.bas : hostEnvironment.vscode;
    }
}

/**
 * Validate xml and parse the odata version from the metadata xml.
 *
 * @param metadata a metadata string
 * @returns the odata version of the specified metadata, along with the converted metadata in case further processing may be required to avoid re-parsing.
 *  Throws an error if the metadata or odata version is invalid.
 */
export function parseOdataVersion(metadata: string): {
    odataVersion: OdataVersion;
    convertedMetadata: ConvertedMetadata;
} {
    try {
        const convertedMetadata = convert(parse(metadata));
        const parsedOdataVersion = Number.parseInt(convertedMetadata?.version, 10);

        if (Number.isNaN(parsedOdataVersion)) {
            LoggerHelper.logger.error(t('errors.unparseableOdataVersion'));
            throw new Error(t('errors.unparseableOdataVersion'));
        }
        // Note that odata version > `4` e.g. `4.1`, is not currently supported by `@sap-ux/edmx-converter`
        const odataVersion = parsedOdataVersion === 4 ? OdataVersion.v4 : OdataVersion.v2;
        return {
            odataVersion,
            convertedMetadata
        };
    } catch (error) {
        LoggerHelper.logger.error(error);
        throw new Error(t('prompts.validationMessages.metadataInvalid'));
    }
}

/**
 * Convert specified xml string to JSON.
 *
 * @param xml - the schema to parse
 * @returns parsed object representation of passed XML
 */
export function xmlToJson(xml: string): any {
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true,
        removeNSPrefix: true
    };

    try {
        const parser = new XMLParser(options);
        return parser.parse(xml, true);
    } catch (error) {
        throw new Error(t('error.unparseableXML', { error }));
    }
}

/**
 * Replaces the origin in the metadata URIs with a relative path.
 * The path will be tested for '/sap/opu/odata/' and if found, the origin will be replaced with './'.
 * This is to ensure that the SAP internal backend URIs are relative and that other non-SAP URIs are not affected.
 *
 * @param metadata a metadata string containing URIs which include origin (protocol, host, port)
 * @returns the metadata string with URIs replaced with relative paths
 */
export function originToRelative(metadata: string): string {
    // Regex explanation:
    // 1. Match the string "Uri=" literally
    // 2. Match either "http" or "https"
    // 3. Match the origin (protocol, host, port) as few times as possible
    // 4. Match a single forward slash, indicating the first path segment of the URL (after the origin)
    // 5. Match "sap/opu/odata" or "sap/opu/odata4" literally

    return metadata.replace(
        new RegExp(/(Uri=")(http|https):\/{2}(.*?)(\/)(sap\/opu\/(odata\/|odata4\/))/, 'g'),
        // Retain the original path segment after the origin, matched with capture group 5 (index 4)
        (match: string, ...patterns: string[]) => `${patterns[0]}./${patterns[4]}`
    );
}

/**
 * Convert the odata version type from the prompt (odata-service-writer) type to the axios-extension type.
 *
 * @param odataVersion The odata version to convert
 * @returns The converted odata version
 */
export function convertODataVersionType(odataVersion?: OdataVersion): ODataVersion | undefined {
    if (!odataVersion) {
        return undefined;
    }
    return odataVersion === OdataVersion.v2 ? ODataVersion.v2 : ODataVersion.v4;
}

/**
 * Gets the default index for a list of items, used to default list prompts to the first item if only one item is available.
 * If list is undefined or has more than one, returns undefined which will default to the 'please select' message.
 *
 * @param list the list of choices
 * @returns the default index if only one item is available, otherwise undefined
 */
export function getDefaultChoiceIndex(list: ListChoiceOptions[]): number | undefined {
    if (list?.length === 1) {
        return 0;
    }

    return undefined;
}

/**
 * Remove circular dependencies from within the service provider winston logger, causing issues with serialization in Yeoman generators.
 *
 * @param serviceProvider - instance of the service provider
 * @returns the service provider with the circular dependencies removed
 */
export function removeCircularFromServiceProvider(serviceProvider: ServiceProvider): ServiceProvider {
    for (const service in (serviceProvider as any).services) {
        if ((serviceProvider as any).services?.[service].log) {
            (serviceProvider as any).services[service].log = removeSync(
                (serviceProvider as any).services[service]?.log,
                { setUndefined: true }
            );
        }
    }
    if (serviceProvider.log) {
        (serviceProvider as any).log = removeSync((serviceProvider as any).log, { setUndefined: true });
    }
    return serviceProvider;
}

/**
 * Checks if the specified backend systems contain a match for the specified url and client.
 *
 * @param backendSystems backend systems to search for a matching key
 * @param url the url component of the backend system key
 * @param client the client component of of the backend system key
 * @returns the backend system if found or undefined
 */
export function isBackendSystemKeyExisting(
    backendSystems: BackendSystem[],
    url: string,
    client?: string
): BackendSystem | undefined {
    const newBackendSystemId = new BackendSystemKey({ url, client }).getId();
    return backendSystems.find((backendSystem) => BackendSystemKey.from(backendSystem).getId() === newBackendSystemId);
}

export { PromptState };
