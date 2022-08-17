import { countNumberOfServices, getServiceCountText } from '../formatter';
import { Severity, UrlServiceType } from '../types';
import type {
    DestinationResults,
    Destination,
    Environment,
    EnvironmentCheckResult,
    MarkdownWriter,
    ResultMessage,
    FlatDestination
} from '../types';
import { flattenObject } from 'utils';

/**
 * Output mapping from severity -> icon + text
 */
const severityMap = {
    [Severity.Error]: '🔴 &nbsp; Error',
    [Severity.Warning]: '🟡 &nbsp; Warning',
    [Severity.Log]: '🟢 &nbsp; Log',
    [Severity.Info]: 'ℹ Info'
};

/**
 * Column sequence of the destination table, first colun id, the column title
 */
const destinationTableFields = new Map<string, string>([
    ['name', 'Name'],
    ['description', 'Description'],
    ['host', 'Host'],
    ['sapClient', 'sap-client'],
    ['webIDEEnabled', 'WebIDEEnabled'],
    ['urlServiceType', 'Fiori tools usage'],
    ['usage', 'WebIDEUsage'],
    ['additionalData', 'WebIDEAdditionalData'],
    ['type', 'Type'],
    ['authentication', 'Authentication'],
    ['proxyType', 'ProxyType'],
    ['html5DynamicDestination', 'HTML5.DynamicDestination']
]);

/**
 * Convert enum UrlServiceType to text
 *
 * @param urlServiceType - classifaction of destination from getUrlServiceTypeForDest
 * @returns - meaningful text
 */
