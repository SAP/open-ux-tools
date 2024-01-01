import type { AddonActions } from './types';
import { handleAction as handleProjectAction } from './project';

export async function handleAction(action: AddonActions): Promise<AddonActions | undefined> {
    return handleProjectAction(action);
}
