import React, { useCallback } from 'react';
import { TranslationKeyGenerator, TranslationTextPattern, UITranslationInput } from '@sap-ux/ui-components';
import type { TranslationEntry } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities/index.js';
import { useTranslation } from '../../../context/TranslationContext.js';
import type { InputProps } from './Input.js';
import { TRANSLATE_EVENT_UPDATE, TRANSLATE_EVENT_SHOW } from '../../../types.js';
import type { TranslationProperties } from '../../../types.js';

export interface TranslationInputProps extends InputProps {
    properties: TranslationProperties;
}

export const TranslationInput = (props: TranslationInputProps) => {
    const { bundle, onEvent: triggerEvent, pendingQuestions } = useTranslation();
    const { name, onChange, guiOptions = {}, message, errorMessage, id, properties } = props;
    const { mandatory, hint, placeholder } = guiOptions;
    const [value, setValue] = useValue('', props.value);
    const onLiveChange = (_event: React.FormEvent, newValue?: string | undefined) => {
        setValue(newValue ?? '');
        onChange?.(name, newValue);
    };

    const onCreateNewEntry = useCallback(
        (entry: TranslationEntry): void => {
            triggerEvent?.(name, {
                name: TRANSLATE_EVENT_UPDATE,
                entry,
                properties
            });
        },
        [name]
    );

    const onShowExistingEntry = useCallback(
        (entry: TranslationEntry): void => {
            triggerEvent?.(name, {
                name: TRANSLATE_EVENT_SHOW,
                entry
            });
        },
        [name]
    );

    return (
        <UITranslationInput
            onRenderLabel={getLabelRenderer(hint)}
            required={mandatory}
            label={typeof message === 'string' ? message : name}
            value={value ? value.toString() : ''}
            onChange={onLiveChange}
            errorMessage={errorMessage}
            placeholder={placeholder ?? 'Enter a value'}
            id={id ?? ''}
            allowedPatterns={[TranslationTextPattern.SingleBracketBinding]}
            defaultPattern={TranslationTextPattern.SingleBracketBinding}
            i18nPrefix="i18n"
            namingConvention={TranslationKeyGenerator.CamelCase}
            entries={bundle}
            onCreateNewEntry={onCreateNewEntry}
            onShowExistingEntry={onShowExistingEntry}
            busy={{
                busy: pendingQuestions?.includes(name),
                useMinWaitingTime: true
            }}
        />
    );
};
