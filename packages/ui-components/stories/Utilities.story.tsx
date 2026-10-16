import React from 'react';
import { Stack } from '@fluentui/react';
import type { IStackTokens } from '@fluentui/react';
import { UICallout } from '../src/components';

export default { title: 'Utilities/Misc' };

const stackTokens: IStackTokens = { childrenGap: 20 };

const getContent = (name: string): JSX.Element => {
    return (
        <div
            style={{
                padding: 10
            }}>
            {name}
            <br />
            lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore
            magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
            consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt
        </div>
    );
};

export const shadows = () => {
    const stacks: JSX.Element[] = [];
    const classNames = ['ui-box-shadow-small', 'ui-box-shadow-medium', 'ui-box-shadow-large'];
    for (let i = 0; i < classNames.length; i++) {
        const className = classNames[i];
        const id = `host-${i}`;
        stacks.push(
            <Stack tokens={stackTokens} key={className}>
                <div id={id}></div>
                <UICallout
                    className={className}
                    styles={{
                        root: {
                            position: 'static'
                        }
                    }}
                    layerProps={{
                        hostId: id
                    }}>
                    {getContent(className)}
                </UICallout>
            </Stack>
        );
    }
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            {stacks}
        </Stack>
    );
};

export const spacing = () => {
    const variables = [
        '--ui-spacing-xs',
        '--ui-spacing-small',
        '--ui-spacing-medium',
        '--ui-spacing-large',
        '--ui-spacing-xl',
        '--ui-spacing-xxl'
    ];

    return (
        <Stack tokens={stackTokens}>
            {variables.map((variable) => (
                <Stack horizontal verticalAlign="center" tokens={stackTokens} key={variable}>
                    <code style={{ width: 180 }}>{variable}</code>
                    <div
                        style={{
                            background: 'var(--vscode-textLink-foreground)',
                            height: 20,
                            width: `var(${variable})`
                        }}
                    />
                </Stack>
            ))}
        </Stack>
    );
};
