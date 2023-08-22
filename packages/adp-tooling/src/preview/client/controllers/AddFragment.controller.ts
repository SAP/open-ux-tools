import type Dialog from 'sap/m/Dialog';

import { ValueState } from 'sap/ui/core/library';

import Controller from 'sap/ui/core/mvc/Controller';

import type Event from 'sap/ui/base/Event';
import type EventProvider from 'sap/ui/base/EventProvider';
import type ManagedObject from 'sap/ui/base/ManagedObject';

import type JSONModel from 'sap/ui/model/json/JSONModel';

import ControlUtils from '../control-utils';

type ExtendedEventProvider = EventProvider & {
    setEnabled: (v: boolean) => {};
    getValue: () => string;
    getSelectedItem: () => {
        getTitle: () => string;
        getText: () => string;
        getCustomData: () => {
            [key: string]: Function;
        }[];
    };
    getSelectedKey: () => string;
    setValueState: (state: ValueState) => void;
    setValueStateText: (text: string) => void;
    setVisible: (bool: boolean) => void;
};

interface CreateFragmentProps {
    fragmentName: string;
    index: string | number;
    targetAggregation: string;
}

/**
 * @namespace adp.extension.controllers
 */
export default class AddFragment extends Controller {
    /**
     * Runtime control managed object
     */
    public runtimeControl: ManagedObject;
    /**
     * JSON Model that has the data
     */
    public model: JSONModel;
    /**
     * Dialog instance
     */
    public dialog: Dialog;
    /**
     * Function that fills the indexArray
     */
    public fillIndexArray: any;

    /**
     * Function that creates the XML fragment and the change file
     */
    public createNewFragment: (fragmentData: CreateFragmentProps, runtimeControl: ManagedObject) => Promise<void>;

    /**
     * Handles the change in aggregations
     *
     * @param event Event
     */
    onAggregationChanged(event: Event) {
        let selectedItem = '';
        const source = event.getSource() as ExtendedEventProvider;
        if (source.getSelectedItem()) {
            selectedItem = source.getSelectedItem().getText();
        }
        const selectedKey = source.getSelectedKey();

        this.model.setProperty('/selectedAggregation/key', selectedKey);
        this.model.setProperty('/selectedAggregation/value', selectedItem);

        let newSelectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, selectedItem)
        );

        newSelectedControlChildren = newSelectedControlChildren.map((key) => {
            return parseInt(key);
        });

        const updatedIndexArray: { key: number; value: number }[] = this.fillIndexArray(newSelectedControlChildren);

        this.model.setProperty('/index', updatedIndexArray);
        this.model.setProperty('/selectedIndex', updatedIndexArray.length - 1);
    }

    /**
     * Handles the change in target indexes
     *
     * @param event Event
     */
    onIndexChanged(event: Event) {
        const source = event.getSource() as ExtendedEventProvider;
        const selectedIndex = source.getSelectedItem().getText();
        this.model.setProperty('/selectedIndex', parseInt(selectedIndex));
    }

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onFragmentNameInputChange(event: Event) {
        const source = event.getSource() as ExtendedEventProvider;
        const fragmentName: string = source.getValue().trim();
        const fragmentList: { fragmentName: string }[] = this.model.getProperty(
            '/filteredFragmentList/unFilteredFragmentList'
        );

        const iExistingFileIndex = fragmentList.findIndex((f: { fragmentName: string }) => {
            return f.fragmentName === `${fragmentName}.fragment.xml`;
        });

        switch (true) {
            case iExistingFileIndex >= 0:
                source.setValueState(ValueState.Error);
                source.setValueStateText(
                    'Enter a different name. The fragment name that you entered already exists in your project.'
                );
                this.dialog.getBeginButton().setEnabled(false);
                this.model.setProperty('/fragmentNameToCreate', null);
                break;
            case fragmentName.length <= 0:
                this.dialog.getBeginButton().setEnabled(false);
                source.setValueState(ValueState.None);
                this.model.setProperty('/fragmentNameToCreate', null);
                break;
            case !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName):
                source.setValueState(ValueState.Error);
                source.setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                this.dialog.getBeginButton().setEnabled(false);
                this.model.setProperty('/fragmentNameToCreate', null);
                break;
            case fragmentName.length > 0:
                this.dialog.getBeginButton().setEnabled(true);
                source.setValueState(ValueState.None);
                this.model.setProperty('/fragmentNameToCreate', fragmentName);
                break;
            default:
                break;
        }
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource() as ExtendedEventProvider;
        source.setEnabled(false);
        // Need to create a new fragment and a respective change file
        const fragmentNameToCreate = this.model.getProperty('/fragmentNameToCreate');
        const fragmentData = {
            fragmentName: fragmentNameToCreate,
            index: this.model.getProperty('/selectedIndex'),
            targetAggregation: this.model.getProperty('/selectedAggregation/value')
        };
        await this.createNewFragment(fragmentData, this.runtimeControl);

        this.handleDialogClose();
    }

    /**
     * Handles the closing of the dialog
     */
    closeDialog() {
        this.handleDialogClose();
    }

    /**
     * Handles the dialog closing and destruction of it
     */
    private handleDialogClose() {
        this.dialog.close();
        this.dialog.destroy();
    }
}
