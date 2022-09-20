import type * as React from 'react';
import type { ToggleGroupOption } from '../UIToggleGroup.types';

export interface UIToggleGroupOptionProps extends Omit<ToggleGroupOption, 'key'> {
    itemKey: string;
    key?: string;
    onClick?: (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>, props?: UIToggleGroupOptionProps) => void;
    onKeyDown?: (evt: React.KeyboardEvent<HTMLButtonElement>, props?: UIToggleGroupOptionProps) => void;
    onFocus?: (evt: React.FocusEvent<HTMLButtonElement>, props?: UIToggleGroupOptionProps) => void;
    onBlur?: (evt: React.FocusEvent<HTMLButtonElement>, props?: UIToggleGroupOptionProps) => void;
}
