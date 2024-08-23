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

    /**
     * Method returns object which can be used to render tooltip's text content.
     *
     * @param content Content to render in tooltip.
     * @returns {ITooltipProps} Tooltip properties.
     */
    public static renderContent(content: string | React.ReactElement | null): ITooltipProps {
        return {
            onRenderContent: () => <span>{content ?? ''}</span>,
            styles: UITooltipUtils.getStyles()
        } as ITooltipProps;
    }

    /**
     * Method returns object which can be used to render tooltip's content with custom HTML content.
     *
     * @param content HTML content to render in tooltip.
     * @returns {ITooltipProps} Tooltip properties.
     */
    public static renderHTMLContent(content: string): ITooltipProps {
        const sanitized = sanitizeHtml(content);

        return {
            onRenderContent: () => <span dangerouslySetInnerHTML={{ __html: sanitized }} />,
            styles: UITooltipUtils.getStyles()
        } as ITooltipProps;
    }
}