const urlServiceTypeToText = (urlServiceType: UrlServiceType): string => {
    let text: string;
    switch (urlServiceType) {
        case UrlServiceType.FullServiceUrl: {
            text = `Configured to be used by Fiori Generator as Full Service URL`;
            break;
        }
        case UrlServiceType.PartialUrl: {
            text = `Configured to be used by Fiori Generator as Partial URL`;
            break;
        }
        case UrlServiceType.CatalogServiceUrl: {
            text = `Configured to be used by Fiori Generator as Catalog Service`;
            break;
        }
        default: {
            text = `Wrong configuration, Fiori Generator cannot use this destination. Please check properties`;
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
 * Write the results for environment check
 *
 * @param writer - markdown writter
 * @param environment - environment results, like development environment, node version, etc
 */
function writeEnvironment(writer: MarkdownWriter, environment?: Environment): void {
    writer.addH2(`Environment`);
    if (environment) {
        writer.addLine(`Platform: \`${environment.platform}\``);
        writer.addLine(`Development environment: \`${environment.developmentEnvironment}\``);
        writer.addLine(`Dev Space Type: \`${environment.basDevSpace}\``);
        writer.addDetails(`Versions`, JSON.stringify(environment.versions, null, 4));
    } else {
        writer.addLine(`Environment not checked`);
    }
}

/**
 * Write the details of one destination
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
    writer.addH3(`Details for \`${destName}\``);
    if (destDetails.v2 && Array.isArray(destDetails.v2.results)) {
        writer.addLine(
            `✅ &nbsp; V2 catalog call returned ${getServiceCountText(countNumberOfServices(destDetails.v2))}`
        );
    } else {
        writer.addLine(`🚫 &nbsp; V2 catalog service not available`);
    }
    if (destDetails.v4 && Array.isArray(destDetails.v4.value)) {
        writer.addLine(
            `✅ &nbsp; V4 catalog call returned ${getServiceCountText(countNumberOfServices(destDetails.v4))}`
        );
    } else {
        writer.addLine(`🚫 &nbsp; V4 catalog service not available`);
    }
    if (destDetails.HTML5DynamicDestination) {
        writer.addLine(`✅ &nbsp; Destination property \`HTML5.DynamicDestination\` set to \`true\``);
    } else {
        writer.addLine(
            `🚫 &nbsp; Please ensure property \`HTML5.DynamicDestination\` is set to \`true\` in SAP BTP Cockpit -> 'Additional Properties'`
        );
    }
    if (urlServiceType) {
        writer.addLine(
            `${
                urlServiceType === UrlServiceType.InvalidUrl ? '🚫 &nbsp;' : '✅ &nbsp;'
            } SAP Fiori tools usage: ${urlServiceTypeToText(urlServiceType)}`
        );
    } else {
        writer.addLine(`🟡 &nbsp; No URL service type was determined.`);
    }
}

/**
 * Write the results for destination checks
 *
 * @param writer - markdown writter
 * @param destinationResults - results of destination checks that include the catalog services
 * @param destinations - list of all destinations
 */
function writeDestinationResults(
    writer: MarkdownWriter,
    destinationResults: { [dest: string]: DestinationResults } = {},
    destinations: FlatDestination[] = []
): void {
    const numberOfDestDetails = Object.keys(destinationResults).length;
    writer.addH2(`Destination Details (${numberOfDestDetails})`);
    if (numberOfDestDetails > 0) {
        for (const destName of Object.keys(destinationResults)) {
            const destination = destinations.find((d) => d.name === destName);
            writeDestinationDetails(writer, destName, destinationResults[destName], destination?.urlServiceType);
            const table = [
                Array.from(destinationTableFields.values()),
                Array.from(destinationTableFields.keys()).map((f) => destination?.[f])
            ];
            writer.addTable(table);
        }
    } else {
        writer.addLine(`No destination details`);
    }
}

/**
 * Write the table of destinations
 *
 * @param destinations - array of destinations
 * @param writer - markdown writter
 */
function writeDestinations(writer: MarkdownWriter, destinations: FlatDestination[] = []): void {
    const numberOfDestinations = destinations.length || 0;
    writer.addH2(`All Destinations (${numberOfDestinations})`);
    if (numberOfDestinations > 0) {
        const table = [...destinations]
            .sort((a, b) => {
                if (a.name > b.name) {
                    return 1;
                }
                if (a.name < b.name) {
                    return -1;
                }
                return 0;
            })
            .map((d) => Array.from(destinationTableFields.keys()).map((f) => d[f]));
        table.unshift(Array.from(destinationTableFields.values()));
        writer.addTable(table);
    } else {
        writer.addLine(`No destinations`);
    }
}

/**
 * Write the messages that were collected during check
 *
 * @param writer - markdown writter
 * @param messages - array of messages
 */
function writeMessages(writer: MarkdownWriter, messages: ResultMessage[] = []): void {
    const numberOfMessages = messages.length || 0;
    writer.addH2(`Messages (${numberOfMessages})`);
    if (numberOfMessages > 0) {
        for (const message of messages) {
            if (message.severity === Severity.Info) {
                writer.addDetails(severityMap[message.severity], message.text);
            } else {
                writer.addLine(`${severityMap[message.severity]}: ${message.text}`);
            }
        }
    } else {
        writer.addLine(`No messages`);
    }
}

/**
 * Converts the envcheck results to markdown report
 *
 * @param results - envcheck results
 * @returns - markdown report
 */
export function convertResultsToMarkdown(results: EnvironmentCheckResult): string {
    const writer = getMarkdownWriter();

    writer.addH1(`SAP Fiori tools - Environment Check in SAP Business Application Studio`);
    const destinations = flattenDestinationDetails(results.destinations);
    writeEnvironment(writer, results.environment);
    writeDestinationResults(writer, results.destinationResults, destinations);
    writeDestinations(writer, destinations);
    writeMessages(writer, results.messages);

    writer.addSub(`created at ${new Date().toISOString().replace('T', ' ').substring(0, 19)} (UTC)`);

    return writer.toString();
}

/**
 * Flattens destination details
 *
 * @param destinations
 * @returns details with no nested objects
 */
function flattenDestinationDetails(destinations: Destination[]): FlatDestination[] {
    const flattenDestinations = [];
    if (destinations) {
        for (const dest of destinations) {
            flattenDestinations.push(flattenObject(dest));
        }
    }
    return flattenDestinations;
}
