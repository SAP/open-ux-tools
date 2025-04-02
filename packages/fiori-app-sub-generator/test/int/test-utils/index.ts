import type { MatcherIgnore } from '@sap-ux/jest-file-matchers';
import {
    MANIFEST_SOURCE_TEMPLATE_ID_REGEX,
    MANIFEST_SOURCE_TEMPLATE_TOOLSID_REGEX,
    MANIFEST_SOURCE_TEMPLATE_VERSION_REGEX,
    README_GENERATION_PLATFORM_REGEX,
    README_GENERATOR_REGEX,
    YAML_VERSION_REGEX
} from '@sap-ux/jest-file-matchers';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { rimraf } from 'rimraf';
import os from 'os';
import { TestWritingGenerator } from './testGeneratorWriting';
export { TestWritingGenerator };

export function cleanTestDir(path: string): void {
    console.log('Test path clean', path);
    if (os.platform() === 'win32') {
        try {
            // falls back to powershell args if command shell version fails
            execSync(`rmdir /s /q ${path} || rmdir -recurse ${path}`, { encoding: 'utf-8' });
        } catch (err) {
            console.log(err);
        }
    } else {
        rimraf.sync(path);
    }
}
/**
 * Gets the specified service test data
 *
 * @param pathToFixtures
 * @param serviceName
 * @param fileType
 * @returns
 */
export const getTestData = (pathToFixtures: string, serviceName: string, fileType: 'metadata' | 'annotations') => {
    const sampleDataPath = join(pathToFixtures, serviceName, `${fileType}.xml`);
    return readFileSync(sampleDataPath, 'utf-8');
};

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
        },
        {
            filenames: ['ui5-local.yaml'],
            ignore: [YAML_VERSION_REGEX]
        }
    ]
};
