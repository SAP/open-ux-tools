export interface ExtensionConfigKeys {
    AnnotationModeler?: string;
    AppGenerator?: string;
    ApplicationModeler?: string;
    Help?: string;
    RequirementsGathering?: string;
    ServiceModeler?: string;
    Internal?: string;
    [key: string]: string | boolean | undefined;
}

export type Feature = string;

export type FeatureToggle = {
    feature: Feature;
    isEnabled: boolean;
};
