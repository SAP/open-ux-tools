import { useCallback, useRef } from 'react';
import { UIContextualMenuItem } from '../../../UIContextualMenu';
import { UISelectableOptionWithSubValues } from '../types';

export function getOption(
    options: UISelectableOptionWithSubValues[],
    key?: string | number | null
): UISelectableOptionWithSubValues | undefined {
    return options.find((option) => option.key === key);
}

export const resolveValueForOption = (option: UISelectableOptionWithSubValues | UIContextualMenuItem): string => {
    if (!option.editable) {
        return option.key.toString();
    }
    const { text, subValue } = option;
    const value = subValue ? subValue.key : option.key;
    if (text !== undefined) {
        return `${value}-${text.replace(/\s/g, '')}`;
    }
    return value.toString();
};

export const isValueValid = (option: UISelectableOptionWithSubValues | UIContextualMenuItem): boolean => {
    return !option.editable || !!option.text;
};
