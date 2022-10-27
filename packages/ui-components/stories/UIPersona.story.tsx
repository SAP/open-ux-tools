import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Stack } from '@fluentui/react';
import { UIPersona, UIPersonaSize, UIPersonaPresence } from '../src/components/UIPersona';

export default { title: 'Utilities/Persona' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack tokens={stackTokens}>
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size24}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size32}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size40}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size48}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size56}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size72}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size100}
            />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size120}
            />
            <UIPersona text="John Doe" size={UIPersonaSize.size72} />
            <UIPersona
                imageUrl={`https://static2.sharepointonline.com/files/fabric/office-ui-fabric-react-assets/persona-male.png`}
                size={UIPersonaSize.size120}
                text={'John Doe'}
                presence={UIPersonaPresence.online}
                secondaryText={'Software Engineer'}
                tertiaryText={'In a meeting'}
                optionalText={'Available at 4:00pm'}
            />
        </Stack>
    );
};
