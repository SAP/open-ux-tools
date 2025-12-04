import { ODataService } from '@sap-ux/axios-extension';
import { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import { Answers } from 'yeoman-generator';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import { promptNames, SelectedEntityAnswer, SelectedEntityAnswerAsJSONString } from './prompts';
import { AppConfig } from './types';
import { fetchData } from './odataQuery';

// todo: Create type for gen specific answers
export async function getData(
    odataService: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    answers: Answers // todo: narrower type
): Promise<string | object> {
    if (odataService.metadata && appConfig.appAccess && odataService.connectedSystem) {
        if (odataService.servicePath && appConfig.appAccess && appConfig.referencedEntities) {
            odataService.connectedSystem.serviceProvider.log = ODataDownloadGenerator.logger;
            const odataServiceProvider = odataService.connectedSystem?.serviceProvider.service<ODataService>(
                odataService.servicePath
            );

            if (answers[promptNames.confirmDownload] === true) {
                // this.state.appEntities = appConfig.referencedEntities;
                const selectedEntitiesAsJsonStrings = answers[promptNames.relatedEntitySelection] as SelectedEntityAnswerAsJSONString[];
                const selectedEntities = selectedEntitiesAsJsonStrings.map((entityAsJSONString) => {
                    return JSON.parse(entityAsJSONString) as SelectedEntityAnswer;
                });
                const result = await fetchData(
                    appConfig.referencedEntities,
                    odataServiceProvider!,
                    selectedEntities,
                    100
                );
                if (result.entityData) {
                    ODataDownloadGenerator.logger.info('Got result rows:' + `${result.entityData.length}`);
                    return result.entityData;
                } else if (result.error) {
                    return `${result.error}`;
                }
            }
        }
    }
    return 'Data was not fetched';
}
