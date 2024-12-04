import type { ExtensionConfigKeys } from './types';

export const extensionConfigKeys: ExtensionConfigKeys = {
    AnnotationModeler: 'sap.ux.annotationModeler',
    AppGenerator: 'sap.ux.appGenerator',
    ApplicationModeler: 'sap.ux.applicationModeler',
    Help: 'sap.ux.help',
    ServiceModeler: 'sap.ux.serviceModeler',
    Internal: 'sap.ux.internal'
} as ExtensionConfigKeys;

export const tokenToggleGuid: ExtensionConfigKeys = {
    'sap.ux.help.testBetaFeatures.enableAppStudioGDContribution': 'c8c52f0b-0d7d-4697-997a-d6f29814f42e',
    'sap.ux.help.testBetaFeatures.showTestGuides': 'fbb03f42-0a86-4fd5-9fc4-8c9b38a4d1a3',
    'sap.ux.help.testBetaFeatures.enableFioriAI': '165a0e31-35ea-4bee-8d47-b8593435a82d',
    'sap.ux.help.testBetaFeatures.enableFioriAIJoule': '165a0e31-35ea-4bee-8d47-b8593435a82e',
    'sap.ux.help.testBetaFeatures.enableFioriAIVsCode': '165a0e31-35ea-4bee-8d47-b8593435a82f',
    'sap.ux.help.testBetaFeatures.enableFioriAIAppModeler': '165a0e31-35ea-4bee-8d47-b8593435a82g',
    'sap.ux.applicationModeler.testBetaFeatures.manifestEditor': true,
    'sap.ux.appGenerator.testBetaFeatures.newAnnotationAPI': true
} as ExtensionConfigKeys;

export const FeatureToggleKey = 'testBetaFeatures';
export const ExperimentalFeatures = 'sap.ux.applicationModeler.enableExperimentalFeatures';
