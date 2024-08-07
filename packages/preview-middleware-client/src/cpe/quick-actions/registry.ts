import NavContainer from 'sap/m/NavContainer';
import FlexibleColumnLayout from 'sap/f/FlexibleColumnLayout';
import XMLView from 'sap/ui/core/mvc/XMLView';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import UIComponent from 'sap/ui/core/UIComponent';

import { QuickActionActivationContext, QuickActionDefinitionGroup } from './quick-action-definition';

import type { ControlTreeIndex } from '../types';
import { getControlById } from '../utils';
import { getComponent } from '../ui5-utils';
import Control from 'sap/ui/core/Control';

const NAV_CONTAINER_CONTROL_TYPE = 'sap.m.NavContainer';
const FLEXIBLE_COLUMN_LAYOUT_CONTROL_TYPE = 'sap.f.FlexibleColumnLayout';

export interface QuickActionDefinitionProvider {
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[]
}

export class QuickActionDefinitionRegistry {
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        return [];
    }

    protected getActiveViews(controlIndex: ControlTreeIndex): XMLView[] {
        const pages = this.getActivePages(controlIndex);

        const views = pages
            .map((page): XMLView | undefined => {
                if (page instanceof XMLView) {
                    const container = page.getContent()[0];
                    if (container instanceof ComponentContainer) {
                        const componentId = container.getComponent();
                        const component = getComponent(componentId);
                        if (component instanceof UIComponent) {
                            const rootControl = component.getRootControl();
                            if (rootControl instanceof XMLView) {
                                return rootControl;
                            }
                        }
                    }
                }
                return undefined;
            })
            .filter((view: XMLView | undefined): view is XMLView => view !== undefined);
        return views;
    }

    private getActivePages(controlIndex: ControlTreeIndex): (Control | undefined)[] {
        const navContainerNode = controlIndex[NAV_CONTAINER_CONTROL_TYPE]?.[0];
        if (navContainerNode) {
            const control = getControlById(navContainerNode.controlId);
            if (control instanceof NavContainer) {
                return [control.getCurrentPage()];
            }
        }

        const flexibleLayoutNode = controlIndex[FLEXIBLE_COLUMN_LAYOUT_CONTROL_TYPE]?.[0];
        if (flexibleLayoutNode) {
            const control = getControlById(flexibleLayoutNode.controlId);
            if (control instanceof FlexibleColumnLayout) {
                return [
                    control.getCurrentBeginColumnPage(),
                    control.getCurrentMidColumnPage(),
                    control.getCurrentEndColumnPage()
                ];
            }
        }

        return [];
    }
}
