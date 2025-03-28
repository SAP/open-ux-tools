import { join } from 'path';
import {
    MANIFEST_SOURCE_TEMPLATE_ID_REGEX,
    MANIFEST_SOURCE_TEMPLATE_VERSION_REGEX,
    MANIFEST_SOURCE_TEMPLATE_TOOLSID_REGEX,
    README_GENERATOR_REGEX,
    README_GENERATION_PLATFORM_REGEX
} from '@sap-ux/jest-file-matchers';
import type { MatcherIgnore } from '@sap-ux/jest-file-matchers';

export const INPUT_APP_DIR = join(__dirname, './fixtures/test-apps');
export const INPUT_APP_NAME_BASE = 'testappbase';
export const INPUT_APP_NAME = 'testapp';
export const INPUT_APP_NAME_TS = 'testapp_ts';
export const INPUT_CAP_APP_NAME = 'capapp';
export const INPUT_CAP_DEST_APP_NAME = 'capdestination';
export const INPUT_CAP_JAVA_DEST_APP_NAME = 'capjavadestination';
export const INPUT_LCAP_CHANGES = 'caplcapmodeonly';
export const INPUT_PARENT_APP = 'parentapp';

export const ignoreMatcherOpts: MatcherIgnore = {
    groups: [
        {
            filenames: ['manifest.json'],
            ignore: [
                MANIFEST_SOURCE_TEMPLATE_ID_REGEX,
                MANIFEST_SOURCE_TEMPLATE_VERSION_REGEX,
                MANIFEST_SOURCE_TEMPLATE_TOOLSID_REGEX
            ]
        },
        {
            filenames: ['README.md'],
            ignore: [README_GENERATOR_REGEX, README_GENERATION_PLATFORM_REGEX]
        }
    ]
};
