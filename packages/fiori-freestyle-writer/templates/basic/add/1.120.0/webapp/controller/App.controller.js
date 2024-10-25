sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (Controller) => {
  "use strict";

  return Controller.extend("<%- app.id %>.controller.<%- template.settings.viewName %>", {
      onInit() {
      }
  });
});