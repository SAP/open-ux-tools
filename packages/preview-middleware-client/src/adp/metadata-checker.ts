import { showInfoCenterMessage, MessageBarType } from '@sap-ux-private/control-property-editor-common';

import { CommunicationService } from '../cpe/communication-service';
import { MetadataResponseResult, checkMetadata } from './api-handler';

/**
 * Utility function to send a message to the Info Center.
 *
 * @param title - Title of the message.
 * @param description - Description text of the message.
 * @param type - Type of the message (info, error, warning, etc.).
 */
function sendInfoCenterMessage(title: string, description: string, type: MessageBarType): void {
    CommunicationService.sendAction(
        showInfoCenterMessage({
            message: { title, description },
            type
        })
    );
}

/**
 * Processes the results for each data source in the response.
 *
 * @param results - The metadata response results for each data source.
 */
function processMetadataResults(results: MetadataResponseResult): void {
    Object.entries(results).forEach(([dataSourceId, data]) => {
        const title = `Metadata for Data Source '${dataSourceId}'`;
        const description = data.success
            ? `Metadata available for '${dataSourceId}'.`
            : data.message || 'No specific error message';
        const type = data.success ? MessageBarType.info : MessageBarType.error;

        sendInfoCenterMessage(title, description, type);
    });
}

/**
 * Main function that checks all data sources at once, then iterates over the results and displays messages.
 */
export async function checkAllMetadata(): Promise<void> {
    try {
        const response = await checkMetadata();

        processMetadataResults(response.results);
    } catch (error) {
        sendInfoCenterMessage('Metadata Retrieval Failed', 'No data sources could be fetched.', MessageBarType.warning);
    }
}
