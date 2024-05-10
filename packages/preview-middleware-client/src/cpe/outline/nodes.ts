import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';

import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import { isEditable } from './utils';

interface AdditionalData {
    text?: string;
    technicalName?: string;
}

/**
 * Retrieves additional data for a given control ID.
 *
 * @param id The unique identifier of the control.
 * @returns An object containing the text and the technical name of the control.
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
 * @param extPointIDs ids that need are filled when extension point has default content or created controls inside
 * @returns {Promise<OutlineNode[]>} transformed outline tree nodes
 */
export async function transformNodes(
    input: OutlineViewNode[],
    scenario: Scenario,
    extPointIDs: Set<string>
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
                children: await transformNodes(children, scenario, extPointIDs)
            };

            items.push(node);
        }

        if (scenario === 'ADAPTATION_PROJECT' && current?.type === 'extensionPoint' && current.extensionPointInfo) {
            const { defaultContent, createdControls } = current.extensionPointInfo;

            let children: OutlineNode[] = [];
            // We can combine both because there can only be either defaultContent or createdControls for one extension point node.
            [...defaultContent, ...createdControls].forEach((id: string) => {
                extPointIDs.add(id);
                addChildToExtensionPoint(id, children);
            });

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: current.name || '',
                editable,
                visible: current.visible ?? true,
                children,
                hasDefaultContent: defaultContent.length > 0
            };

            items.push(node);
        }
    }
    return items;
}

/**
 * Recursively removes nodes from a hierarchical array of objects based on specified unique IDs.
 * Otherwise, we get a duplication of elements in the outline tree where the parent has a button for example that was added with an extension point.
 * This button should not appear under the parent of the extension point but under the extension point itself.
 * Without removing this extra node we will have a button under the parent and under the extension point.
 *
 * @param {Object[]} nodes - The array of objects representing nodes, each potentially containing a nested array of children.
 * @param {Set<string>} extPointIDs - A set of unique identifiers. Nodes with `controlId` present in this set will be removed.
 */
export function removeNodeById(nodes: any[], extPointIDs: Set<string>) {
    let i = 0;
    while (i < nodes.length) {
        const item = nodes[i];

        if (item.controlType === 'sap.ui.extensionpoint') {
            i++;
            continue;
        }

        if (extPointIDs.has(item.controlId)) {
            nodes.splice(i, 1);
            continue;
        }

        if (item.children && item.children.length > 0) {
            removeNodeById(item.children, extPointIDs);
        }

        // Only increment i if no item was removed.
        i++;
    }
}
