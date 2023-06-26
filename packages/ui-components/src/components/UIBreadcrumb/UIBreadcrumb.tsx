import React from 'react';

import type { IBreadcrumbProps, IBreadcrumbStyles } from '@fluentui/react';
import { Breadcrumb } from '@fluentui/react';

/**
 * UIBreadcrumb component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/breadcrumb
 *
 * @exports
 * @class UIBreadcrumb
 * @extends {React.Component<IBreadcrumbProps, {}>}
 */
export class UIBreadcrumb extends React.Component<IBreadcrumbProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IBreadcrumbProps} props
     */
    public constructor(props: IBreadcrumbProps) {
        super(props);
    }

    protected setStyle = (): Partial<IBreadcrumbStyles> => ({
        ...{
            root: {}
        }
    });

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <Breadcrumb {...this.props} />;
    }
}
