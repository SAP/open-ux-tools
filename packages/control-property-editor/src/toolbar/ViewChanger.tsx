import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import type { UIComboBoxOption, UIComboBoxRef } from '@sap-ux/ui-components';
import { UIComboBox, UIIconButton, UiIcons } from '@sap-ux/ui-components';

import type { RootState } from '../store';
import { changePreviewScale, changePreviewScaleMode } from '../slice';

import styles from './ViewChanger.module.scss';

const ZOOM_STEP = 0.1;
const SCALE_INPUT_PATTERN = /(\d{1,20})%/;
const MAX_SCALE = 1;
const MIN_SCALE = 0.1;
const FIT_PREVIEW_KEY = 'fit';

/**
 * React element to view changer.
 *
 * @returns ReactElement
 */
export function ViewChanger(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const scale = useSelector<RootState, number>((state) => state.scale);
    const fitPreview = useSelector<RootState, boolean>((state) => state.fitPreview ?? false);
    const options = [
        {
            key: 0.25,
            text: '25%'
        },
        {
            key: 0.5,
            text: '50%'
        },
        {
            key: 0.75,
            text: '75%'
        },
        {
            key: 1,
            text: '100%'
        },
        {
            key: FIT_PREVIEW_KEY,
            text: t('FIT_PREVIEW')
        }
    ];
    const key = fitPreview ? FIT_PREVIEW_KEY : scale;
    const selectedOption = options.find((enumValue) => enumValue.key === key);
    const text = !selectedOption && scale ? scaleInPercent(scale) : undefined;

    function zoomIn(): void {
        const newScale = Math.min(scale + ZOOM_STEP, MAX_SCALE);
        dispatch(changePreviewScale(newScale));
        dispatch(changePreviewScaleMode('fixed'));
    }

    function zoomOut(): void {
        const newScale = Math.max(scale - ZOOM_STEP, MIN_SCALE);
        dispatch(changePreviewScale(newScale));
        dispatch(changePreviewScaleMode('fixed'));
    }

    /**
     *
     * @param event React.FormEvent<UIComboBoxRef>
     * @param option UIComboBoxOption
     * @param index number
     * @param value string
     */
    function onChange(
        event: React.FormEvent<UIComboBoxRef>,
        option?: UIComboBoxOption,
        index?: number,
        value?: string
    ): void {
        if (option?.key) {
            if (typeof option?.key === 'number') {
                dispatch(changePreviewScale(option?.key));
                dispatch(changePreviewScaleMode('fixed'));
            } else {
                dispatch(changePreviewScaleMode('fit'));
            }
        } else if (value) {
            const match = SCALE_INPUT_PATTERN.exec(value);
            if (match) {
                const percent = parseInt(match[1], 10);
                const newScale = percent / 100;
                if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
                    dispatch(changePreviewScale(newScale));
                    dispatch(changePreviewScaleMode('fixed'));
                }
            }
        }
    }

    return (
        <>
            <UIIconButton
                title={t('ZOOM_OUT')}
                iconProps={{
                    iconName: UiIcons.ZoomOut
                }}
                disabled={scale <= MIN_SCALE}
                onClick={zoomOut}
            />
            <UIComboBox
                id="view-changer-combobox"
                data-testid={`testId-view-changer-combobox`}
                className={styles.zoomInput}
                autoComplete="off"
                selectedKey={key}
                text={text}
                allowFreeform={true}
                useComboBoxAsMenuWidth={true}
                options={options}
                onChange={onChange}
            />
            <UIIconButton
                title={t('ZOOM_IN')}
                iconProps={{
                    iconName: UiIcons.ZoomIn
                }}
                disabled={scale >= MAX_SCALE}
                onClick={zoomIn}
            />
        </>
    );
}

/**
 * Scale in percent.
 *
 * @param scale number
 * @returns scaled value - string
 */
function scaleInPercent(scale: number): string {
    return `${Math.floor(scale * 100)}%`;
}
