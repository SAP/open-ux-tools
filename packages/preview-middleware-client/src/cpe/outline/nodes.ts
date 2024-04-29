import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import { isEditable } from './utils';

type ExtendedOutlineNode = OutlineNode & {
    extensionPointInfo: { defaultContent: string[]; createdControls: string[] };
};

interface AdditionalData {
    text?: string;
    technicalName?: string;
}

/**
 * Retrieves additional data for a given control ID.
 *
 * @param {string} id The unique identifier of the control.
 * @returns {AdditionalData} An object containing the text and the technical name of the control.
 */
function getAdditionalData(id: string): AdditionalData {
    const control = sap.ui.getCore().byId(id);
    if (!control) {
        return {};
    }

    const metadata = control.getMetadata();
    let details: AdditionalData = {};

    const technicalName = metadata.getElementName();
    if (technicalName) {
        details.technicalName = technicalName;
    }

    if (metadata.getProperty('text')) {
        const text = control.getProperty('text');
        if (typeof text === 'string' && text.trim() !== '') {
            details.text = text;
        }
    }

    return details;
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
 * Adds a new child node to the extension point's children array based on the given control ID.
 *
 * @param {string} id - The unique identifier of the control to be added as a child node.
 * @param {OutlineNode[]} children - The array of children nodes to which the new node will be added.
 */
function addChildToExtensionPoint(id: string, children: OutlineNode[]) {
    const { text, technicalName } = getAdditionalData(id);
    const editable = isEditable(id);

    children.push({
        controlId: id,
        controlType: technicalName ?? 'sap.ui.extensionpoint.child',
        name: text ?? id,
        visible: true,
        editable,
        children: [],
        hasDefaultContent: false
    });
}

/**
 * Transform node.
 *
 * @param input outline view node
 * @param scenario type of project
 * @returns Promise<OutlineNode[]>
 */
export async function transformNodes(
    input: OutlineViewNode[],
    scenario: Scenario,
    uniqueIDs: Set<string>
): Promise<OutlineNode[]> {
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
                children: await transformNodes(children, scenario, uniqueIDs)
            };

            items.push(node);
        }

        if (scenario === 'ADAPTATION_PROJECT' && current?.type === 'extensionPoint') {
            const extensionPointInfo = (current as unknown as ExtendedOutlineNode).extensionPointInfo;

            const hasDefaultContent = extensionPointInfo?.defaultContent.length > 0;
            const hasCreatedControls = extensionPointInfo?.createdControls.length > 0;

            let children: OutlineNode[] = [];

            if (hasDefaultContent) {
                extensionPointInfo?.defaultContent.forEach((id) => {
                    uniqueIDs.add(id);
                    addChildToExtensionPoint(id, children);
                });
            }

            if (hasCreatedControls) {
                extensionPointInfo?.createdControls.forEach((id) => {
                    uniqueIDs.add(id);
                    addChildToExtensionPoint(id, children);
                });
            }

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: current.name!,
                editable,
                visible: current.visible ?? true,
                children,
                icon: current.icon,
                hasDefaultContent
            };

            items.push(node);
        }
    }
    return items;
}

/**
 * Recursively removes nodes from a hierarchical array of objects based on specified unique IDs.
 *
 * @param {Object[]} nodes - The array of objects representing nodes, each potentially containing a nested array of children.
 * @param {Set<string>} uniqueIDs - A set of unique identifiers. Nodes with `controlId` present in this set will be removed.
 */
export function removeNodeById(nodes: any[], uniqueIDs: Set<string>) {
    let i = 0;
    while (i < nodes.length) {
        const item = nodes[i];

        if (item.controlType === 'sap.ui.extensionpoint') {
            i++;
            continue;
        }

        if (uniqueIDs.has(item.controlId)) {
            nodes.splice(i, 1);
            continue;
        }

        if (item.children && item.children.length > 0) {
            removeNodeById(item.children, uniqueIDs);
        }

        // Only increment i if no item was removed.
        i++;
    }
}
