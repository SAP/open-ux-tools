import { useEffect, useRef, useState } from 'react';
import type { DynamicChoices } from '../components';

interface RequestedChoices {
    [key: string]: boolean;
}

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

export function useRequestedChoices(
    initialValue: RequestedChoices,
    latestChoices: DynamicChoices
): [RequestedChoices, (value: string[]) => void] {
    const requests = useRef<RequestedChoices>({ ...initialValue });
    const [pendingRequests, setPendingRequests] = useState<RequestedChoices>({ ...requests.current });
    const choices = useRef<DynamicChoices>({ ...latestChoices });
    const setRequestedChoices = (names: string[]) => {
        for (const name of names) {
            requests.current[name] = true;
            // Remove previous choices
            delete choices.current[name];
        }
        setPendingRequests({ ...requests.current });
    };
    useEffect(() => {
        let updated: boolean = false;
        for (const name in latestChoices) {
            if (!choices.current[name]) {
                updated = true;
                // Update local choices and pending requests
                choices.current[name] = latestChoices[name];
                delete requests.current[name];
            }
        }
        choices.current = { ...latestChoices };
        if (updated) {
            setPendingRequests({ ...requests.current });
        }
    }, [latestChoices]);
    return [pendingRequests, setRequestedChoices];
}
