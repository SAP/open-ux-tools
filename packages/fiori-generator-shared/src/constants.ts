import os from 'os';
import { join } from 'path';

export const YEOMANUI_TARGET_FOLDER_CONFIG_PROP = 'ApplicationWizard.TargetFolder';
export const DEFAULT_PROJECTS_FOLDER: string = join(os.homedir(), 'projects');
