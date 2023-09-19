import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { isEditable } from './utils';
import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import { UI5Facade } from '../types';

function getAdditionalData(ui5: UI5Facade, id: string): { text?: string } {
    const control = ui5.getControlById(id);
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
 * Transform node.
 *
 * @param ui5 - facade for ui5 framework methods
 * @param input outline view node
 * @param getAdditionalData gets additional data for give control id.
 * @returns Promise<OutlineNode[]>
 */
export async function transformNodes(ui5: UI5Facade, input: OutlineViewNode[]): Promise<OutlineNode[]> {
    const stack = [...input];
    const items: OutlineNode[] = [];
    while (stack.length) {
        const current = stack.shift();
        const editable = await isEditable(ui5, current?.id);
        if (current?.type === 'element') {
            const children = (current.elements ?? []).flatMap((element: OutlineViewNode) =>
                element.type === 'aggregation' ? element.elements ?? [] : []
            );
            const { text } = getAdditionalData(ui5, current.id);

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: text ?? current.technicalName.split('.').slice(-1)[0],
                editable,
                visible: current.visible ?? true,
                children: await transformNodes(ui5, children)
            };

            items.push(node);
        }
    }
    return items;
}
