import React from 'react';
import type { IPersonaProps, IPersonaStyles, IPersonaStyleProps } from '@fluentui/react';
import { Persona, PersonaSize, PersonaPresence } from '@fluentui/react';

export { PersonaSize as UIPersonaSize };
export { PersonaPresence as UIPersonaPresence };
export type UIPersonaProps = IPersonaProps;

/**
 * UIPersona component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/persona
 *
 * @exports
 * @class UIPersona
 * @extends {React.Component<IPersonaProps, {}>}
 */
export class UIPersona extends React.Component<IPersonaProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param props
     */
    public constructor(props: IPersonaProps) {
        super(props);
    }

    private personaStyles = (_props: IPersonaStyleProps): Partial<IPersonaStyles> => {
        return {
            ...{
                root: {},
                details: {},
                primaryText: {},
                secondaryText: {},
                tertiaryText: {},
                optionalText: {},
                textContent: {}
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <Persona {...this.props} styles={this.personaStyles} />;
    }
}
