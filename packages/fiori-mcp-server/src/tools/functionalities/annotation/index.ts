import type {
    ExecuteFunctionalitiesInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { getProject } from '@sap-ux/project-access';
import { ADD_PAGE } from '../../../constant';
import { resolveApplication } from '../../utils';
import { FIORI_FEATURES } from './features';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import { getServiceName } from './utils';
import { MetadataElement } from '@sap-ux/odata-annotation-core-types';
import { searchCDSFiles } from './search';
import { fileURLToPath } from 'url';
import { FioriFeature } from './types';

// Create a comprehensive response that guides the LLM to extract and search
const availableFeatures = FIORI_FEATURES.map(
    (feature) =>
        `**Category**: ${feature.category}\n    **Name**: ${feature.name}\n    **Description**: ${feature.description}`
).join('\n');

const supportedFeatureMsg = `
These are supported features:
${availableFeatures}
Based on user query, extract features which MUST conforms to following JSON format:
[{
    name: string; // Name of the feature
    id: string; // which is usually a kebab-case version of the name
}]
`;

export const MODIFY_ANNOTATION_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    id: 'modify-annotations',
    name: 'modify annotations file in the project',
    description: `Use this functionality for any operations on related to: \n\n ${FIORI_FEATURES.map(
        (f) => f.name
    ).join(', ')}.`,
    parameters: [
        {
            id: 'supportedFeatures',
            type: 'string',
            examples: [JSON.stringify([{ name: 'Selection Fields', id: 'selection-fields' }])],
            description: supportedFeatureMsg,
            required: true
        }
    ]
};

async function getFunctionalityDetails(params: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    return MODIFY_ANNOTATION_FUNCTIONALITY;
}

async function executeFunctionality(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, parameters } = params;
    const { supportedFeatures } = parameters;
    let features = supportedFeatures as FioriFeature[] | string;
    if (typeof supportedFeatures === 'string') {
        try {
            features = JSON.parse(supportedFeatures);
        } catch (error) {
            return {
                functionalityId: MODIFY_ANNOTATION_FUNCTIONALITY.id,
                status: 'Failed',
                message: `Error parsing supportedFeatures parameter. Please provide a valid JSON array of features. ${supportedFeatureMsg}`,
                parameters: [],
                appPath: appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }
    }
    features = features as FioriFeature[];
    if (features?.length === 0) {
        return {
            functionalityId: MODIFY_ANNOTATION_FUNCTIONALITY.id,
            status: 'Failed',
            message: `No feature found. ${supportedFeatureMsg}`,
            parameters: [],
            appPath: appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
    if (features.length > 1) {
        return {
            functionalityId: MODIFY_ANNOTATION_FUNCTIONALITY.id,
            status: 'Failed',
            message: `Multiple features found. Please select which features you want annotation to apply. Possible features are: ${features
                .map((i) => `Name: ${i.name} \n Description: ${i.description}`)
                .join(', ')}`,
            parameters: [],
            appPath: appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
    const feature = FIORI_FEATURES.find((f) => f.name === features[0].name || f.id === features[0].id);
    if (!feature) {
        return {
            functionalityId: MODIFY_ANNOTATION_FUNCTIONALITY.id,
            status: 'Failed',
            message: `Feature "${features[0].name}" not recognized or supported. Please select from supported features. ${supportedFeatureMsg}`,
            parameters: [],
            appPath: appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
    const appDetails = await resolveApplication(appPath);
    if (!appDetails?.applicationAccess) {
        return {
            functionalityId: ADD_PAGE,
            status: 'Failed',
            message: `Project root not found for app path: ${appPath}`,
            parameters: [],
            appPath: appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
    const { appId, applicationAccess } = appDetails;

    const projectNew = await getProject(applicationAccess.project.root);
    const serviceName = await getServiceName(applicationAccess);
    const annotationService = await FioriAnnotationService.createService(projectNew, serviceName, appId);
    await annotationService.sync();

    const metadataService = annotationService.getMetadataService();
    const targets: {
        kind: string;
        path: string;
        properties: {
            name: string;
            type: string;
        }[];
    }[] = [];
    const visitMD = (mdElement: MetadataElement) => {
        const { path, name } = mdElement;
        const kind = metadataService?.getEdmTargetKinds(path)[0] || '';
        if (kind === 'EntityType' || kind === 'Property') {
            const properties = mdElement.content.map((p) => ({ name: p.name, type: p.edmPrimitiveType ?? 'Unknown' }));
            targets.push({ kind, path, properties });
            targets.push({ kind, path, properties });
        }
    };
    metadataService.visitMetadataElements(visitMD);
    const cdsFiles = await annotationService.getAllFiles();
    const message = await searchCDSFiles(
        cdsFiles.map((i) => fileURLToPath(i.uri)),
        feature,
        appPath,
        targets
    );
    return {
        message,
        appPath: params.appPath,
        changes: [],
        functionalityId: MODIFY_ANNOTATION_FUNCTIONALITY.id,
        parameters: [],
        status: 'success',
        timestamp: new Date().toISOString()
    };
}

export const modifyAnnotationHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
