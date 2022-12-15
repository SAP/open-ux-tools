import React from 'react';
import { IconFontSizes, IStackTokens } from '@fluentui/react';
import { Stack } from '@fluentui/react';
import { IActionCalloutDetail, UIActionCallout, UIIcon, UiIcons } from '../src';

export default { title: 'Utilities/GuidedAnswerBox' };
const stackTokens: IStackTokens = { childrenGap: 40 };
const someHelpLink: IActionCalloutDetail = {
    linkText: 'Need help with this error?',
    subText: 'Guided Answers might be able to help.',
    url: 'http://some.url/some/page' 
}

const someActionLink: IActionCalloutDetail = {
    linkText: 'Click to action!',
    subText: 'Some action will do the thing you need',
    url: 'http://some.url/some/page' 
}

export const defaultUsage = (): JSX.Element => {
    return (
       
        <Stack
        tokens={stackTokens}
        style={{
            width: 300
        }}>
         <Stack tokens={stackTokens}>
            <div id="aDivId" style={{ width: 'fit-content' }}>
                Some text that needs help as link
            </div>
            <UIActionCallout
                showInline={false}
                targetElementId={'aDivId'}
                actionDetail={someHelpLink}>
            </UIActionCallout>
        </Stack>

        <Stack tokens={stackTokens}>
            <div id="aDivId1" style={{ width: 'fit-content' }}>
                Some text that needs action with specified icon
            </div>
            <UIActionCallout
                icon={ new UIIcon({ iconName: UiIcons.Bulb })}
                showInline={false}
                targetElementId={'aDivId1'}
                actionDetail={someActionLink}>
            </UIActionCallout>
        </Stack>
    </Stack>
    );
};
