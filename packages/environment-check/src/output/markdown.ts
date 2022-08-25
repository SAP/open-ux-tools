import { countNumberOfServices, getServiceCountText } from '../formatter';
import { Severity, UrlServiceType } from '../types';
import type {
    Destination,
    DestinationResults,
    Environment,
    EnvironmentCheckResult,
    MarkdownWriter,
    ResultMessage
} from '../types';
import { t } from '../i18n';
/**
 * Output mapping from severity -> icon + text
 */
const severityMap = {
    [Severity.Error]: '🔴 &nbsp; Error',
    [Severity.Warning]: '🟡 &nbsp; Warning',
    [Severity.Info]: '🟢 &nbsp; Info',
    [Severity.Debug]: 'ℹ Debug'
};

/**
 * Column sequence of the destination table, first colun id, the column title
 */
const destinationTableFields = new Map<string, string>([
    ['Name', 'Name'],
    ['Description', 'Description'],
    ['Host', 'Host'],
    ['sap-client', 'sap-client'],
    ['UrlServiceType', 'Fiori tools usage'],
    ['WebIDEUsage', 'WebIDEUsage'],
    ['WebIDEAdditionalData', 'WebIDEAdditionalData'],
    ['Type', 'Type'],
    ['Authentication', 'Authentication'],
    ['ProxyType', 'ProxyType'],
    ['HTML5.DynamicDestination', 'HTML5.DynamicDestination']
]);

/**
 * Convert enum UrlServiceType to text.
 *
 * @param urlServiceType - classifaction of destination from getUrlServiceTypeForDest
 * @returns - meaningful text
 */
const urlServiceTypeToText = (urlServiceType: UrlServiceType): string => {
    let text: string;
    switch (urlServiceType) {
        case UrlServiceType.FullServiceUrl: {
            text = t('markdownText.fullServiceUrlConfig');
            break;
        }
        case UrlServiceType.PartialUrl: {
            text = t('markdownText.partialUrlConfig');
            break;
        }
        case UrlServiceType.CatalogServiceUrl: {
            text = t('markdownText.catalogServiceConfig');
            break;
        }
        default: {
            text = t('markdownText.wrongConfig');
        }
    }
    return text;
};

/**
 * Return a markdown writer objbect that allows to add captions, text, tables, etc.
 *
 * @returns markdown writer
 */
function getMarkdownWriter(): MarkdownWriter {
    let result = '';
    return {
        addH1: (text: string): void => {
            result += `\n# ${text}\n`;
        },
        addH2: (text: string): void => {
            result += `\n<br>\n\n## ${text}\n`;
        },
        addH3: (text: string): void => {
            result += `\n### ${text}\n`;
        },
        addLine: (line: string): void => {
            result += `${line}<br>\n`;
        },
        addDetails: (description: string, details: string): void => {
            result += `<details><summary>${description}</summary>\n<pre>\n${details}\n</pre></details>\n`;
        },
        addSub: (text: string): void => {
            result += `<sub>${text}</sub>\n`;
        },
        addTable: (table: Array<Array<string>>): void => {
            if (table.length > 0) {
                const header = table.shift();
                result += `|${header.join('|')}|\n`;
                result += `|${'--|'.repeat(header.length)}\n`;
                for (const row of table) {
                    result += `|${row.join('|')}|\n`;
                }
            }
        },
        toString: (): string => result
    };
}

/**
 * Write the results for environment check.
 *
 * @param writer - markdown writter
 * @param environment - environment results, like development environment, node version, etc
 */
function writeEnvironment(writer: MarkdownWriter, environment?: Environment): void {
    writer.addH2(`Environment`);
    if (environment) {
        writer.addLine(t('markdownText.platform', { platform: environment.platform }));
        writer.addLine(t('markdownText.devEnvironement', { devEnvironment: environment.developmentEnvironment }));
        writer.addLine(t('markdownText.devSpaceType', { basDevSpace: environment.basDevSpace }));
        writer.addDetails(`${t('markdownText.versions')}`, JSON.stringify(environment.versions, null, 4));
    } else {
        writer.addLine(t('markdownText.envNotChecked'));
    }
}

/**
 * Write the details of one destination.
 *
 * @param writer - markdown writter
 * @param destName - name of the destination
 * @param destDetails - details, like V2/V4 catalog results
 * @param urlServiceType - (optional) type of service
 */
