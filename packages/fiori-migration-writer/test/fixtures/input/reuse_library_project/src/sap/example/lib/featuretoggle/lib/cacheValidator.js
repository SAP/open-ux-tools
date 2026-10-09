/*eslint no-undef: 0*/
jQuery.sap.declare('sap.example.lib.featuretoggle.lib.cacheValidator');
sap.example.lib.featuretoggle.lib.cacheValidator = {
    setInitialize: function () {
        this.bBind = false;
        this.socket = null;
        this.bCacheStatus = false;
        this.oModel = null;
        this.bValueState = null;
        this.bValidateCache = false;
    },
    // If connection to web socket established
    getBindState: function () {
        return this.bBind;
    },
    // If ping from backend received
    // When the ping comes, status changed to false
    getCacheStatus: function () {
        return this.bCacheStatus;
    },
    // Get oData model
    getModel: function () {
        return this.oModel;
    },
    // If service is unavailable, returns false
    getValueState: function () {
        return this.bValueState;
    },
    // oData call has been made and data will be received
    // Safeguard to avoid double oData call: Useful in case of asynchronous call
    getValidateCache: function () {
        return this.bValidateCache;
    },
    setValueState: function (oState) {
        this.bValueState = oState;
    },
    setModel: function (oCopyModel) {
        this.oModel = oCopyModel;
    },
    setCacheStatus: function (bCacheStatusCopy) {
        this.bCacheStatus = bCacheStatusCopy;
    },

    setValidateCache: function (bCache) {
        this.bValidateCache = bCache;
    },
    getSocket: function () {
        return this.socket;
    },
    setSocketData: function (sSocket) {
        this.socket = sSocket;
    },
    dataSuccess: function (data) {
        this.oModel = data;
        this.bCacheStatus = true;
        this.oModel = data.d.results;
        this.bValueState = null;
        return this.oModel;
    },

    getData: function () {
        this.bValidateCache = true;
        // if (!oModel) {
        if (!this.bCacheStatus) {
            var that = this;
            var sUrl = '/sap/opu/odata/SAP/CA_FM_FEATURE_TOGGLE_STATUS_SRV/ToggleStatusSet?$format=json';
            $.ajax({
                method: 'GET',
                async: false,
                url: sUrl,
                success: function (data) {
                    // The list feature toggles which are inactive in that particular system,client will be returned
                    return that.dataSuccess(data);
                },
                error: function () {
                    this.bValueState = 'Service Unavailable';
                }
            });
        }
    },

    getDataAsync: function () {
        this.bValidateCache = true;
        if (!this.bCacheStatus) {
            var that = this;
            var sUrl = '/sap/opu/odata/SAP/CA_FM_FEATURE_TOGGLE_STATUS_SRV/ToggleStatusSet?$format=json';
            return new Promise(function (resolve, reject) {
                $.ajax({
                    method: 'GET',
                    async: true,
                    url: sUrl,
                    error: function () {
                        this.bValueState = 'Service Unavailable';
                        reject(new Error(this.bValueState));
                    },
                    success: function (data) {
                        // The list feature toggles which are inactive in that particular system,client will be returned
                        that.dataSuccess(data);
                        var oResult = {
                            getFeatureStatus: function (sFid) {
                                //Service availabiilty
                                if (sap.example.lib.featuretoggle.lib.cacheValidator.getValueState()) {
                                    return sap.example.lib.featuretoggle.lib.cacheValidator.getValueState();
                                }
                                if (!sap.example.lib.featuretoggle.lib.cacheValidator.getModel()) {
                                    return false;
                                }
                                var oModel = sap.example.lib.featuretoggle.lib.cacheValidator.getModel();
                                var iLen = oModel.length;
                                for (var iFeatureList = 0; iFeatureList < iLen; iFeatureList++) {
                                    if (oModel[iFeatureList].Featureid.toUpperCase() === sFid.toUpperCase()) {
                                        return false;
                                    }
                                }
                                return true;
                            }
                        };
                        resolve(oResult);
                    }
                });
            });
        }
    },
    getWebSocketURI: function () {
        var hostLocation = window.location,
            socketHostURI,
            webSocketURI;
        if (hostLocation.protocol === 'https:') {
            socketHostURI = 'wss:';
        } else {
            socketHostURI = 'ws:';
        }
        jQuery.sap.require('sap.ui.core.ws.SapPcpWebSocket');
        socketHostURI += '//' + hostLocation.host;
        webSocketURI = socketHostURI + '/sap/bc/apc/sap/fm_notification_apc';
        return webSocketURI;
    },
    setSocket: function () {
        var webSocketURI = this.getWebSocketURI();
        this.socket = new sap.ui.core.ws.SapPcpWebSocket(
            webSocketURI,
            sap.ui.core.ws.SapPcpWebSocket.SUPPORTED_PROTOCOLS.v10
        );
    },
    webSocketConnection: function () {
        try {
            this.socket.attachOpen(function () {
                this.bBind = true;
            }, this);
            this.socket.send('sMessage');
            this.socket.attachClose(function () {}, this);

            this.socket.attachMessage(function () {
                this.bCacheStatus = false;
                this.bValidateCache = false;
            }, this);
        } catch (exception) {
            // sap.m.MessageToast.show("Hi Exception");
        }
    }
};
