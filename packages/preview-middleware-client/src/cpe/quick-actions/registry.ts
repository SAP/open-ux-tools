import NavContainer from 'sap/m/NavContainer';
import FlexibleColumnLayout from 'sap/f/FlexibleColumnLayout';

import { QuickActionActivationContext, QuickActionDefinitionGroup } from './quick-action-definition';

import type { ControlTreeIndex } from '../types';
import { getControlById } from '../utils';
import Control from 'sap/ui/core/Control';

const NAV_CONTAINER_CONTROL_TYPE = 'sap.m.NavContainer';
const FLEXIBLE_COLUMN_LAYOUT_CONTROL_TYPE = 'sap.f.FlexibleColumnLayout';

export interface QuickActionDefinitionProvider {
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[];
}

export class QuickActionDefinitionRegistry {
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
}
