import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync, readFileSync } from 'fs';
import type {
    FullConfig,
    FullResult,
    Reporter,
    Suite,
    TestCase,
    TestResult,
    TestStep
} from '@playwright/test/reporter';

interface ManualTestCaseStep {
    name: string;
}
interface ManualTestCase {
    name: string;
    filePath: string;
    steps: ManualTestCaseStep[];
    projectConfig?: any; // added to capture resolved config or annotation
}

/**
 * Playwright reporter for generating manual test case documentation.
 */
export default class ManualTestCaseReporter implements Reporter {
    private manualTestCases: Record<string, ManualTestCase> = {};
    private config: FullConfig;
    private fileTotalTests: Record<string, number> = {};
    private fileCompletedTests: Record<string, number> = {};
    // only for latest ui5 reporter is enabled
    private isReporterDisabled = false;
    private projectConfigMap: Record<string, any> = {}; // projectName -> project.use
    private processedFiles: Set<string> = new Set(); // ensure per-file work runs once

    /**
     * Creates an empty manual test case object for the given test.
     *
     * @param test The test case for which to create the manual test case object.
     * @returns An empty ManualTestCase object.
     */
    private createEmptyManualTestCase(test: TestCase): ManualTestCase {
        return {
            name: test.title,
            filePath: '',
            steps: []
        };
    }

    /**
     * On begin handler.
     *
     * @param config - config
     * @param suite - test suite
     */
    onBegin(config: FullConfig, suite: Suite) {
        // Only run this reporter for the latest version
        const latestVersion = this.getLatestVersion();
        const currentProject = suite.suites && suite.suites.length > 0 ? suite.suites[0].title : null;
        if (latestVersion && currentProject && currentProject !== latestVersion) {
            this.isReporterDisabled = true;
            return;
        }

        this.config = config;

        const allTests = suite.allTests();
        allTests.forEach((test) => {
            if (test.location.file) {
                const filename = basename(test.location.file);
                const fileNameWithoutExt = filename.replace(/\.spec\.ts$/, '');

                // Initialize counters if not already set
                this.fileTotalTests[fileNameWithoutExt] = (this.fileTotalTests[fileNameWithoutExt] || 0) + 1;
                this.fileCompletedTests[fileNameWithoutExt] = this.fileCompletedTests[fileNameWithoutExt] || 0;
            }
        });
    }

