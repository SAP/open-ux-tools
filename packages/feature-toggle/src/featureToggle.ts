import type { FeatureToggle } from './types';
import { extensionConfigKeys, tokenToggleGuid, FeatureToggleKey, ExperimentalFeatures } from './constants';

/**
 * Utility class for accessing and managing feature toggles.
 */
export class FeatureToggleAccess {
    public static readonly vscode = getVSCodeInstance();

    /**
     * Retrieves the toggle state of the specified feature.
     *
     * @param feature the feature to retrieve the toggle state for.
     * @returns the toggle state of the feature.
     */
    public static getFeatureToggle(feature: string): FeatureToggle {
        let toggleConfigValue: boolean | undefined;

        if ((feature.includes(FeatureToggleKey) || feature === ExperimentalFeatures) && FeatureToggleAccess.vscode) {
            const toggleKey = feature.slice(0, feature.lastIndexOf('.'));
            const toggleId = feature.slice(feature.lastIndexOf('.') + 1, feature.length);
            toggleConfigValue = FeatureToggleAccess.vscode.workspace.getConfiguration(toggleKey)?.get(toggleId);
        } else {
            toggleConfigValue = false;
        }

        // if TOOLSUITE_FEATURES env is set check if the feature is enabled there.
        if (process.env.TOOLSUITE_FEATURES) {
            const envFeatures = process.env.TOOLSUITE_FEATURES.split(',');
            toggleConfigValue = envFeatures.includes(feature) ? true : toggleConfigValue;
        }

        // toggle token matches so set to true
        if (tokenToggleGuid[feature]) {
            if (tokenToggleGuid[feature] === toggleConfigValue) {
                toggleConfigValue = true;
            } else {
                // it is a token toggle, but the token does not match
                toggleConfigValue = false;
            }
        }

        const featureToggle: FeatureToggle = {
            feature: feature,
            isEnabled: toggleConfigValue === true ? toggleConfigValue : false
        };

        return featureToggle;
    }

    /**
     * Retrieves all feature toggles.
     *
     * @returns an array of defined feature toggles.
     */
    public static getAllFeatureToggles(): Array<FeatureToggle> {
        const definedToggles: Array<FeatureToggle> = [];
        if (FeatureToggleAccess.vscode) {
            Object.keys(extensionConfigKeys).forEach((toggleConfigKey: string) => {
                const toggleKey = `${extensionConfigKeys[toggleConfigKey]}.${FeatureToggleKey}`;
                let toggles = {};
                try {
                    toggles = JSON.parse(
                        JSON.stringify(FeatureToggleAccess.vscode.workspace.getConfiguration(toggleKey))
                    );
                } catch {
                    // Not valid toggles. Skip.
                }

                Object.keys(toggles).forEach((toggleId: string) => {
                    // get full toggle value
                    const toggleConfigValue = FeatureToggleAccess.vscode.workspace
                        .getConfiguration(`${toggleKey}`)
                        .get(`${toggleId}`);
                    const toggle: FeatureToggle = {
                        feature: `${toggleKey}.${toggleId}`,
                        isEnabled: toggleConfigValue ? (toggleConfigValue as boolean) : false
                    };
                    definedToggles.push(toggle);
                });
            });
        }
        // if TOOLSUITE_FEATURES env is set check if the feature is enabled there.
        else if (process.env.TOOLSUITE_FEATURES) {
            const envFeatures = process.env.TOOLSUITE_FEATURES.split(',');
            for (const feature of envFeatures) {
                const toggle: FeatureToggle = {
                    feature,
                    isEnabled: true
                };
                definedToggles.push(toggle);
            }
        }
        return definedToggles;
    }
}

/**
 * Returns an instance of vscode vscode if available.
 *
 * @returns instance of vscode
 */
function getVSCodeInstance(): any {
    let vscode;
    try {
        vscode = require('vscode');
    } catch {
        // Vscode not available. Normally in CLI
    }
    return vscode;
}

/**
 * Enables a feature without a vscode reference by adding it to the TOOLSUITE_FEATURES environment variables.
 *
 * @param feature name of feature
 */
export function enableFeature(feature: string): void {
    let envFeatures: string[] = [];
    if (process.env.TOOLSUITE_FEATURES) {
        envFeatures = process.env.TOOLSUITE_FEATURES.split(',');
        if (!envFeatures.includes(feature)) {
            envFeatures.push(feature);
        }
    } else {
        envFeatures.push(feature);
    }
    process.env.TOOLSUITE_FEATURES = envFeatures.join();
}

/**
 * Checks if the provided feature toggle is enabled.
 *
 * @param feature name of feature
 * @returns {boolean} true if feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
    return FeatureToggleAccess.getFeatureToggle(feature).isEnabled;
}

/**
 * Checks the internal enablement extension's `sap.ux.internal.enableInternalFeatures` config setting.
 *
 * @returns {boolean} true if the internal enablement is active
 */
export function isInternalFeaturesSettingEnabled(): boolean {
    const enableInternalFeaturesSetting = 'sap.ux.internal.enableInternalFeatures';
    let internalEnabled = false;
    if (FeatureToggleAccess.vscode) {
        const internalSetting = FeatureToggleAccess.vscode.workspace
            ? FeatureToggleAccess.vscode.workspace.getConfiguration()?.get(enableInternalFeaturesSetting)
            : false;
        internalEnabled = internalSetting ?? false;
    }
    if (process.env.TOOLSUITE_INTERNAL && process.env.TOOLSUITE_INTERNAL === 'true') {
        internalEnabled = true;
    }
    return internalEnabled;
}
