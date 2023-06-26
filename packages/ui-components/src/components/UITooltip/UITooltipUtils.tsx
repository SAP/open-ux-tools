import React from 'react';
import type { ITooltipProps, ITooltipStyles } from '@fluentui/react';
import sanitizeHtml from 'sanitize-html';

import { CALLOUT_STYLES } from '../UICallout';

/**
 * UITooltipUtil class for rendering content
 *
 * @class UITooltipUtils
 */
export class UITooltipUtils {
    /**
     * Method returns styles for tooltip content.
     *
     * @returns {ITooltipStyles} Object with tooltip styles.
     */
    public static getStyles(): ITooltipStyles {
        return {
            root: {},
            content: {
                background: CALLOUT_STYLES.background,
                color: CALLOUT_STYLES.text
            },
            subText: {}
        };
    }

    public static renderContent = (content: string | React.ReactElement | null): ITooltipProps => {
        return {
            onRenderContent: () => <span>{content ?? ''}</span>,
            styles: UITooltipUtils.getStyles()
        } as ITooltipProps;
    };

    public static renderHTMLContent = (content: string): ITooltipProps => {
        const sanitized = sanitizeHtml(content);

        return {
            onRenderContent: () => <span dangerouslySetInnerHTML={{ __html: sanitized }} />,
            styles: UITooltipUtils.getStyles()
        } as ITooltipProps;
    };
}
