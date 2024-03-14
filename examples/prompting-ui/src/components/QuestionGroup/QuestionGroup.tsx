import React from 'react';
import './QuestionGroup.scss';
import ReactMarkdown from 'react-markdown';

export interface QuestionGroupProps {
    title: string;
    description?: string;
    showDescription?: boolean;
    children?: JSX.Element[];
}

export const QuestionGroup = (props: QuestionGroupProps) => {
    const { title, description, showDescription, children } = props;

    return (
        <div className="prompts-group">
            <div className="prompts-group-title-container">
                <li className="prompts-group-title">{title}</li>
            </div>
            {showDescription && <ReactMarkdown className="prompts-group-description">{description}</ReactMarkdown>}
            <div className="prompt-entries-group">{children}</div>
        </div>
    );
};
