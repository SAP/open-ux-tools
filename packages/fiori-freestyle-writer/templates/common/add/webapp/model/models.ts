import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

export function createDeviceModel () {
    var model = new JSONModel(Device);
    model.setDefaultBindingMode("OneWay");
    return model;
}