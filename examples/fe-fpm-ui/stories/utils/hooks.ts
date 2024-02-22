import { useState, useEffect, useRef } from 'react';
import { subscribeOnChoicesUpdate, unsubscribeOnChoicesUpdate } from './communication';
import { Choice, DynamicChoices } from '../../src/components';

export function useChoices(): DynamicChoices {
    const [choices, setChoices] = useState({});
    const internalChoices = useRef<DynamicChoices>({});

    useEffect(() => {
        function onChoicesReceived(name: string, newChoices: Choice[]) {
            console.log('onChoicesReceived!!!');
            internalChoices.current = {
                ...internalChoices.current,
                [name]: newChoices
            };
            setChoices(internalChoices.current);
        }

        const listener = subscribeOnChoicesUpdate(onChoicesReceived);
        return () => {
            unsubscribeOnChoicesUpdate(listener);
        };
    }, []);

    return choices;
}
