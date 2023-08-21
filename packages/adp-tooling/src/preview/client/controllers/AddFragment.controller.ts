import MessageBox from 'sap/m/MessageBox';
import Controller from 'sap/ui/core/mvc/Controller';

/**
 * @namespace adp.extension.controllers
 */
export default class AddFragment extends Controller {
    public onInit(): void {
        MessageBox.show('Alert from Controller');
    }
}
