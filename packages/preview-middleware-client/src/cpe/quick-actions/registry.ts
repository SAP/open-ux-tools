import NavContainer from 'sap/m/NavContainer';
import FlexibleColumnLayout from 'sap/f/FlexibleColumnLayout';
import { LayoutType } from 'sap/f/library';
import Control from 'sap/ui/core/Control';
import XMLView from 'sap/ui/core/mvc/XMLView';
import Log from 'sap/base/Log';
import ComponentContainer from 'sap/ui/core/ComponentContainer';

import { QuickActionActivationContext, QuickActionDefinitionGroup } from './quick-action-definition';

import type { ControlTreeIndex } from '../types';
import { getControlById } from '../../utils/core';
import { getRootControlFromComponentContainer } from '../utils';

const NAV_CONTAINER_CONTROL_TYPE = 'sap.m.NavContainer';
const FLEXIBLE_COLUMN_LAYOUT_CONTROL_TYPE = 'sap.f.FlexibleColumnLayout';

export interface ActivePage<T extends string> {
    name: T;
    view: XMLView;
}

/**
 * Base class for Quick Action definition providers.
 *
 */
export abstract class QuickActionDefinitionRegistry<T extends string> {
    /**
     * Mapping of page view name to page type name.
     */
    PAGE_NAME_MAP: Record<string, T> = {};

    /**
     * Provides a list of Quick Action definitions that are applicable for the given context.
     *
     * @param _context - Activation context.
     */
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        throw new Error('Not implemented!');
    }

    /**
     * Finds component container from the page control.
     *
     * @param page - Page control provided by containers.
     * @returns ComponentContainer control.
     */
    protected getComponentContainerFromPage(page: Control): ComponentContainer | undefined {
        if (page instanceof ComponentContainer) {
            return page;
        }
        return undefined;
    }

    /**
     * Returns a list of Active pages based on the provided control index.
     *
     * @param controlIndex - Control tree index.
     * @returns A list of Active pages.
     */
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

    /**
     * Get all the root views of currently active pages.
     *
     * @param controlIndex - Control index.
     * @returns List of page root views.
     */
    private getActiveViews(controlIndex: ControlTreeIndex): XMLView[] {
        const pages = this.getActivePages(controlIndex);
        const views: XMLView[] = [];

        for (const page of pages) {
            if (page) {
                const container = this.getComponentContainerFromPage(page);
                const rootControl = getRootControlFromComponentContainer(container);
                if (rootControl) {
                    views.push(rootControl);
                }
            }
        }
        return views;
    }

    /**
     * Finds active page controls from the control tree index.
     *
     * @param controlIndex - Control tree index.
     * @returns A list of page controls.
     */
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
                return this.getVisibleFlexibleColumnLayoutPages(control);
            }
        }

        return [];
    }

    /**
     * Finds the visible Flexible Column Layout pages.
     * @param control - Flexible Column Layout control.
     * @returns A list of visible pages.
     */

    private getVisibleFlexibleColumnLayoutPages(control: FlexibleColumnLayout): (Control | undefined)[] {
        const layout = control.getLayout();
        switch (layout) {
            case LayoutType.OneColumn:
                return [control.getCurrentBeginColumnPage()];
            case LayoutType.MidColumnFullScreen:
                return [control.getCurrentMidColumnPage()];
            case LayoutType.EndColumnFullScreen:
                return [control.getCurrentEndColumnPage()];
            case LayoutType.ThreeColumnsBeginExpandedEndHidden:
            case LayoutType.ThreeColumnsMidExpanded:
            case LayoutType.ThreeColumnsMidExpandedEndHidden:
            case LayoutType.ThreeColumnsEndExpanded:
                return [
                    control.getCurrentBeginColumnPage(),
                    control.getCurrentMidColumnPage(),
                    control.getCurrentEndColumnPage()
                ];
            case LayoutType.TwoColumnsMidExpanded:
            case LayoutType.TwoColumnsBeginExpanded:
                return [control.getCurrentBeginColumnPage(), control.getCurrentMidColumnPage()];
        }
        return [];
    }
}
