import { ConfirmQuestion } from '@sap-ux/inquirer-common';
import { OdataServiceAnswers, promptNames, ValueHelpDownloadPromptOptions } from '../../../../types';
import { ConnectionValidator } from '../../../connectionValidator';
import { AbapServiceProvider, ExternalService, ExternalServiceReference } from '@sap-ux/axios-extension';
import { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { getExternalServiceReferences, OdataVersion } from '@sap-ux/odata-service-writer';
import { ServiceAnswer } from '../service-selection/types';
import { down } from 'inquirer/lib/utils/readline';
import LoggerHelper from '../../../logger-helper';
import { t } from '../../../../i18n';
import { PromptState } from '../../../../utils';

export function getValueHelpDownloadPrompt(
    connectionValidator: ConnectionValidator,
    promptNamespace?: string,
    convertedMetadataRef?: {
        convertedMetadata: ConvertedMetadata | undefined;
    }
): ConfirmQuestion {
    const promptNamespacePart = `${promptNamespace ? promptNamespace + ':' : ''}`;
    const promptName = `${promptNamespacePart}${promptNames.valueHelpDownload}`;
    const servicePromptName = `${promptNamespacePart}${promptNames.serviceSelection}`;

    let externalServiceRefs: ExternalServiceReference[];
    let externalServiceMetadata: ExternalService[];

    const question: ConfirmQuestion = {
        when: (answers: { [servicePromptName]?: ServiceAnswer } | undefined) => {
            const servicePath = answers?.[servicePromptName]?.servicePath;
            if (servicePath && convertedMetadataRef?.convertedMetadata) {
                externalServiceRefs = getExternalServiceReferences(
                    servicePath,
                    convertedMetadataRef?.convertedMetadata
                );
                return externalServiceRefs.length > 0;
            }
            return false;
        },
        name: promptName,
        type: 'confirm',
        message: t('prompts.valueHelpDownload.message'),
        validate: async (downloadMetadata: boolean) => {
            delete PromptState.odataService.valueListMetadata;
            if (downloadMetadata && connectionValidator.serviceProvider instanceof AbapServiceProvider) {
                externalServiceMetadata = await (
                    connectionValidator.serviceProvider as AbapServiceProvider
                ).fetchExternalServices(externalServiceRefs);
                if (externalServiceMetadata.length === 0) {
                    LoggerHelper.logger.info(t('warnings.noExternalServiceMetdataFetched'));
                } else {
                    PromptState.odataService.valueListMetadata = externalServiceMetadata;
                }
            }
            return true;
        }
    };
    return question;
}
