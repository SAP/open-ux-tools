/**
 * Copy and mod of unmaintained https://github.com/satya164/jest-file-snapshot
 */

import fs from 'fs';
import path, { basename } from 'path';
import chalk from 'chalk';
import diff from 'jest-diff';
import type { MatcherIgnore } from '../types';
import type { FileMatcherOptions } from './types';
import mkdirp from 'mkdirp';
import filenamify from 'filenamify';

const removedValueToken = '--IGNORED-VALUE--';
/**
 * Check if 2 strings are equal, after replacing the MatcerIgnore options.
 *
 * @param aContent - file contents as string
 * @param bContent - file contents as string
 * @param fileName - filename not including path
 * @param utils - jest matcher utilities
 * @param ignoreOpts
 * @returns
 */
const isEqual = (
    aContent: string,
    bContent: string,
    fileName: string,
    ignoreOpts?: MatcherIgnore
): {
    equal: boolean;
    aReplaced: string;
    bReplaced: string;
} => {
    let aReplacedContent = aContent,
        bReplacedContent = bContent;
    // Replace values before comparison
    ignoreOpts?.groups?.forEach((replaceGrp) => {
        if (replaceGrp.filenames.includes(basename(fileName))) {
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
 * Match given content against content of the specified file.
 *
 * @param {string} content Output content to match
 * @param {string} [filepath] Path to the file to match against
 * @param {{ diff?: import('jest-diff').DiffOptions }} options Additional options for matching
 * @this {{ testPath: string, currentTestName: string, assertionCalls: number, isNot: boolean,
 *          snapshotState: { added: number, updated: number, unmatched: number,
 *          _updateSnapshot: 'none' | 'new' | 'all' },
 *          utils: jest.MatcherUtils }}
 */
export function toMatchFile(
    content: string,
    filepath: string,
    options: FileMatcherOptions & MatcherIgnore = {}
): jest.CustomMatcherResult {
    const { isNot, snapshotState } = this as jest.MatcherContext;

    // If file name is not specified, generate one from the test title
    const filename =
        filepath ??
        path.join(
            path.dirname(this.testPath),
            '__file_snapshots__',
            `${filenamify(this.currentTestName, {
                replacement: '-'
            }).replace(/\s/g, '-')}-${this.assertionCalls}`
        );

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
            } else {
                if (snapshotState._updateSnapshot === 'all') {
                    mkdirp.sync(path.dirname(filename));
                    fs.writeFileSync(filename, content);

                    snapshotState.updated++;

                    return { pass: true, message: () => '' };
                } else {
                    snapshotState.unmatched++;

                    const difference =
                        Buffer.isBuffer(content) || Buffer.isBuffer(output)
                            ? ''
                            : `\n\n${diff(comparedContent.bReplaced, comparedContent.aReplaced, options.diff)}`;

                    return {
                        pass: false,
                        message: () =>
                            `Received content ${chalk.red("doesn't match")} the file ${chalk.blue(
                                path.basename(filename)
                            )}.${difference}`
                    };
                }
            }
        }
    } else {
        if (!isNot && (snapshotState._updateSnapshot === 'new' || snapshotState._updateSnapshot === 'all')) {
            mkdirp.sync(path.dirname(filename));
            fs.writeFileSync(filename, content);

            snapshotState.added++;

            return { pass: true, message: () => '' };
        } else {
            snapshotState.unmatched++;

            return {
                pass: true,
                message: () =>
                    `The output file ${chalk.blue(path.basename(filename))} ${chalk.bold.red("doesn't exist")}.`
            };
        }
    }
}