    /**
     * On step begin handler.
     *
     * @param test - test case.
     * @param result - test result.
     * @param step - test step
     */
    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
        if (this.isReporterDisabled) {
            return;
        }
        const skipPatterns = [
            /^Before Hooks$/,
            /^Close context$/,
            /^Launch browser/,
            /^After Hooks$/,
            /^fixture: /,
            /^Fixture/,
            /^attach "/,
            /^browserType\./,
            /^browser\./,
            /^browserContext\./,
            /^Expect \"toBeVisible\"$/,
            /^Expect \"toBe\"$/,
            /^Expect \"toEqual\"$/,
            /^Expect\.poll\.toEqual$/,
            /^Expect \"toBeEnabled\"$/,
            /^Expect \"toBeDisabled\"$/,
            /^Expect \"poll toEqual\"$/,
            /^locator\.textContent/,
            /^locator\.count/,
            /^Click on in Application Preview$/,
            /^Query count getByTestId\(\'saved-changes-stack\'\)/,
            /^Verifying Changes.../,
            /^page\.goto\(/,
            /^Create context$/,
            /^Create page$/,
            /^Navigate to "\/adaptation-editor\.html\?fiori-tools-rta-mode=true"$/,
            /locator\('iframe\[title="Application Preview"\]'\)/
        ];

        const shouldSkip = skipPatterns.some((pattern) => pattern.test(step.title));

        if (!shouldSkip) {
            this.manualTestCases[test.title].steps ??= [];
            const parsedStep = parseActionStep(step.title);
            const lastStep = this.manualTestCases[test.title].steps[this.manualTestCases[test.title].steps.length - 1];
            const isDuplicate = lastStep && parsedStep === lastStep.name;
            if (!isDuplicate) {
                this.manualTestCases[test.title].steps.push({ name: parsedStep });
            }
        }
    }
    /**
     * On test begin handler.
     *
     * @param test - test case
     * @param _result - test result
     */
    onTestBegin(test: TestCase, _result: TestResult) {
        if (this.isReporterDisabled) {
            return;
        }
        const testCase = this.createEmptyManualTestCase(test);
        this.manualTestCases[test.title] = testCase;
    }

    /**
     * Called when a test ends.
     *
     * @param test - The test case that just ended
     * @param _result - Result of the test run
     */
    async onTestEnd(test: TestCase, _result: TestResult) {
        if (this.isReporterDisabled) {
            return;
        }
        if (test.location.file) {
            const filename = basename(test.location.file);
            this.manualTestCases[test.title].filePath = filename;
            const fileNameWithoutExt = filename.replace(/\.spec\.ts$/, '');
            this.fileCompletedTests[fileNameWithoutExt] = (this.fileCompletedTests[fileNameWithoutExt] || 0) + 1;
            await this.checkAndGenerateFileDocumentation(fileNameWithoutExt);
            // Ensure we parse and store projectConfig for this file only once.
            if (!this.processedFiles.has(fileNameWithoutExt)) {
                this.processedFiles.add(fileNameWithoutExt);
                try {
                    const ann = (test as any).annotations?.find((a: any) => a.type === 'projectConfig');
                    if (ann?.description) {
                        const parsed = JSON.parse(ann.description);
                        const isAdp = parsed.projectConfig?.kind === 'adp';
                        this.projectConfigMap[fileNameWithoutExt] = { ...parsed, isAdp };
                    }
                } catch {
                    // ignore parse errors
                }
            }
        }
    }

    /**
     * Called when all tests have finished.
     *
     * @param _result - Result of the entire test run
     */
    async onEnd(_result: FullResult) {
        if (this.isReporterDisabled) {
            return;
        }
        // write the consolidated test -> project config mapping JSON
        try {
            const outPath = join(process.cwd(), 'test-project-map.json');
            const toWrite = JSON.parse(JSON.stringify(this.projectConfigMap ?? {}));
            await writeFile(outPath, JSON.stringify(toWrite, null, 2), { encoding: 'utf-8' });
            console.log(`Project config map written to ${outPath}`);
        } catch (err) {
            console.error('Failed to write project config map JSON:', err);
        }
    }

    /**
     * Generates documentation for tests from a specific file.
     *
     * @param fileBaseName Base name of the file to generate documentation for
     */
    private async generateFileDocumentation(fileBaseName: string): Promise<void> {
        try {
            // Find all test cases belonging to the specified file (match with or without .spec.ts extension)
            const testsFromFile = Object.entries(this.manualTestCases)
                .filter(
                    ([_, testCase]) =>
                        testCase.filePath === fileBaseName || testCase.filePath === `${fileBaseName}.spec.ts`
                )
                .map(([_, testCase]) => testCase);

            if (testsFromFile.length === 0) {
                console.log(`No tests found for ${fileBaseName}, skipping documentation generation`);
                return;
            }

            console.log(`Generating documentation for ${testsFromFile.length} tests from ${fileBaseName}`);

            const outputDir = join(process.cwd(), 'manual_test_description_generated');
            if (!existsSync(outputDir)) {
                await mkdir(outputDir, { recursive: true });
            }

            const titleCased = fileBaseName
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            let content = `# ${titleCased} Test Documentation\n\n`;
            content += '## Table of Contents\n\n';

            testsFromFile.forEach((test) => {
                const anchorName = test.name
                    .replace(/\s+/g, '-')
                    .replace(/[^a-zA-Z0-9-_]/g, '')
                    .toLowerCase();
                content += `- [${test.name}](#${anchorName})\n`;
            });

            content += '\n';

            testsFromFile.forEach((test) => {
                const anchorName = test.name
                    .replace(/\s+/g, '-')
                    .replace(/[^a-zA-Z0-9-_]/g, '')
                    .toLowerCase();

                content += `<a id="${anchorName}"></a>\n`;
                content += `## ${test.name}\n\n`;

                if (test.steps && test.steps.length > 0) {
                    content += '### Steps\n\n';
                    test.steps.forEach((step, index) => {
                        content += `${index + 1}. ${step.name.replace(/^1\.\s*/, '')}\n`;
                    });
                } else {
                    content += '*No steps recorded for this test.*\n';
                }

                content += '\n---\n\n';
            });

            const outputFile = join(outputDir, `${fileBaseName}.md`);
            await writeFile(outputFile, content);
            console.log(`Documentation written to ${outputFile}`);
        } catch (error) {
            console.error(`Error generating documentation for ${fileBaseName}:`, error);
        }
    }

    /**
     * Checks if all tests from a specific file have completed.
     *
     * @param filename The filename to check (e.g., 'list-report-v2.spec.ts')
     * @returns True if all tests from the file have completed
     */
    private isFileComplete(filename: string): boolean {
        if (!this.fileTotalTests[filename]) {
            return false;
        }

        const completed = this.fileCompletedTests[filename] || 0;
        const total = this.fileTotalTests[filename];

        const isComplete = completed >= total;
        console.log(`File ${filename}: ${completed}/${total} tests completed, complete status: ${isComplete}`);

        return isComplete;
    }

    /**
     * Generate documentation immediately if a file is complete.
     *
     * @param testFile The name of the test file
     */
    private async checkAndGenerateFileDocumentation(testFile: string): Promise<void> {
        // Check if all tests for this file are complete and generate documentation if they are
        if (this.isFileComplete(testFile)) {
            await this.generateFileDocumentation(testFile);
        }
    }

    /**
     * Gets the latest UI5 version from environment or versions.json.
     *
     * @returns The latest version string, or null if not found.
     */
    private getLatestVersion(): string | null {
        if (process.env.HIGHEST_UI5_VERSION) {
            return process.env.HIGHEST_UI5_VERSION;
        }

        try {
            const versionsPath = join(process.cwd(), 'versions.json');

            const versionsContent = existsSync(versionsPath) ? readFileSync(versionsPath, 'utf8') : null;

            if (!versionsContent) {
                return null;
            }

            const versions = JSON.parse(versionsContent) as string[];
            return versions[0]; // First version is the latest
        } catch (error) {
            return null;
        }
    }
}

/**
 * Parses a Playwright step title into a human-readable action description.
 *
 * @param stepTitle The title of the step to parse.
 * @returns A human-readable string describing the action.
 */
function parseActionStep(stepTitle: string): string {
    // Action mapping - common Playwright methods to human verbs with optional prefix and suffix
    const actionMap: Record<string, { prefix: string; suffix?: string }> = {
        'click': { prefix: 'Click on' },
        'hover': { prefix: 'Hover over' },
        'isDisabled': { prefix: 'Check if', suffix: 'is disabled' }
    };

    // Element type mapping - detect element types from selectors/roles
    const elementMap: Record<string, string> = {
        'button': 'button'
    };

    // Try to find action verb from the main step title
    let actionInfo: { prefix: string; suffix?: string } | null = null;
    for (const [actionKey, actionVerb] of Object.entries(actionMap)) {
        if (stepTitle.includes(`.${actionKey}`) || stepTitle.startsWith(actionKey)) {
            actionInfo = actionVerb;
            break;
        }
    }

    let element = '';
    const getByMethodMap: Record<string, string> = {
        'getByRole': 'role-based'
    };

    for (const [method, elementType] of Object.entries(getByMethodMap)) {
        const methodMatch = stepTitle.match(new RegExp(`${method}\\(`));
        if (methodMatch) {
            if (method === 'getByRole') {
                // Special handling for getByRole - extract the role type
                const roleMatch = stepTitle.match(/getByRole\('(\w+)'/);
                if (roleMatch) {
                    const roleType = roleMatch[1];
                    element = elementMap[roleType] || roleType;
                }
            } else {
                element = elementType;
            }
            break;
        }
    }

    // Try to extract element name using a map of patterns
    let name = '';
    const nameExtractionPatterns: Record<string, RegExp> = {
        'getByRole': /getByRole\('\w+',\s*{\s*name:\s*'([^']+)'|getByRole\('\w+',\s*{\s*name:\s*"([^"]+)"/
    };

    // Try each pattern until we find a match
    for (const [_method, pattern] of Object.entries(nameExtractionPatterns)) {
        const nameMatch = stepTitle.match(pattern);
        if (nameMatch) {
            name = nameMatch[1] || nameMatch[2];
            break;
        }
    }

    // Build human-readable step using priority order with prefix and suffix
    const resultBuilders = [
        () => {
            if (actionInfo && element && name) {
                const { prefix, suffix } = actionInfo;
                if (suffix) {
                    return `${prefix} \`${name}\` ${suffix}`;
                }
                return `${prefix} ${element} \`${name}\``;
            }
            return null;
        },
        () => {
            if (actionInfo && element) {
                const { prefix, suffix } = actionInfo;
                if (suffix) {
                    return `${prefix} ${element} ${suffix}`;
                }
                return `${prefix} ${element}`;
            }
            return null;
        },
        () => {
            if (actionInfo && name) {
                const { prefix, suffix } = actionInfo;
                if (suffix) {
                    return `${prefix} \`${name}\` ${suffix}`;
                }
                return `${prefix} \`${name}\``;
            }
            return null;
        },
        () => (actionInfo ? actionInfo.prefix : null),
        () => stepTitle
    ];

    let result = ``;
    for (const builder of resultBuilders) {
        const buildResult = builder();
        if (buildResult) {
            result = buildResult;
            break;
        }
    }
    return result;
}
