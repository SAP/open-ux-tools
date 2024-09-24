import { UIIcon, UiIcons } from '@sap-ux/ui-components';
import React from 'react';

type IRenderFunction<P> = (props?: P, defaultRender?: (props?: P) => JSX.Element | null) => JSX.Element | null;

export const onLabelRender = function <P>(
    tooltipText?: string,
    props?: P,
    defaultRender?: (props?: P) => React.ReactElement | null
): React.ReactElement | null {
    return (
        <div className="input__label">
            {defaultRender ? defaultRender(props) : undefined}
            {tooltipText && <UIIcon iconName={UiIcons.Info} title={tooltipText} />}
        </div>
    );
};

export const getLabelRenderer = function <P>(title?: string): IRenderFunction<P> | undefined {
    return title
        ? (props?: P, defaultRender?: (props?: P) => React.ReactElement | null) => {
              return onLabelRender(title, props, defaultRender);
          }
        : undefined;
};

/**
 * Method formats passed id into valid selector id for 'querySelector(#{id})'
 * @param id - Passed id for formatting.
 * @returns Formatted id.
 */
export function formatDomId(id: string): string {
    return id.replace(/[@.:#<>]/g, '-');
}
