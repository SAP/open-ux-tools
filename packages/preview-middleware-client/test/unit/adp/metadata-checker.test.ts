import { checkAllMetadata } from '../../../src/adp/metadata-checker';
import { CommunicationService } from '../../../src/cpe/communication-service';
import { MetadataResponseResult, checkMetadata } from '../../../src/adp/api-handler';

jest.mock('../../../src/adp/api-handler', () => ({
    ...jest.requireActual('../../../src/adp/api-handler'),
    checkMetadata: jest.fn()
}));

const checkMetadataMock = checkMetadata as jest.Mock;

describe('Metadata Handler', () => {
    const sendActionSpy = jest.spyOn(CommunicationService, 'sendAction');

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkAllMetadata', () => {
        it('should process metadata results when checkMetadata succeeds', async () => {
            const mockResults: MetadataResponseResult = {
                dataSource1: { success: true, metadata: '<xml>...</xml>' },
                dataSource2: { success: false, message: 'Request failed with status code 500' }
            };
            checkMetadataMock.mockResolvedValueOnce({ results: mockResults });

            await checkAllMetadata();

            expect(checkMetadataMock).toHaveBeenCalled();
            expect(sendActionSpy).toHaveBeenCalledTimes(2);
            expect(sendActionSpy).toHaveBeenNthCalledWith(1, {
                type: '[ext] show-info-center-message',
                payload: {
                    message: {
                        description: "Metadata available for 'dataSource1'.",
                        title: "Metadata for Data Source 'dataSource1'"
                    },
                    type: 0
                }
            });
            expect(sendActionSpy).toHaveBeenNthCalledWith(2, {
                type: '[ext] show-info-center-message',
                payload: {
                    message: {
                        description: 'Request failed with status code 500',
                        title: "Metadata for Data Source 'dataSource2'"
                    },
                    type: 1
                }
            });
        });

        it('should send a warning when checkMetadata throws an error', async () => {
            checkMetadataMock.mockRejectedValueOnce(new Error('Network error'));

            await checkAllMetadata();

            expect(checkMetadataMock).toHaveBeenCalled();

            expect(sendActionSpy).toHaveBeenNthCalledWith(1, {
                type: '[ext] show-info-center-message',
                payload: {
                    message: {
                        description: 'No data sources could be fetched.',
                        title: 'Metadata Retrieval Failed'
                    },
                    type: 5
                }
            });
        });
    });
});
