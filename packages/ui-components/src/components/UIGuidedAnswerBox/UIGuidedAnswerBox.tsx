import { DirectionalHint } from '@fluentui/react';
import React from 'react';
import { UiIcons } from '../Icons';
import { UICallout } from '../UICallout';
import { UIIcon } from '../UIIcon';
import './UIGuidedAnswerBox.scss';

export interface GuidedAnswerBoxProps {
    /** The id of the element to which this GA box will point */
    targetElementId: string;
    /** If true (default) the callout will be placed relative to the target element instead of floating using position absolute */
    showInline?: boolean;
    /** Guided Answer related properties */
    guidedAnswerLink: IGuidedAnswerLink;
    /** The function which will be passed the command */
    commandAction?(command: IGuidedAnswerLink['command']): void;
}

export interface IGuidedAnswerLink {
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
export class UIGuidedAnswersBox extends React.Component<GuidedAnswerBoxProps> {
    private anchor: React.RefObject<HTMLAnchorElement>;
    private gaLink: IGuidedAnswerLink;
    private commandAction: GuidedAnswerBoxProps['commandAction'];
    private targetElementId: string;
    private showInline: boolean | undefined;

    /**
     * Initializes component properties.
     *
     * @param {GuidedAnswerBoxProps} props
     */
    public constructor(props: GuidedAnswerBoxProps) {
        super(props);
        this.gaLink = props.guidedAnswerLink;
        this.commandAction = props.commandAction;
        this.targetElementId = props.targetElementId;
        this.showInline = props.showInline;
        this.anchor = React.createRef<HTMLAnchorElement>();
        this.onCalloutClick = this.onCalloutClick.bind(this);
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
                className="uiGuidedAnswerBox-callout"
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
                <UIIcon iconName={UiIcons.GuidedAnswerLink}></UIIcon>
                {/* We do not use the 'UILink' here as it or its 'link' component do not expose a 'ref' to the underlying HTMLElement, needed to trigger click */}
                <a
                    ref={this.anchor}
                    href={this.gaLink.url}
                    className="uiGuidedAnswerBox-link"
                    target="_blank"
                    rel="noreferrer">
                    {this.gaLink.linkText}
                </a>
                <div className="uiGuidedAnswerBox-subText">{this.gaLink.subText}</div>
            </UICallout>
        );
    }
}
