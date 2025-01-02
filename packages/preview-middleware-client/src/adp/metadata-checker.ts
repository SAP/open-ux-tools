import { showInfoCenterMessage, MessageBarType } from '@sap-ux-private/control-property-editor-common';

import { CommunicationService } from '../cpe/communication-service';
import { MetadataResponseResult, checkMetadata } from './api-handler';

/**
 * Processes the results for each data source in the response.
 */
function processMetadataResults(results: MetadataResponseResult): void {
    Object.entries(results).forEach(([dataSourceId, data]) => {
        if (data.success) {
            CommunicationService.sendAction(
                showInfoCenterMessage({
                    message: {
                        title: `Metadata for Data Source '${dataSourceId}'`,
                        description: `Metadata available.`
                    },
                    type: MessageBarType.info
                })
            );
        } else {
            CommunicationService.sendAction(
                showInfoCenterMessage({
                    message: {
                        title: `Metadata retrieval failed for '${dataSourceId}'`,
                        description: data.message || 'No specific error message'
                    },
                    type: MessageBarType.error
                })
            );
        }
    });
}

/**
 * Main function that checks all data sources at once,
 * then iterates over the results and displays messages.
 */
export async function checkAllMetadata(): Promise<void> {
    try {
        const response = await checkMetadata();

        if (!response.success) {
            CommunicationService.sendAction(
                showInfoCenterMessage({
                    message: {
                        title: 'Metadata Retrieval Failed',
                        description: 'No data sources could be fetched.'
                    },
                    type: MessageBarType.error
                })
            );
            return;
        }

        processMetadataResults(response.results);
    } catch (e) {
        CommunicationService.sendAction(
            showInfoCenterMessage({
                message: {
                    title: 'Metadata Retrieval Error',
                    description: e?.message || 'An unknown error occurred'
                },
                type: MessageBarType.error
            })
        );
    }
}
