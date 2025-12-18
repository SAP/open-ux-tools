import type { ODataService } from '@sap-ux/axios-extension';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import type { Answers } from 'yeoman-generator';
import type { EntitySetsFlat } from './odata-query';
import { fetchData } from './odata-query';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import type { SelectedEntityAnswer, SelectedEntityAnswerAsJSONString } from './prompts';
import { promptNames } from './prompts';
import type { AppConfig } from './types';

// todo: Create type for gen specific answers
/**
 *
 * @param odataService
 * @param appConfig
 * @param answers
 */
export async function getData(
    odataService: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    answers: Answers // todo: narrower type
): Promise<{ odataQueryResult: []; entitySetsQueried: EntitySetsFlat } | string> {
    if (odataService.metadata && appConfig.appAccess && odataService.connectedSystem) {
        if (odataService.servicePath && appConfig.appAccess && appConfig.referencedEntities) {
            odataService.connectedSystem.serviceProvider.log = ODataDownloadGenerator.logger;
            const odataServiceProvider = odataService.connectedSystem?.serviceProvider.service<ODataService>(odataService.servicePath);

            if (answers[promptNames.confirmDownload] === true) {
                // this.state.appEntities = appConfig.referencedEntities;
                const selectedEntitiesAsJsonStrings = answers[promptNames.relatedEntitySelection] as SelectedEntityAnswerAsJSONString[];
                const selectedEntities = selectedEntitiesAsJsonStrings.map((entityAsJSONString) => {
                    return JSON.parse(entityAsJSONString) as SelectedEntityAnswer;
                });
                const { odataResult, entitySetsQueried } = await fetchData(
                    appConfig.referencedEntities,
                    odataServiceProvider!,
                    // selectedEntities,
                    [],
                    1
                );
                if (odataResult.entityData) {
                    ODataDownloadGenerator.logger.info('Got result rows:' + `${odataResult.entityData.length}`);
                    return { odataQueryResult: odataResult.entityData, entitySetsQueried };
                } else if (odataResult.error) {
                    return `${odataResult.error}`;
                }
            }
        }
    }
    return 'Data was not fetched';
}
