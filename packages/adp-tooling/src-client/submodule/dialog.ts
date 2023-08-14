import MesssageBox from 'sap/m/MessageBox';
import { ButtonType } from 'sap/m/library';

export function showDialog() {
    MesssageBox.show('Hello World', { icon: MesssageBox.Icon.WARNING });
}
