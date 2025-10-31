import type { MatcherIgnore } from '@sap-ux/jest-file-matchers';
import {
    APPGEN_INFO_DATE_REGEX,
    APPGEN_INFO_GEN_VERSION,
    APPGEN_INFO_PLATFORM_REGEX,
    MANIFEST_SOURCE_TEMPLATE_ID_REGEX,
    MANIFEST_SOURCE_TEMPLATE_TOOLSID_REGEX,
    MANIFEST_SOURCE_TEMPLATE_VERSION_REGEX,
    README_GENERATION_PLATFORM_REGEX,
    README_GENERATOR_REGEX,
    YAML_VERSION_REGEX
} from '@sap-ux/jest-file-matchers';
import { execSync } from 'child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import yeomanTest from 'yeoman-test';
import type { FioriAppGeneratorOptions } from '../../../src/fiori-app-generator/fioriAppGeneratorOptions';
import type { State } from '../../../src/types';
import { TestWritingGenerator } from './testGeneratorWriting';

export { TestWritingGenerator };

const testOutputFolder = './test-output/';
const testDir: string = join(__dirname, '../', testOutputFolder);
export const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

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
        rimraf.rimrafSync(path);
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
        },
        {
            filenames: ['.appGenInfo.json'],
            ignore: [APPGEN_INFO_DATE_REGEX, APPGEN_INFO_GEN_VERSION, APPGEN_INFO_PLATFORM_REGEX]
        }
    ]
};

/**
 * Sets the output test directory path appending the specified path if provided.
 * If this function is not called the default test directoty will be used.
 *
 * @param testGroup - subfolder to enable parallel test execution so output are not overwritten or deleted
 * @returns the path to the test directory
 */
export function getTestDir(testGroup = ''): string {
    return join(testDir, testGroup);
}

export async function runWritingPhaseGen(
    state: Partial<State>,
    options?: Partial<FioriAppGeneratorOptions>
): Promise<any> {
    const mergedOptions = {
        state,
        skipInstall: true,
        ...options
    };
    return yeomanTest.create(TestWritingGenerator, {}, {}).withOptions(mergedOptions).run();
}
