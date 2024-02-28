import { useEffect, useState } from 'react';

export function useValue<S>(initialValue: S, propValue?: S): [S, (value: S) => void] {
    const [value, setValue] = useState(propValue ?? initialValue);

    useEffect(() => {
        // Update the local state value if new value from props is received
        if (propValue !== undefined && propValue !== value) {
            setValue(propValue);
        }
    }, [propValue]);

    const updateValue = (newValue: S) => {
        setValue(newValue);
    };

    return [value, updateValue];
}
