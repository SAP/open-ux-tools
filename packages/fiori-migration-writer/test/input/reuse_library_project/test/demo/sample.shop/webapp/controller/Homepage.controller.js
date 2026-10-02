/*
Demo Application to test Feature Toggle UI Library
The application has a table of a list of products. On selection of products from the list, the Wishlist functionality is
only available if the status is true for the feature toggle id : CFND_FM_DEMO
*/
sap.ui.define(
    ['sap/ui/core/mvc/Controller', 'sap/m/MessageToast', 'Demo/model/formatter', 'Demo/reuse/util/formatter'],
    function (Controller, MessageToast, formatter, formatterReuse) {
        'use strict';

        return Controller.extend('Demo.controller.Homepage', {
            formatter: formatter,
            formatterReuse: formatterReuse,
            onInit: function () {
                //Get the Feature Toggle Status and update the view accordingly
                this._getFeatureStatus();
                this._oResourceBundle = this.getOwnerComponent().getModel('i18n').getResourceBundle();
                this._oCatalog = this.byId('catalogTable');
                var oViewModel = new sap.ui.model.json.JSONModel({
                    personalizationActive: false,
                    catalogTitle: 'Products',
                    tableBusyDelay: 0
                });
                this.getView().setModel(oViewModel, 'productListView');
                var sPath = jQuery.sap.getModulePath('Demo/model', '/Products.json');
                var oModel = new sap.ui.model.json.JSONModel(sPath);
                this.getView().setModel(oModel);
            },

            //This method makes the call to fetch the Feature Toggle Status
            _getFeatureStatus: function () {
                var bCart, bWishlist;
                var p = sap.s4h.cfnd.featuretoggle.lib.featuresAsync();
                p.then(
                    function (features) {
                        /*Promise is resolved, promise returns a method to fetch the feature toggle status
					by passing featureId as param*/
                        bCart = features.getFeatureStatus('cfnd_fm_democart');
                        bWishlist = features.getFeatureStatus('cfnd_fm_demo');
                        this.byId('addItemsToCartButton').setVisible(bCart);
                        this.byId('addItemsToWishlist').setVisible(bWishlist);
                    }.bind(this)
                ).catch(
                    function (oError) {
                        // Promise has been rejected since service is unavailable
                        MessageToast.show('An Error occurred, unable to load the feature toggle status');
                    }.bind(this)
                );
            },
            onItemSelected: function () {
                var oItems = this._oCatalog.getSelectedItems();
                if (oItems.length > 0) {
                    this.getView().getModel('productListView').setProperty('/hasSelectedItems', true);
                    this.getView()
                        .getModel('productListView')
                        .setProperty(
                            '/openLinkText',
                            this._oResourceBundle.getText('xbut.openItemsCount', [oItems.length])
                        );
                    this.getView()
                        .getModel('productListView')
                        .setProperty(
                            '/addItemsToCartText',
                            this._oResourceBundle.getText('xbut.addItemsToCartCount', [oItems.length])
                        );
                    this.getView()
                        .getModel('productListView')
                        .setProperty(
                            '/addItemsToWishListText',
                            this._oResourceBundle.getText('xbut.addItemsToWishListCount', [oItems.length])
                        );
                } else {
                    this.getView().getModel('productListView').setProperty('/hasSelectedItems', false);
                    this.getView()
                        .getModel('productListView')
                        .setProperty('/openLinkText', this._oResourceBundle.getText('xbut.openItems'));
                    this.getView()
                        .getModel('productListView')
                        .setProperty('/addItemsToCartText', this._oResourceBundle.getText('xbut.addToCart'));
                    this.getView()
                        .getModel('productListView')
                        .setProperty('/addItemsToWishListText', this._oResourceBundle.getText('xbut.addToWishList'));
                }
            },
            onAddItemsToCartPressed: function () {
                this._selectedItems = this._oCatalog.getSelectedItems();
                MessageToast.show(this._oResourceBundle.getText('ymsg.addProducts', [this._selectedItems.length]));
                this.getView().byId('catalogTable').removeSelections();
                this.onItemSelected();
            },
            onAddToWishListPressed: function () {
                MessageToast.show('The product has been added to the Wish List');
                this.getView().byId('catalogTable').removeSelections();
                this.onItemSelected();
            }
        });
    }
);
