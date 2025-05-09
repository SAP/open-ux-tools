import { convertCamelCaseToPascalCase } from '@sap-ux-private/control-property-editor-common';
import React from 'react';
import styles from './DisplayAsIcon.module.scss';

interface GenericPropertyProps {
    value: string | number | boolean | object;
    label: string;
}

const GenericProperty: React.FC<GenericPropertyProps> = ({ value, label }) => {
    return (
        <>
            <span className={styles.genericPropLabel}>{convertCamelCaseToPascalCase(label)}:</span>
            <span className={styles.genericPropValue}>{typeof value === 'object' ? '[Object]' : value}</span>
        </>
    );
};

export default GenericProperty;
