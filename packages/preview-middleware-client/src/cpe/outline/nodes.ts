import type { OutlineNode } from '@sap-ux/control-property-editor-common';
import { isEditable } from './utils';
import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import { UI5Facade } from '../types';

/**
 * Transform node.
 *
 * @param input outline view node
 * @param ui5 - facade for ui5 framework methods
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
            // eslint-disable-next-line no-loop-func
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
