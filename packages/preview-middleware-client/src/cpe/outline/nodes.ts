import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import { isEditable } from './utils';

/**
 * Retrieves additional data for a given control ID.
 *
 * @param id The control ID for which to retrieve additional data
 * @returns An object containing additional data, including an optional 'text' property
 */
function getAdditionalData(id: string): { text?: string } {
    const control = sap.ui.getCore().byId(id);
    if (control?.getMetadata().getProperty('text')) {
        const text = control.getProperty('text');
        if (typeof text === 'string' && text.trim() !== '') {
            return {
                text
            };
        }
    }
    return {};
}

/**
 * Gets the children nodes of an aggregation type node.
 *
 * @param current The current node to retrieve children from
 * @returns An array of children nodes, or an empty array if none are found
 */
function getChildren(current: OutlineViewNode): OutlineViewNode[] {
    return (current.elements ?? []).flatMap((element: OutlineViewNode) =>
        element.type === 'aggregation' ? element.elements ?? [] : []
    );
}

/**
 * Transform node.
 *
 * @param input outline view node
 * @param scenario type of project
 * @returns Promise<OutlineNode[]>
 */
export async function transformNodes(input: OutlineViewNode[], scenario: Scenario): Promise<OutlineNode[]> {
    const stack = [...input];
    const items: OutlineNode[] = [];
    while (stack.length) {
        const current = stack.shift();
        const editable = isEditable(current?.id);
        if (current?.type === 'element') {
            const children = getChildren(current);
            const { text } = getAdditionalData(current.id);
            const technicalName = current.technicalName.split('.').slice(-1)[0];

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: text ?? technicalName,
                editable,
                visible: current.visible ?? true,
                children: await transformNodes(children, scenario)
            };

            items.push(node);
        }

        if (scenario === 'ADAPTATION_PROJECT' && current?.type === 'extensionPoint') {
            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: current.name!,
                editable,
                visible: current.visible ?? true,
                children: [],
                icon: current.icon
            };

            items.push(node);
        }
    }
    return items;
}
