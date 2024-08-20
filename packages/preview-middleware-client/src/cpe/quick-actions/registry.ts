import NavContainer from 'sap/m/NavContainer';
import FlexibleColumnLayout from 'sap/f/FlexibleColumnLayout';
import Control from 'sap/ui/core/Control';
import XMLView from 'sap/ui/core/mvc/XMLView';
import Log from 'sap/base/Log';

import { QuickActionActivationContext, QuickActionDefinitionGroup } from './quick-action-definition';

import type { ControlTreeIndex } from '../types';
import { getControlById } from '../../utils/core';
import { getRootControlFromComponentContainer } from '../utils';

const NAV_CONTAINER_CONTROL_TYPE = 'sap.m.NavContainer';
const FLEXIBLE_COLUMN_LAYOUT_CONTROL_TYPE = 'sap.f.FlexibleColumnLayout';

export interface QuickActionDefinitionProvider {
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[];
}

export interface ActivePage<T extends string> {
    name: T;
    view: XMLView;
}

export class QuickActionDefinitionRegistry<T extends string> {
    PAGE_NAME_MAP: Record<string, T> = {};
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        return [];
    }

    protected getActivePages(controlIndex: ControlTreeIndex): (Control | undefined)[] {
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
    protected getActiveViews(controlIndex: ControlTreeIndex): XMLView[] {
        const pages = this.getActivePages(controlIndex);
        const views: XMLView[] = [];

        for (const page of pages) {
            if (page) {
                const container = this.getComponentContainerFromPage(page);
                if (container) {
                    const rootControl = getRootControlFromComponentContainer(container);
                    if (rootControl) {
                        views.push(rootControl);
                    }
                }
            }
        }
        return views;
    }

    protected getComponentContainerFromPage(page: Control): Control | undefined {
        return page;
    }

    protected getActivePageContent(controlIndex: ControlTreeIndex): ActivePage<T>[] {
        const views = this.getActiveViews(controlIndex);
        const pages: ActivePage<T>[] = [];
        for (const view of views) {
            const name = view.getViewName();
            const pageName = this.PAGE_NAME_MAP[name];
            if (pageName) {
                pages.push({
                    name: pageName,
                    view
                });
            } else {
                Log.warning(`Could not find matching page for view of type "${name}".`);
            }
        }
        return pages;
    }
}
