import os from 'os';
import { join } from 'path';

export const YEOMANUI_TARGET_FOLDER_CONFIG_PROP = 'ApplicationWizard.TargetFolder';
export const LOGGING_LEVEL_CONFIG_PROP = 'ApplicationWizard.loggingLevel';
export const DEFAULT_PROJECTS_FOLDER: string = join(os.homedir(), 'projects');
export const YUI_EXTENSION_ID = 'sapos.yeoman-ui';
// From YUI version 1.16.6 the message 'The files have been generated.' is not shown unless a top level dir is created
export const YUI_MIN_VER_FILES_GENERATED_MSG = '1.16.6';
