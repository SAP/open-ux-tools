import { expect } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@outline @cpe @adp`, () => {
    test(
        '1. Outline',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);

            await editor.outlinePanel.filterOutline('Delete');
            await editor.outlinePanel.clickOnNode('Delete');
            await editor.propertiesPanel.setBooleanProperty('enabled', true);

            await editor.propertiesPanel.fillStringEditor('text', 'Remove Record');

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await lr.checkControlLabel('Remove Record');
        }
    );

    test(
        '2: Highlighting',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);

            await editor.outlinePanel.clickOnNode('Delete');
            await lr.checkControlHasOverlay('Delete');

            await lr.clickOnControlOverlay('Create');
            await editor.outlinePanel.checkOutlineNodeSelected('Create');
        }
    );

    test(
        '3: Filter Outline options',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            await editor.outlinePanel.checkFilterOptionsTitle('Manage Filters');
            await editor.outlinePanel.getFilterOptionFunnel().click();
            const options = await editor.outlinePanel.getEnabledOptionsInFilterOutline();
            expect(
                options,
                `Check filter options contains \`Focus editable, Show only commonly used\` and are checked in the Manage Filters callout in Outline panel`
            ).toEqual(['Focus editable', 'Show only commonly used']);

            // show editable controls
            let nodes = await editor.outlinePanel.getOutlineNodes<any[]>('focus_editable', 'span.tree-cell');
            await test.step(`Check that both \`editable\` and \`non-editable(grayed out)\` controls are present in the Outline Panel.`, async () => {
                for (const node of nodes) {
                    expect(typeof node?.focusEditable).toBe('boolean');
                }
            });

            await page
                .locator('label')
                .filter({ hasText: 'Focus editable' })
                .locator('i')
                .describe(`\`Focus Editable\` option to uncheck in the Manage Filters callout in Outline panel`)
                .click();
            nodes = await editor.outlinePanel.getOutlineNodes<any[]>('focus_editable', 'span.tree-cell');

            await test.step(`Check the controls which were \`disabled (gray out)\` are now \`enabled(not gray out)\` in the Outline Panel.`, async () => {
                for (const node of nodes) {
                    expect(node.focusEditable).toEqual(false);
                }
            });

            await editor.outlinePanel.getFilterOptionFunnel().click();

            // get commonly used controls
            let nodesCount = await editor.outlinePanel.getOutlineNodes<number>(
                'show_common_only',
                '[id=list-outline] [class=tree-row]'
            );

            await page
                .locator('label')
                .filter({ hasText: 'Show only commonly used' })
                .locator('i')
                .describe(
                    `\`Show only commonly used\` option to uncheck in the Manage Filters callout in Outline panel`
                )
                .click();
            nodes = await editor.outlinePanel.getOutlineNodes('all', '[id=list-outline] [class=tree-row]');

            // check funnel tooltip text when no filters are active
            expect(await editor.outlinePanel.getFilterOptionFunnel().getAttribute('title')).toBe('Filter');

            // the tree is expanded to all controls
            expect(
                nodes,
                'Check that the outline tree has been expanded to include all controls in the Outline Panel'
            ).toBeGreaterThanOrEqual(nodesCount);

            // click 'funnel' button in the outline right to the search input field
            await editor.outlinePanel.getFilterOptionFunnel().click();

            // get all controls
            nodesCount = await editor.outlinePanel.getOutlineNodes<number>('all', '[id=list-outline] [class=tree-row]');

            await page
                .locator('label')
                .filter({ hasText: 'Show only commonly used' })
                .locator('i')
                .describe(`\`Show only commonly used\` option to check in the Manage Filters callout in Outline panel`)
                .click();
            nodes = await editor.outlinePanel.getOutlineNodes<any[]>(
                'show_common_only',
                '[id=list-outline] [class=tree-row]'
            );

            // the tree is reduced to commonly used controls
            expect(
                nodes,
                'Check that the outline tree has been reduced to include only commonly used controls in the Outline Panel'
            ).toBeLessThan(nodesCount);
        }
    );

    test(
        '4: Filter Outline and sticky search',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            await editor.outlinePanel.checkFilterOutlineIsVisible();
            await editor.outlinePanel.clickOnNode('OverflowToolbar');
            await editor.outlinePanel.checkFilterIsInViewPort();
            await editor.outlinePanel.checkFilterOutlineIsVisible();
        }
    );
});
