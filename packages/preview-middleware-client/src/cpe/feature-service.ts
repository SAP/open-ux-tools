export class FeatureService {
    private static features: Record<string, boolean> = {};

    static {
        // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-access, @sap-ux/fiori-tools/sap-browser-api-warning
        const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
        const features = bootstrapConfig?.dataset.openUxPreviewFeatures;
        if (features) {
            const featureToggles = JSON.parse(features) as { feature: string; isEnabled: boolean }[];
            for (const { feature, isEnabled } of featureToggles) {
                this.features[feature] = isEnabled;
            }
        }
    }

    /**
     * Checks if given feature is enabled.
     *
     * @param featureId - Id of the feature.
     * @returns true if feature is enabled.
     */
    public static isFeatureEnabled(featureId: string): boolean {
        return this.features[featureId] ?? false;
    }
}
