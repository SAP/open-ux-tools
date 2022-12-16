import { DirectionalHint } from '@fluentui/react';
import React from 'react';
import { UiIcons } from '../Icons';
import { UICallout } from '../UICallout';
import { UIIcon } from '../UIIcon';
import './UIActionCallout.scss';

export interface ActionCalloutProps {
    /** The id of the element to which this GA box will point */
    targetElementId: string;
    /** If true (default) the callout will be placed relative to the target element instead of floating using position absolute */
    showInline?: boolean;
    /** The action details that will be rendered in the component */
    actionDetail: IActionCalloutDetail;
    /** The function which will be passed the command */
    commandAction?(command: IActionCalloutDetail['command']): void;
    /** The icon to use if provided, otherwise a default icon is applied */
    icon?: UIIcon;
}

export interface IActionCalloutDetail {
    linkText: string;
    subText: string;
    /**
     * Command to be executed and parameters passed to the command
     */
    command?: {
        id: string;
        params: Object | string;
    };
    /**
     * A http url string, command takes precedence if provided
     */
    url?: string;
}

/**
 *
 *
 */
export class UIActionCallout extends React.Component<ActionCalloutProps> {
    private anchor: React.RefObject<HTMLAnchorElement>;
    private gaLink: IActionCalloutDetail;
    private commandAction: ActionCalloutProps['commandAction'];
    private targetElementId: string;
    private showInline: boolean | undefined;
    private icon: UIIcon | undefined;

    /**
     * Initializes component properties.
     *
     * @param {ActionCalloutProps} props
     */
    public constructor(props: ActionCalloutProps) {
        super(props);
        this.gaLink = props.actionDetail;
        this.commandAction = props.commandAction;
        this.targetElementId = props.targetElementId;
        this.showInline = props.showInline;
        this.anchor = React.createRef<HTMLAnchorElement>();
        this.onCalloutClick = this.onCalloutClick.bind(this);
        this.icon = props.icon;
    }

    private onCalloutClick() {
        if (this.gaLink.command && this.commandAction) {
            this.commandAction(this.gaLink.command);
        } else {
            this.anchor.current?.click();
        }
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <UICallout
                className="UIActionCallout-callout"
                onClick={this.onCalloutClick}
                target={`#${this.targetElementId}`}
                isBeakVisible={true}
                doNotLayer={true}
                beakWidth={4}
                calloutMaxWidth={230}
                calloutMinWidth={230}
                directionalHint={DirectionalHint.bottomLeftEdge}
                styles={{
                    calloutMain: { padding: '10px' },
                    root: { position: this.showInline === false ? 'absolute' : 'sticky' }
                }}>
                {(this.icon && this.icon.render()) || <UIIcon iconName={UiIcons.HelpAction}></UIIcon>}
                {/* We do not use the 'UILink' here as it or its 'link' component do not expose a 'ref' to the underlying HTMLElement, needed to trigger click */}
                <a
                    ref={this.anchor}
                    href={this.gaLink.url}
                    className="UIActionCallout-link"
                    target="_blank"
                    rel="noreferrer">
                    {this.gaLink.linkText}
                </a>
                <div className="UIActionCallout-subText">{this.gaLink.subText}</div>
            </UICallout>
        );
    }
}
