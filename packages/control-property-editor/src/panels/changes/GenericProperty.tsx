import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';
import React from 'react';
import styles from './DisplayAsIcon.module.scss';

interface GenericPropertyProps {
    value?: string | number | boolean;
    label: string;
}

const GenericProperty: React.FC<GenericPropertyProps> = ({ value, label }) => {
    const convertedLabel = convertCamelCaseToPascalCase(label);
    return (
        <>
            <span className={styles.genericPropLabel} title={convertedLabel}>
                {convertedLabel}:
            </span>
            {value !== undefined && value !== null && (
                <span className={styles.genericPropValue} title={value.toString()}>
                    {value}
                </span>
            )}
        </>
    );
};

export default GenericProperty;
