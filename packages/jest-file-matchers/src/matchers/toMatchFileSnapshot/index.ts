/**
 * Copy and mod of unmaintained https://github.com/satya164/jest-file-snapshot
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { diff } from 'jest-diff';
import type { MatcherIgnore } from '../types';
import type { FileMatcherOptions } from './types';
import mkdirp from 'mkdirp';
import filenamify from 'filenamify';

const removedValueToken = '--IGNORED-VALUE--';

interface ComparedContent {
    equal: boolean;
    aReplaced: string;
    bReplaced: string;
}

/**
 * Check if two strings are equal, after replacing the MatcherIgnore options.
 *
 * @param aContent file contents as string
 * @param bContent file contents as string
 * @param fileName filename not including path
 * @param ignoreOpts matcher ignore regex pattern definitions
 * @returns comparison result object
 */
const isEqual = (aContent: string, bContent: string, fileName: string, ignoreOpts?: MatcherIgnore): ComparedContent => {
    let aReplacedContent = aContent,
        bReplacedContent = bContent;
    // Replace values before comparison
    ignoreOpts?.groups?.forEach((replaceGrp) => {
        if (replaceGrp.filenames.includes(path.basename(fileName))) {
            replaceGrp.ignore.forEach((replaceRegEx) => {
                try {
                    aReplacedContent = aReplacedContent.replace(new RegExp(replaceRegEx, 'g'), removedValueToken);
                    bReplacedContent = bReplacedContent.replace(new RegExp(replaceRegEx, 'g'), removedValueToken);
                } catch (e) {
                    throw new Error(`Invalid ignore regex provided to file snapshot matcher: ${replaceRegEx}`);
                }
            });
        }
    });
    // Return the modified strings with the regex replacements so we can diff and ignore
    return {
        equal: aReplacedContent === bReplacedContent,
        aReplaced: aReplacedContent,
        bReplaced: bReplacedContent
    };
};

/**
 * Returns the difference of the content of both files.
 *
 * @param content file content
 * @param output snapshot content
 * @param comparedContent comparison result object
 * @param options matcher options and ignore patterns
 * @returns difference in string format
 */
const getDifference = (
    content: string,
    output: string,
    comparedContent: ComparedContent,
    options: FileMatcherOptions
): string => {
    return Buffer.isBuffer(content) || Buffer.isBuffer(output)
        ? ''
        : `\n\n${diff(comparedContent.bReplaced, comparedContent.aReplaced, options.diff)}`;
};

/**
 * If the file name is not specified, it generates one from the test title.
 *
 * @param filepath path to file
 * @param testPath  path to test
 * @param currentTestName name of current test
 * @param assertionCalls number of assertion calls
 * @returns existing or new file name
 */
const getFilename = (filepath: string, testPath: string, currentTestName: string, assertionCalls: number): string => {
    return (
        filepath ??
        path.join(
            path.dirname(testPath),
            '__file_snapshots__',
            `${filenamify(currentTestName, {
                replacement: '-'
            }).replace(/\s/g, '-')}-${assertionCalls}`
        )
    );
};

/**
 * Handler for existing file.
 *
 * @param isNot .not is used
 * @param filename name of file
 * @param content file content
 * @param options matcher options
 * @param snapshotState snapshot state
 * @returns results for custom matcher
 */
const handleExistingFile = (
    isNot: boolean,
    filename: string,
    content: string,
    options: FileMatcherOptions & MatcherIgnore,
    snapshotState: jest.MatcherUtils
): jest.CustomMatcherResult => {
    const output = fs.readFileSync(filename, 'utf8');

    if (isNot) {
        // The matcher is being used with `.not`
        if (!isEqual(content, output, filename, options).equal) {
            // The value of `pass` is reversed when used with `.not`
            return { pass: false, message: () => '' };
        } else {
            snapshotState.unmatched++;
            return {
                pass: true,
                message: () =>
                    `Expected received content ${chalk.red('to not match')} the file ${chalk.blue(
                        path.basename(filename)
                    )}.`
            };
        }
    } else {
        const comparedContent = isEqual(content, output, filename, options);
        if (comparedContent.equal) {
            return { pass: true, message: () => '' };
        } else if (snapshotState._updateSnapshot === 'all') {
            mkdirp.sync(path.dirname(filename));
            fs.writeFileSync(filename, content);

            snapshotState.updated++;

            return { pass: true, message: () => '' };
        } else {
            snapshotState.unmatched++;

            const difference = getDifference(content, output, comparedContent, options);

            return {
                pass: false,
                message: () =>
                    `Received content ${chalk.red("doesn't match")} the file ${chalk.blue(
                        path.basename(filename)
                    )}.${difference}`
            };
        }
    }
};

/**
 * Match given content against content of the specified file.
 *
 * @param content content to match
 * @param filepath path to the file to match against
 * @param options additional options for matching
 * @returns results for custom matcher
 */
export function toMatchFile(
    content: string,
    filepath: string,
    options: FileMatcherOptions & MatcherIgnore = {}
): jest.CustomMatcherResult {
    const { isNot, snapshotState } = this as jest.MatcherContext;

    const filename = getFilename(filepath, this.testPath, this.currentTestName, this.assertionCalls);

    options = {
        ...options,
        // Options for jest-diff
        diff: {
            ...{
                expand: false,
                contextLines: 5,
                aAnnotation: 'Snapshot'
            },
            ...options.diff
        }
    };

    if (snapshotState._updateSnapshot === 'none' && !fs.existsSync(filename)) {
        // We're probably running in CI environment
        snapshotState.unmatched++;

        return {
            pass: isNot,
            message: () =>
                `New output file ${chalk.blue(path.basename(filename))} was ${chalk.bold.red('not written')}.\n\n` +
                'The update flag must be explicitly passed to write a new snapshot.\n\n' +
                `This is likely because this test is run in a ${chalk.blue(
                    'continuous integration (CI) environment'
                )} in which snapshots are not written by default.\n\n`
        };
    }

    if (fs.existsSync(filename)) {
        return handleExistingFile(isNot, filename, content, options, snapshotState);
    } else if (!isNot && (snapshotState._updateSnapshot === 'new' || snapshotState._updateSnapshot === 'all')) {
        mkdirp.sync(path.dirname(filename));
        fs.writeFileSync(filename, content);

        snapshotState.added++;

        return { pass: true, message: () => '' };
    } else {
        snapshotState.unmatched++;

        return {
            pass: true,
            message: () => `The output file ${chalk.blue(path.basename(filename))} ${chalk.bold.red("doesn't exist")}.`
        };
    }
}
