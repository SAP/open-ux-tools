import type { FioriRuleDefinition } from '../types';
import { COPY_TO_CLIPBOARD, type CopyToClipboard } from '../language/diagnostics';
import { createFioriRule } from '../language/rule-factory';
import type { MemberNode } from '@humanwhocodes/momoa';
import type { FeV2PageType } from '../project-context/linker/fe-v2';
import type { ParsedApp } from '../project-context/parser';
import type { FeV4PageType } from '../project-context/linker/fe-v4';

const rule: FioriRuleDefinition = createFioriRule({
    ruleId: COPY_TO_CLIPBOARD,
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description: 'Sets whether to enable or disable the copy to clipboard button in tables',
            url: 'https://github.com/SAP/open-ux-tools/blob/main/packages/eslint-plugin-fiori-tools/docs/rules/sap-copy-to-clipboard.md'
        },
        messages: {
            [COPY_TO_CLIPBOARD]:
                'Copy To Clipboard must be correctly configured. If not set, the "Copy" button is displayed'
        },
        fixable: 'code'
    },

    check(context) {
        const problems: CopyToClipboard[] = [];

        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
            const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
            if (!parsedService) {
                continue;
            }
            if (app.type === 'fe-v2') {
                for (const page of app.pages) {
                    problems.push(...handleCopyInTableV2(page, parsedApp));
                }
            } else if (app.type === 'fe-v4') {
                for (const page of app.pages) {
                    problems.push(...handleDisableCopyInTableV4(page, parsedApp));
                }
            }
        }
        return problems;
    },
    createJsonVisitorHandler: (context) =>
        function report(node: MemberNode): void {
            context.report({
                node,
                messageId: COPY_TO_CLIPBOARD
                // fix: remove set value
            });
        }
});

/**
 * Looks through V2 app page tables and returns problems if copy is set to false.
 *
 * @param page - V2 app page
 * @param parsedApp - parsed V2 app
 * @returns - CopyToClipoard issues
 */
function handleCopyInTableV2(page: FeV2PageType, parsedApp: ParsedApp): CopyToClipboard[] {
    const problems: CopyToClipboard[] = [];
    for (const table of page.lookup['table'] ?? []) {
        if (table.configuration.copy.valueInFile === false) {
            problems.push({
                type: COPY_TO_CLIPBOARD,
                pageName: page.targetName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.copy.configurationPath
                }
            });
        }
    }
    return problems;
}

/**
 * Looks through V4 app page tables and returns problems if disableCopyToClipboard is set to true.
 *
 * @param page - V4 app page
 * @param parsedApp - parsed V4 app
 * @returns - CopyToClipoard issues
 */
function handleDisableCopyInTableV4(page: FeV4PageType, parsedApp: ParsedApp): CopyToClipboard[] {
    const problems: CopyToClipboard[] = [];
    for (const table of page.lookup['table'] ?? []) {
        if (table.configuration.disableCopyToClipboard.valueInFile === true) {
            problems.push({
                type: COPY_TO_CLIPBOARD,
                pageName: page.targetName,
                manifest: {
                    uri: parsedApp.manifest.manifestUri,
                    object: parsedApp.manifestObject,
                    propertyPath: table.configuration.disableCopyToClipboard.configurationPath
                }
            });
        }
    }
    return problems;
}

export default rule;
