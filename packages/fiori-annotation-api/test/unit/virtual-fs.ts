import { create as createStore } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create as createEditor } from 'mem-fs-editor';

export async function createFsEditorForProject(_root: string): Promise<Editor> {
    const editor = createEditor(createStore());
    return editor;
}
