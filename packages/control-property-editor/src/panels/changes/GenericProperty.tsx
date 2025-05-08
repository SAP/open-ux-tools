import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';
import React from 'react';

interface GenericPropertyProps {
    value: string | number | boolean | object;
    label: string;
}

const GenericProperty: React.FC<GenericPropertyProps> = ({ value, label }) => {
    return (
        <>
            <span style={{ lineHeight: '18px', whiteSpace: 'nowrap', marginRight: '5px', fontWeight: 'bold' }}>
                {convertCamelCaseToPascalCase(label)}:
            </span>
            <span
                style={{
                    flex: '1 1 auto',
                    minWidth: '0px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    direction: 'rtl',
                    textAlign: 'left'
                }}>
                {typeof value === 'object' ? '[Object]' : value}
            </span>
        </>
    );
};

export default GenericProperty;
