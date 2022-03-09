import type { SemVer } from 'semver';
import { default as semVer } from 'semver';
import { TemplateTypeAttributes } from './data/templateAttributes';
import { t } from './i18n';
import { ValidationError } from './types';
import type { FioriElementsApp } from './types';

/**
 * Validates a selection of specified app settings.
 *
 * @param feApp - Fiori elements application configuration
 */
export function validateApp<T>(feApp: FioriElementsApp<T>): void {
    // Validate odata version
    if (
        feApp.service.version &&
        !TemplateTypeAttributes[feApp.template.type].supportedODataVersions.includes(feApp.service.version)
    ) {
        throw new ValidationError(
            t('error.unsupportedOdataVersion', {
                serviceVersion: feApp.service.version,
                templateType: feApp.template.type
            })
        );
    }

    // Validate ui5 versions if present (defaults will apply otherwise)
    let ui5Version: SemVer | null;

    if (feApp.ui5?.version) {
        ui5Version = semVer.coerce(feApp.ui5?.version);
        if (!ui5Version) {
            throw new ValidationError(
                t('error.invalidUI5Version', { versionProperty: 'version', ui5Version: feApp.ui5?.version })
            );
        }
    }

    let minUI5Version: SemVer | null;

    if (feApp.ui5?.minUI5Version) {
        minUI5Version = semVer.coerce(feApp.ui5?.minUI5Version);
        if (!minUI5Version) {
            throw new ValidationError(
                t('error.invalidUI5Version', { versionProperty: 'minUI5Version', ui5Version: feApp.ui5?.minUI5Version })
            );
        }
    }

    const minRequiredUi5Version = TemplateTypeAttributes[feApp.template.type].minimumUi5Version[feApp.service.version]!;

    if (semVer.lt(ui5Version!, minRequiredUi5Version)) {
        throw new ValidationError(
            t('error.unsupportedUI5Version', {
                versionProperty: 'version',
                ui5Version: feApp.ui5?.version,
                templateType: feApp.template.type
            })
        );
    }

    if (semVer.lt(minUI5Version!, minRequiredUi5Version)) {
        throw new ValidationError(
            t('error.unsupportedUI5Version', {
                versionProperty: 'minUI5Version',
                ui5Version: feApp.ui5?.minUI5Version,
                templateType: feApp.template.type
            })
        );
    }
}

/**
 * Validates the specified FioriElementsApp contains the required properties.
 *
 * @param feApp - Fiori elements application configuration
 */
export function validateRequiredProperties<T>(feApp: FioriElementsApp<T>): void {
    // Service is mandatory for generation of Fiori Elements apps
    if (!feApp.service) {
        throw new ValidationError(
            t('error.missingRequiredProperty', {
                propertyName: 'FioriElementsApp.service'
            })
        );
    }
}
