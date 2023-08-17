import type { OutlineNode } from '../../../api';
import { isEditable } from './utils';

/**
 * Transform node.
 *
 * @param input
 * @param getAdditionalData
 * @returns {Promise<OutlineNode[]>}
 */
export async function transformNodes(
    input: sap.ui.rta.OutlineViewNode[],
    getAdditionalData: (id: string) => { text?: string }
): Promise<OutlineNode[]> {
    const stack = [...input];
    const items: OutlineNode[] = [];
    while (stack.length) {
        const current = stack.shift();
        const editable = await isEditable(current?.id);
        if (current?.type === 'element') {
            // eslint-disable-next-line no-loop-func
            const children = (current.elements ?? []).flatMap((element: sap.ui.rta.OutlineViewNode) =>
                element.type === 'aggregation' ? element.elements ?? [] : []
            );
            const { text } = getAdditionalData(current.id);

            const node: OutlineNode = {
                controlId: current.id,
                controlType: current.technicalName,
                name: text ?? current.technicalName.split('.').slice(-1)[0],
                editable,
                visible: current.visible ?? true,
                children: await transformNodes(children, getAdditionalData)
            };

            items.push(node);
        }
    }
    return items;
}
