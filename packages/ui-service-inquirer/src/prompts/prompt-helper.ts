import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { BusinessObjectsService, AbapCDSViewService } from '@sap-ux/axios-extension';
import { isAppStudio, type Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import type { AbapTarget, DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { ListChoiceOptions } from 'inquirer';
import { ERROR_TYPE, ErrorHandler, setTelemetryClient } from '@sap-ux/inquirer-common';
import type { ValidationLink } from '@sap-ux/inquirer-common';
import { ClientFactory } from '@sap-ux/telemetry';
import { HELP_NODES } from '@sap-ux/guided-answers-helper';
import { t } from '../i18n';

/**
 * Get the business objects.
 *
 * @param provider - the provider to get the business objects
 * @returns the business objects
 */
export async function getBusinessObjects(provider: AbapServiceProvider): Promise<ListChoiceOptions[]> {
    const businessObjectsService = await provider.getAdtService<BusinessObjectsService>(BusinessObjectsService);
    const businessObjects = await businessObjectsService?.getBusinessObjects();
    return (
        businessObjects?.map((bo: any) => {
            return { name: `${bo.name} (${bo.description})`, value: bo };
        }) ?? []
    );
}

/**
 * Get the ABAP CDS views.
 *
 * @param provider - the provider to get the ABAP CDS views
 * @returns the ABAP CDS views
 */
export async function getAbapCDSViews(provider: AbapServiceProvider): Promise<ListChoiceOptions[]> {
    const abapCDSViewsService = await provider.getAdtService<AbapCDSViewService>(AbapCDSViewService);
    const abapCDSViews = await abapCDSViewsService?.getAbapCDSViews();
    return (
        abapCDSViews?.map((abapCDSView: any) => {
            return { name: `${abapCDSView.name} (${abapCDSView.description})`, value: abapCDSView };
        }) ?? []
    );
}

/**
 * Create an ABAP target from backend system or destination.
 *
 * @param destination - the destination
 * @param backendSystem - the backend system
 * @returns the ABAP target
 */
export function createAbapTarget(destination?: Destination, backendSystem?: BackendSystem): AbapTarget {
    if (isAppStudio()) {
        return { destination: destination?.Name } as DestinationAbapTarget;
    } else {
        return { url: backendSystem?.url, client: backendSystem?.client } as UrlAbapTarget;
    }
}

/**
 * Get the service name choices.
 *
 * @param serviceName - the service name
 * @returns the service name choices
 */
export function getServiceNameChoices(serviceName: string): ListChoiceOptions[] {
    return [
        {
            name: serviceName,
            value: serviceName
        }
    ];
}

/**
 * Get the validation error link.
 *
 * @returns the validation error link
 */
export async function getValidationErrorLink(): Promise<ValidationLink> {
    setTelemetryClient(ClientFactory.getTelemetryClient());
    return ErrorHandler.getHelpLink(
        HELP_NODES.UI_SERVICE_GENERATOR,
        ERROR_TYPE.INTERNAL_SERVER_ERROR,
        t('ERROR_VALIDATING_CONTENT')
    );
}
