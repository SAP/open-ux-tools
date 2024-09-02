import React from 'react';
import './QuestionGroup.scss';
import ReactMarkdown from 'react-markdown';

export interface QuestionGroupProps {
    id?: string;
    title: string;
    description?: string[];
    showDescription?: boolean;
    children?: JSX.Element[];
}

export const QuestionGroup = (props: QuestionGroupProps) => {
    const { title, description, showDescription, children, id } = props;
    return (
        <div id={id} className="prompts-group">
            <ul className="prompts-group-title-list">
                <div className="prompts-group-title-container">
                    <li className="prompts-group-title">{title}</li>
                </div>
            </ul>
            {showDescription &&
                description?.map((descriptionParagraph) => (
                    <div className="prompts-group-description" key={descriptionParagraph}>
                        <ReactMarkdown key={descriptionParagraph}>{descriptionParagraph}</ReactMarkdown>
                    </div>
                ))}
            <div className="prompt-entries-group">{children}</div>
        </div>
    );
};