function writeDestinationDetails(
    writer: MarkdownWriter,
    destName: string,
    destDetails: DestinationResults,
    urlServiceType?: UrlServiceType
): void {
    writer.addH3(t('markdownText.detailsFor', { destName }));
    if (destDetails.v2 && Array.isArray(destDetails.v2.results)) {
        writer.addLine(
            `✅ &nbsp; ${t('markdownText.v2CatalogReturned')} ${getServiceCountText(
                countNumberOfServices(destDetails.v2.results)
            )}`
        );
    } else {
        writer.addLine(`🚫 &nbsp; ${t('markdownText.v2CatalogNotAvailable')}`);
    }
    if (destDetails.v4 && Array.isArray(destDetails.v4.results)) {
        writer.addLine(
            `✅ &nbsp; ${t('markdownText.v4CatalogReturned')} ${getServiceCountText(
                countNumberOfServices(destDetails.v4.results)
            )}`
        );
    } else {
        writer.addLine(`🚫 &nbsp; ${t('markdownText.v4CatalogNotAvailable')}`);
    }
    if (destDetails.HTML5DynamicDestination) {
        writer.addLine(`✅ &nbsp; ${t('markdownText.html5DynamicDestTrue')}`);
    } else {
        writer.addLine(`🚫 &nbsp; ${t('markdownText.setHtml5DynamicDest')}`);
    }
    if (urlServiceType) {
        writer.addLine(
            `${urlServiceType === UrlServiceType.InvalidUrl ? '🚫 &nbsp;' : '✅ &nbsp;'} ${t(
                'markdownText.sapFioriToolsUsage'
            )}: ${urlServiceTypeToText(urlServiceType)}`
        );
    } else {
        writer.addLine(`🟡 &nbsp; ${t('markdownText.noUrlServiceType')}`);
    }
}

/**
 * Write the results for destination checks.
 *
 * @param writer - markdown writter
 * @param destinationResults - results of destination checks that include the catalog services
 * @param destinations - list of all destinations
 */
function writeDestinationResults(
    writer: MarkdownWriter,
    destinationResults: { [dest: string]: DestinationResults } = {},
    destinations: Destination[] = []
): void {
    const numberOfDestDetails = Object.keys(destinationResults).length;
    writer.addH2(`${t('markdownText.destinationDetails')} (${numberOfDestDetails})`);
    if (numberOfDestDetails > 0) {
        for (const destName of Object.keys(destinationResults)) {
            const destination = destinations.find((d) => d.Name === destName);
            writeDestinationDetails(writer, destName, destinationResults[destName], destination?.UrlServiceType);
            const table = [
                Array.from(destinationTableFields.values()),
                Array.from(destinationTableFields.keys()).map((f) => destination?.[f])
            ];
            writer.addTable(table);
        }
    } else {
        writer.addLine(t('markdownText.noDestinationDetails'));
    }
}

/**
 * Write the table of destinations.
 *
 * @param writer - markdown writer
 * @param destinations - array of destinations
 */
function writeDestinations(writer: MarkdownWriter, destinations: Destination[] = []): void {
    const numberOfDestinations = destinations.length || 0;
    writer.addH2(t('markdownText.allDestinations', { numberOfDestinations }));
    if (numberOfDestinations > 0) {
        const table = [...destinations]
            .sort((a, b) => {
                if (a.Name > b.Name) {
                    return 1;
                }
                if (a.Name < b.Name) {
                    return -1;
                }
                return 0;
            })
            .map((d) => Array.from(destinationTableFields.keys()).map((f) => d[f]));
        table.unshift(Array.from(destinationTableFields.values()));
        writer.addTable(table);
    } else {
        writer.addLine(t('markdownText.noDestinations'));
    }
}

/**
 * Write the messages that were collected during check.
 *
 * @param writer - markdown writter
 * @param messages - array of messages
 */
function writeMessages(writer: MarkdownWriter, messages: ResultMessage[] = []): void {
    const numberOfMessages = messages.length || 0;
    writer.addH2(t('markdownText.messages', { numberOfMessages }));
    if (numberOfMessages > 0) {
        for (const message of messages) {
            if (message.severity === Severity.Debug) {
                writer.addDetails(severityMap[message.severity], message.text);
            } else {
                writer.addLine(`${severityMap[message.severity]}: ${message.text}`);
            }
        }
    } else {
        writer.addLine(t('markdownText.noMessages'));
    }
}

/**
 * Converts the envcheck results to markdown report.
 *
 * @param results - envcheck results
 * @returns - markdown report
 */
export function convertResultsToMarkdown(results: EnvironmentCheckResult): string {
    const writer = getMarkdownWriter();

    writer.addH1(t('markdownText.envCheckTitle'));
    writeEnvironment(writer, results.environment);
    writeDestinationResults(writer, results.destinationResults, results.destinations);
    writeDestinations(writer, results.destinations);
    writeMessages(writer, results.messages);

    writer.addSub(
        `${t('markdownText.createdAt')} ${new Date().toISOString().replace('T', ' ').substring(0, 19)} (UTC)`
    );

    return writer.toString();
}
