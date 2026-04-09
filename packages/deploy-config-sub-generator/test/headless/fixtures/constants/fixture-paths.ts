import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const INPUT_APP_DIR_CF = join(__dirname, '../test-apps/cf');
export const INPUT_APP_NAME_BASE = 'testappbase';
export const INPUT_APP_NAME = 'testapp';
export const INPUT_APP_NAME_TS = 'testapp_ts';
export const INPUT_CAP_APP_NAME = 'capapp';
export const INPUT_CAP_DEST_APP_NAME = 'capdestination';
export const INPUT_CAP_JAVA_DEST_APP_NAME = 'capjavadestination';
export const INPUT_LCAP_CHANGES = 'caplcapmodeonly';
export const INPUT_PARENT_APP = 'parentapp';
export const INPUT_APP_DIR_ABAP = join(__dirname, '../test-apps/abap');
export const INPUT_BASE_APP = 'baseapp';
