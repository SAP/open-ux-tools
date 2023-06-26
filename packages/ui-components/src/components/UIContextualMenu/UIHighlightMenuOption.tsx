import React from 'react';
import './UIHighlightMenuOption.scss';

export interface UIHighlightMenuOptionProps {
    text: string;
    query?: string;
}

/**
 * UIHighlightMenuOption component.
 *
 * @exports
 * @class UIHighlightMenuOption
 * @extends {React.Component<UIHighlightMenuOptionProps>}
 */
export class UIHighlightMenuOption extends React.Component<UIHighlightMenuOptionProps> {
    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        let text = this.props.text;
        let query = this.props.query;
        const parts: Array<JSX.Element | string> = [];
        if (text && query) {
            // There is search query - highlight occureance
            text = text.toString();
            query = query.toLowerCase();
            const simpleText = text.toLowerCase();
            const chars = query.length;
            let startIndex = 0;
            let index = simpleText.indexOf(query);
            const fnAddPart = (part: JSX.Element): number | null => (part ? parts.push(part) : null);
            // Highlight all occureances
            while (index !== -1) {
                fnAddPart(<span key={'text-' + startIndex}>{text.substring(startIndex, index)}</span>);
                fnAddPart(
                    <span className="ts-Menu-option--highlighted" key={'highlight-' + index}>
                        {text.substr(index, chars)}
                    </span>
                );
                startIndex = index + chars;
                index = simpleText.indexOf(query, index + chars);
                if (index === -1) {
                    fnAddPart(<span key={'text-' + startIndex}>{text.substring(startIndex, simpleText.length)}</span>);
                }
            }
        }
        if (parts.length === 0) {
            parts.push(text);
        }
        return <div className="ts-Menu-option">{parts}</div>;
    }
}
