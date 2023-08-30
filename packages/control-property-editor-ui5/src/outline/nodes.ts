import type { OutlineNode } from '@sap-ux/control-property-editor-common';
import { isEditable } from './utils';
import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';
import type { UI5Facade } from 'src/types';

/**
 * Transform node.
 *
 * @param input outline view node
 * @param ui5 - facade for ui5 framework methods
 * @param getAdditionalData gets additional data for give control id.
 * @returns Promise<OutlineNode[]>
 */
export async function transformNodes(
    input: OutlineViewNode[],
    ui5: UI5Facade,
    getAdditionalData: (id: string) => { text?: string }
): Promise<OutlineNode[]> {
    const stack = [...input];
    const items: OutlineNode[] = [];
    while (stack.length) {
        const current = stack.shift();
        const editable = await isEditable(current?.id, ui5);
        if (current?.type === 'element') {
            // eslint-disable-next-line no-loop-func
            const children = (current.elements ?? []).flatMap((element: OutlineViewNode) =>
                element.type === 'aggregation' ? element.elements ?? [] : []
            );
            const { text } = getAdditionalData(current.id);

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: text ?? current.technicalName.split('.').slice(-1)[0],
                editable,
                visible: current.visible ?? true,
                children: await transformNodes(children, ui5, getAdditionalData)
            };

            items.push(node);
        }
    }
    return items;
}
