export * from './types';
import type { AbapServiceProvider, UiServiceGenerator } from '@sap-ux/axios-extension';
import { BusinessObjectsService, AbapCDSViewService } from '@sap-ux/axios-extension';

export class PromptState {
    public static uiCreateService: UiServiceGenerator | undefined;
    public static provider: AbapServiceProvider | undefined;
    public static isLocalPackage: boolean;

    static reset(): void {
        PromptState.uiCreateService = undefined;
        PromptState.provider = undefined;
        PromptState.isLocalPackage = false;
    }
}

export async function getBusinessObjects(provider: AbapServiceProvider) {
    const businessObjectsService = await provider.getAdtService<BusinessObjectsService>(BusinessObjectsService);
    const businessObjects = await businessObjectsService?.getBusinessObjects();
    return businessObjects?.map((bo: any) => {
        return { name: `${bo.name} (${bo.description})`, value: bo };
    });
}

export async function getAbapCDSViews(provider: AbapServiceProvider) {
    const abapCDSViewsService = await provider.getAdtService<AbapCDSViewService>(AbapCDSViewService);
    const abapCDSViews = await abapCDSViewsService?.getAbapCDSViews();
    return abapCDSViews?.map((abapCDSView: any) => {
        return { name: `${abapCDSView.name} (${abapCDSView.description})`, value: abapCDSView };
    });
}
