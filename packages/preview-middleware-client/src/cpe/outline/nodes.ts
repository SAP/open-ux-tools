import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { Scenario } from 'sap/ui/fl/Scenario';

import { getUi5Version, Ui5VersionInfo } from '../../utils/version';
import { getControlById } from '../../utils/core';

import type { ControlTreeIndex } from '../types';
import { isReuseComponent } from '../utils';

import { isEditable } from './editable';

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
    const control = getControlById(id);
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
 * Creates conrol index for all controls in the app.
 *
 * @param {ControlTreeIndex} controlIndex - Control index for the ui5 app.
 * @param {OutlineNode} node - control node added to the outline.
 */
function indexNode(controlIndex: ControlTreeIndex, node: OutlineNode): void {
    const indexedControls = controlIndex[node.controlType];
    if (indexedControls) {
        indexedControls.push(node);
    } else {
        controlIndex[node.controlType] = [node];
    }
}

/**
 * Transform node.
 *
 * @param input outline view node
 * @param scenario type of project
 * @param reuseComponentsIds ids of reuse components that are filled when outline nodes are transformed
 * @param controlIndex Control tree index
 * @returns transformed outline tree nodes
 */
export async function transformNodes(
    input: OutlineViewNode[],
    scenario: Scenario,
    reuseComponentsIds: Set<string>,
    controlIndex: ControlTreeIndex
): Promise<OutlineNode[]> {
    const stack = [...input];
    const items: OutlineNode[] = [];
    const ui5VersionInfo = await getUi5Version();
    while (stack.length) {
        const current = stack.shift();
        const editable = isEditable(current?.id);
        const isAdp = scenario === 'ADAPTATION_PROJECT';
        const isExtPoint = current?.type === 'extensionPoint';

        if (current?.type === 'element') {
            const children = getChildren(current);
            const { text } = getAdditionalData(current.id);
            const technicalName = current.technicalName.split('.').slice(-1)[0];

            const transformedChildren = isAdp
                ? await handleDuplicateNodes(children, scenario, reuseComponentsIds, controlIndex)
                : await transformNodes(children, scenario, reuseComponentsIds, controlIndex);

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: text ?? technicalName,
                editable,
                visible: current.visible ?? true,
                children: transformedChildren
            };

            indexNode(controlIndex, node);
            fillReuseComponents(reuseComponentsIds, current, scenario, ui5VersionInfo);

            items.push(node);
        }

        if (isAdp && isExtPoint) {
            const { defaultContent = [], createdControls = [] } = current.extensionPointInfo;

            let children: OutlineNode[] = [];
            // We can combine both because there can only be either defaultContent or createdControls for one extension point node.
            [...defaultContent, ...createdControls].forEach((id: string) => {
                addChildToExtensionPoint(id, children);
            });

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: current.name ?? '',
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
 * Fill reuse components ids.
 *
 * @param reuseComponentsIds ids of reuse components that are filled when outline nodes are transformed
 * @param node view node
 * @param scenario type of project
 * @param ui5VersionInfo UI5 version information
 */
function fillReuseComponents(
    reuseComponentsIds: Set<string>,
    node: OutlineViewNode,
    scenario: Scenario,
    ui5VersionInfo: Ui5VersionInfo
): void {
    if (scenario === 'ADAPTATION_PROJECT' && node?.component && isReuseComponent(node.id, ui5VersionInfo)) {
        reuseComponentsIds.add(node.id);
    }
}
/**
 * Handles duplicate nodes that are retrieved from extension point default content and created controls,
 * if they exist under an extension point these controls are removed from the children array
 *
 * @param children outline view node children
 * @param scenario type of project
 * @param reuseComponentsIds ids of reuse components that are filled when outline nodes are transformed
 * @param controlIndex Control tree index
 * @returns transformed outline tree nodes
 */
export async function handleDuplicateNodes(
    children: OutlineViewNode[],
    scenario: Scenario,
    reuseComponentsIds: Set<string>,
    controlIndex: ControlTreeIndex
): Promise<OutlineNode[]> {
    const extPointIDs = new Set<string>();

    children.forEach((child: OutlineViewNode) => {
        if (child.type === 'extensionPoint') {
            const { defaultContent = [], createdControls = [] } = child.extensionPointInfo;
            [...defaultContent, ...createdControls].forEach((id) => extPointIDs.add(id));
        }
    });

    const uniqueChildren = children.filter((child) => !extPointIDs.has(child.id));

    return transformNodes(uniqueChildren, scenario, reuseComponentsIds, controlIndex);
}
