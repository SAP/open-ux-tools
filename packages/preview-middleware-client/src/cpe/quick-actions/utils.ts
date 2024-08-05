import UI5Element from 'sap/ui/core/Element';

import { QuickActionContext } from './definitions/quick-action-definition';
import { ControlTreeIndex } from '../types';
import NavContainer from 'sap/m/NavContainer';
import Control from 'sap/ui/core/Control';
import ManagedObject from 'sap/ui/base/ManagedObject';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import RuntimeAuthoring, { FEAppPage } from 'sap/ui/rta/RuntimeAuthoring';
import FlexibleColumnLayout from 'sap/f/FlexibleColumnLayout';

export interface FEAppPageInfo {
    page: FEAppPage;
    isInvisible: boolean;
}
export interface FEAppPagesMap {
    [key: string]: FEAppPageInfo[];
}

export function getFEAppPagesMap(rta: RuntimeAuthoring): FEAppPagesMap {
    const pages = rta.getRootControlInstance().getRootControl().getPages();
    const pagesMap: FEAppPagesMap = {};
    for (const page of pages) {
        const pageContent = page.getContent();
        if (pageContent?.length) {
            const pageName = pageContent[0].getComponentInstance()?.getMetadata().getComponentName();
            const isInvisible = page.hasStyleClass('sapMNavItemHidden');
            if (!pagesMap[pageName]) {
                pagesMap[pageName] = [];
            }
            pagesMap[pageName].push({
                page,
                isInvisible
            });
        }
    }
    return pagesMap;
}


export function getCurrentActivePages(controlIndex: ControlTreeIndex): Control[] {
    const controlName = ['sap.m.NavContainer', 'sap.f.FlexibleColumnLayout'].find((item) => !!controlIndex?.[item]);
    const collectActivePages = [];

    if (controlName) {
        const control = controlIndex?.[controlName]?.[0];
        if (control) {
            const container = sap.ui.getCore().byId(control.controlId);
            if (container?.isA('sap.m.NavContainer')) {
                const navContainer = container as NavContainer;
                collectActivePages.push(navContainer.getCurrentPage());
            } else if (container?.isA('sap.f.FlexibleColumnLayout')) {
                const flexibleColLayoutContainer = container as FlexibleColumnLayout;
                collectActivePages.push(
                    flexibleColLayoutContainer.getCurrentBeginColumnPage(),
                    flexibleColLayoutContainer.getCurrentMidColumnPage(),
                    flexibleColLayoutContainer.getCurrentEndColumnPage()
                );
            }
        }
    }

    return collectActivePages;
}

export function getRelevantControlFromActivePage(
    context: QuickActionContext,
    activePage: Control,
    controlTypes: string[]
): UI5Element[] {
    const relavantControls: UI5Element[] = [];
    for (const type of controlTypes) {
        const controls = context.controlIndex[type] || [];
        for (const control of controls) {
            const isActionApplicable = pageHasControlId(activePage, control.controlId);
            const UI5ControlData = sap.ui.getCore().byId(control.controlId);
            if (isActionApplicable && UI5ControlData) {
                relavantControls.push(UI5ControlData);
            }
        }
    }
    return relavantControls;
}

export function getTargetView(modifiedControl: ManagedObject) {
    if (modifiedControl && modifiedControl.isA('sap.ui.core.ComponentContainer')) {
        const oComponent = (modifiedControl as ComponentContainer).getComponentInstance();
        modifiedControl = oComponent && oComponent.getRootControl();
    }
    while (modifiedControl && !modifiedControl.isA('sap.ui.core.mvc.View')) {
        modifiedControl = modifiedControl.getParent();
    }
    return modifiedControl;
}
export function getPageName(modifiedControl: ManagedObject) {
    const modifiedControl1 = getTargetView(modifiedControl);
    return modifiedControl1.getId().split('::').pop();
}

export function getReference(modifiedControl: ManagedObject) {
    // probably same as flexsetting id or base id TODO: CONFIRM
    const manifest = getAppComponent(modifiedControl).getManifest();
    return manifest['sap.app'].id;
}

export function getAppComponent(control: ManagedObject) {
    const ownerComponent = Component.getOwnerComponentFor(control);
    if (ownerComponent) {
        return ownerComponent.getAppComponent();
    }
}


export function pageHasControlId(page: Control, controlId: string): boolean {
    const controlDomElement = sap.ui.getCore().byId(controlId)?.getDomRef();
    return !!controlDomElement && !!page.getDomRef()?.contains(controlDomElement);
}

/**
 * Determines Fiori Elements version based on the manifest.json
 * @param manifest
 */
export function getFeVersion(manifest: any): 'v2' | 'v4' | undefined {
    if (manifest['sap.ui.generic.app'] || manifest['sap.ovp']) {
        return 'v2';
    } else if (manifest['sap.ui5']?.routing?.targets) {
        let hasV4pPages = false;
        Object.keys(manifest['sap.ui5'].routing.targets).forEach((target) => {
            if (manifest['sap.ui5'].routing.targets[target].name?.startsWith('sap.fe.templates.')) {
                hasV4pPages = true;
            }
        });
        if (hasV4pPages) {
            return 'v4';
        } else {
            return undefined;
        }
    } else {
        return 'v4';
    }
}
