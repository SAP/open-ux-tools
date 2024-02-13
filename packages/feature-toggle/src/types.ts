export interface ExtensionConfigKeys {
    AnnotationModeler?: string;
    AppGenerator?: string;
    ApplicationModeler?: string;
    Help?: string;
    ServiceModeler?: string;
    Internal?: string;
    [key: string]: string | boolean | undefined;
}

export type FeatureToggle = {
    feature: string;
    isEnabled: boolean;
};
