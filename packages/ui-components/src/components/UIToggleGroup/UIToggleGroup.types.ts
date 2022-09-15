export interface UIToggleGroupProps {
    options: ToggleGroupOption[];
    labelId?: string;
    label?: string;
    ariaLabel?: string;
    selectedKey?: string;
    required?: boolean;
    disabled?: boolean;
    onChange?: (itemKey: string, isSelected: boolean) => void;
}

export interface ToggleGroupOption {
    key: string;
    disabled?: boolean;
    selected?: boolean;
    focused?: boolean;
    id?: string;
    labelId?: string;
    ariaLabel?: string;
    title?: string;
    text?: string;
    icon?: string;
}
