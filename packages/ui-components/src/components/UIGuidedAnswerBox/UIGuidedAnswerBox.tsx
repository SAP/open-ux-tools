import React from 'react';
import { UICallout } from '../UICallout';
import { DirectionalHint } from '@fluentui/react';
import './UIGuidedAnswerBox.scss';
import { UILink } from '../UILink';
import { UIIcon } from '../UIIcon';
import { UiIcons } from '../Icons';

interface GuidedAnswerBoxProps {
    targetElementId: string; // The id of the element to which this GA box will point
    showInline?: boolean; // If true (default) the callout will be placed relative to the target element instead of floating using position absolute
    guidedAnswerLink: IGuidedAnswerLink; // Guided Answer related properties
    commandAction?(command: IGuidedAnswerLink['command']): void; // The function which will be passed the command
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
    /**
     * Initializes component properties.
     *
     * @param {GuidedAnswerBoxProps} props
     */
    public constructor(props: GuidedAnswerBoxProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const { targetElementId, guidedAnswerLink: gaLink, commandAction, showInline } = this.props;
        // If `href` is not defined `link` renders as a button
        if (gaLink.command) {
            gaLink.url = undefined;
        }

        return (
            <UICallout
                className="uiGuidedAnswerBox-callout"
                target={`#${targetElementId}`}
                isBeakVisible={true}
                doNotLayer={true}
                beakWidth={4}
                calloutMaxWidth={230}
                calloutMinWidth={230}
                directionalHint={DirectionalHint.bottomLeftEdge}
                styles={{
                    calloutMain: { padding: '10px' },
                    root: { position: showInline === false ? 'absolute' : 'sticky' }
                }}>
                <UIIcon iconName={UiIcons.GuidedAnswerLink}></UIIcon>
                <UILink
                    className="uiGuidedAnswerBox-uiLink"
                    underline
                    href={gaLink.url}
                    target="_blank"
                    onClick={() => (commandAction ? commandAction(gaLink.command) : null)}>
                    {gaLink.linkText}
                </UILink>
                <div className="uiGuidedAnswerBox-subText">{gaLink.subText}</div>
            </UICallout>
        );
    }
}
