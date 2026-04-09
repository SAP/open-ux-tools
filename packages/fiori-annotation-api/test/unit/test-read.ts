import type { Editor } from 'mem-fs-editor';
import { getProject } from '@sap-ux/project-access';
import type { Change } from '../../src/types';
import { FioriAnnotationService } from '../../src/fiori-service';
import { createFsEditorForProject } from './virtual-fs';

export async function testRead(
    root: string,
    initialChanges: Change[],
    serviceName = 'mainService',
    fsEditor?: Editor
): Promise<FioriAnnotationService> {
    const editor = fsEditor ?? (await createFsEditorForProject(root));
    const project = await getProject(root);
    const service = await FioriAnnotationService.createService(project, serviceName, '', editor, {
        commitOnSave: false
    });
    await service.sync();
    if (initialChanges.length > 0) {
        service.edit(initialChanges);
        await service.save({ resyncAfterSave: true });
    }
    return service;
}
