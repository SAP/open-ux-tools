import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import { isEditable } from './utils';
import type { OutlineViewNode } from 'sap/ui/rta/command/OutlineService';

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
 * Transform node.
 *
 * @param input outline view node
 * @param getAdditionalData gets additional data for give control id.
 * @returns Promise<OutlineNode[]>
 */
export async function transformNodes(input: OutlineViewNode[]): Promise<OutlineNode[]> {
    const stack = [...input];
    const items: OutlineNode[] = [];
    while (stack.length) {
        const current = stack.shift();
        const editable = await isEditable(current?.id);
        if (current?.type === 'element') {
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
                children: await transformNodes(children)
            };

            items.push(node);
        }
    }
    return items;
}
