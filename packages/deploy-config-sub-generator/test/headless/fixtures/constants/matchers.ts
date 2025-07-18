import {
    MANIFEST_SOURCE_TEMPLATE_ID_REGEX,
    MANIFEST_SOURCE_TEMPLATE_VERSION_REGEX,
    MANIFEST_SOURCE_TEMPLATE_TOOLSID_REGEX,
    README_GENERATOR_REGEX,
    README_GENERATION_PLATFORM_REGEX
} from '@sap-ux/jest-file-matchers';
import type { MatcherIgnore } from '@sap-ux/jest-file-matchers';

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
