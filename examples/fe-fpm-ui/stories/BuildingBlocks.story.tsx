import React from 'react';
import { Questions } from '../src/components';
import type { Question } from '../src/components';
import { initIcons } from '@sap-ux/ui-components';
import { onMessageAttach, sendMessage, getWebSocket, getQuestions } from './utils/communication';
import { SupportedBuildingBlocks } from '../.storybook/building-blocks/types';

export default { title: 'Building Blocks' };

initIcons();
getWebSocket();

const BuildingBlockQuestions = (props: { type: SupportedBuildingBlocks }): JSX.Element => {
    const { type } = props;
    const [questions, setQuestions] = React.useState<Question[]>([]);
    React.useEffect(() => {
        getQuestions(type).then((newQuestions) => {
            setQuestions(newQuestions as Question[]);
        });
        // ToDo - choice update
        onMessageAttach('CHOICES_UPDATE', () => {});
    }, []);
    return (
        <Questions
            questions={questions}
            onChoiceRequest={(name: string) => {
                sendMessage({
                    name
                });
            }}
            onChange={() => {
                console.log('change?');
            }}
        />
    );
};

export const table = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} />;
};

export const chart = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Chart} />;
};

export const filterBar = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.FilterBar} />;
};

export const custom = (): JSX.Element => {
    return <div>Exclude questions???</div>;
};
