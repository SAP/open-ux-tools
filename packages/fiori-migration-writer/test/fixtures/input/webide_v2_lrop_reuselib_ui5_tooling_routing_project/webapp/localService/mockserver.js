sap.ui.define(['sap/ui/core/util/MockServer'], function (MockServer) {
    'use strict';
    var oMockServer,
        _sAppModulePath = 'i2d.qm.defect.records1/',
        _sJsonFilesModulePath = _sAppModulePath + 'localService/mockdata';

    return {
        /**
         * Initializes the mock server.
         * You can configure the delay with the URL parameter "serverDelay".
         * The local mock data in this folder is returned instead of the real data for testing.
         * @public
         */

        init: function () {
            var fnGetJSONFromFile = function (sFileName) {
                var _oJSON = null;
                $.ajax({
                    async: false,
                    global: false,
                    url: '../localService/mockdata/' + sFileName,
                    dataType: 'json',
                    success: function (data) {
                        _oJSON = data;
                    }
                });
                return _oJSON;
            };

            var oUriParameters = jQuery.sap.getUriParameters(),
                sJsonFilesUrl = jQuery.sap.getModulePath(_sJsonFilesModulePath),
                sManifestUrl = jQuery.sap.getModulePath(_sAppModulePath + 'manifest', '.json'),
                sEntity = 'C_DefectRecord',
                sErrorParam = oUriParameters.get('errorType'),
                iErrorCode = sErrorParam === 'badRequest' ? 400 : 500,
                oManifest = jQuery.sap.syncGetJSON(sManifestUrl).data,
                oDataSource = oManifest['sap.app'].dataSources,
                oMainDataSource = oDataSource.mainService,
                sMetadataUrl = jQuery.sap.getModulePath(
                    _sAppModulePath + oMainDataSource.settings.localUri.replace('.xml', ''),
                    '.xml'
                ),
                // ensure there is a trailing slash
                sMockServerUrl = /.*\/$/.test(oMainDataSource.uri) ? oMainDataSource.uri : oMainDataSource.uri + '/',
                aAnnotations = oMainDataSource.settings.annotations;

            oMockServer = new MockServer({
                rootUri: sMockServerUrl
            });

            // configure mock server with a delay of 1s
            MockServer.config({
                autoRespond: true,
                autoRespondAfter: oUriParameters.get('serverDelay') || 1000
            });

            // load local mock data
            oMockServer.simulate(sMetadataUrl, {
                sMockdataBaseUrl: sJsonFilesUrl,
                bGenerateMissingMockData: true,
                aEntitySetsNames: [
                    'C_DefectRecord',
                    'C_DefectTaskRecord',
                    'I_DefectCategory',
                    'I_DefectStatus',
                    'C_DefectQltyTskProcsrNotes',
                    'C_DefectRecordCodeVH'
                ]
            });

            var aRequests = oMockServer.getRequests(),
                fnResponse = function (iErrCode, sMessage, aRequest) {
                    aRequest.response = function (oXhr) {
                        oXhr.respond(
                            iErrCode,
                            {
                                'Content-Type': 'text/plain;charset=utf-8'
                            },
                            sMessage
                        );
                    };
                };

            // handling the metadata error test
            if (oUriParameters.get('metadataError')) {
                aRequests.forEach(function (aEntry) {
                    if (aEntry.path.toString().indexOf('$metadata') > -1) {
                        fnResponse(500, 'metadata Error', aEntry);
                    }
                });
            }

            // Handling request errors
            if (sErrorParam) {
                aRequests.forEach(function (aEntry) {
                    if (aEntry.path.toString().indexOf(sEntity) > -1) {
                        fnResponse(iErrorCode, sErrorParam, aEntry);
                    }
                });
            }

            //C_DefectRecordComplete?DefectInternalID=%27%2400000000372%27&DraftUUID=guid%2700000000-0000-0000-0000-000000000000%27&IsActiveEntity=true
            aRequests.push({
                method: 'POST',
                path: new RegExp('C_DefectRecordComplete\\?DefectInternalID=(.*)&DraftUUID=(.*)&IsActiveEntity=(.*)'),

                response: function (oXhr, DefectInternalID, DraftUUID, IsActiveEntity) {
                    var oResults = fnGetJSONFromFile('C_DefectRecordType_372_AfterComplete.json');
                    var oData = oMockServer.getEntitySetData('C_DefectRecord');
                    //oData.DefectLifeCycleStatus = "20";
                    //oData.DefectLifeCycleStatus_Text = "Completed";
                    oData[0].DefectLifecycleStatus = oResults.d.DefectLifecycleStatus;
                    oData[0].DefectLifecycleStatus_Text = oResults.d.DefectLifecycleStatus_Text;
                    oMockServer.setEntitySetData('C_DefectRecord', oData);
                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    jQuery.sap.log.debug('C_DefectRecord 372');
                    return oResults;
                }
            });
            aRequests.push({
                method: 'GET',
                path: new RegExp('C_DefectRecord.*.*372.*/'),
                response: function (oXhr) {
                    var oResults = fnGetJSONFromFile('C_DefectRecordType_372.json');
                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    jQuery.sap.log.debug('C_DefectRecord 372');
                    return oResults;
                }
            });
            aRequests.push({
                method: 'GET',
                path: new RegExp('C_DefectRecord.*.*373.*/'),
                response: function (oXhr) {
                    var oResults = fnGetJSONFromFile('C_DefectRecordType_373.json');
                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    jQuery.sap.log.debug('C_DefectRecord 373');
                    return oResults;
                }
            });

            aRequests.push({
                method: 'GET',
                //path: new RegExp("C_DefectTaskRecord.*.*373.*/"),
                path: new RegExp('(.*)373(.*)/to_DefectTaskRecord(.*)'),
                response: function (oXhr, x) {
                    var oResults = fnGetJSONFromFile('C_DefectRecord_373_to_DefectTaskRecord_Initial.json');
                    var oData = oMockServer.getEntitySetData('C_DefectTaskRecord');
                    if (oData.length > 0) {
                        if (
                            (oData[0].d.results[0] && oData[0].d.results[0].DefectInternalID === '$00000000373') ||
                            (oData[1].d.results[0] && oData[0].d.results[0].DefectInternalID === '$00000000373')
                        ) {
                            oResults = fnGetJSONFromFile('New_C_DefectTaskRecord_42_For_Defect_373.json');
                        }
                    }

                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            aRequests.push({
                method: 'POST',
                path: new RegExp('(.*)A50C3043801Create_active_i_qualitytasktp(.*)'),
                response: function (oXhr, CreateParameter1, createParameter2) {
                    //for a unknown reasons all parameters of the function import are in createParameter2 and still concatenated
                    var vDefectInternalID = createParameter2.substring(19, 33);
                    var vQualityTaskOrigin = createParameter2.substring(54, 56);
                    var vQualityTaskText = 'Task Created by OPA';

                    /*var oNewTask = {	QualityTaskInternalId : '$00000000042',
										QualityTaskText : vQualityTaskText,
										vQualityTaskOrigin : vQualityTaskOrigin,
										DefectInternalID : vDefectInternalID };
					oNewTask = { d : oNewTask };*/
                    var oResults = fnGetJSONFromFile('New_C_DefectTaskRecord_42_For_Defect_373.json');

                    var oData = oMockServer.getEntitySetData('C_DefectTaskRecord');
                    oData.push(oResults);
                    oMockServer.setEntitySetData('C_DefectTaskRecord', oData);

                    //var oData2 = oMockServer.getEntitySetData("C_DefectRecord");
                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    jQuery.sap.log.debug('C_DefectRecord 373');
                    return oResults;
                }
            });

            aRequests.push({
                method: 'GET',
                path: new RegExp('(.*)374(.*)to_DefectQltyTskProcsrNotes(.*)'),
                response: function (oXhr, x) {
                    var oResults;
                    var oData = oMockServer.getEntitySetData('C_DefectTaskRecord');
                    if (oData.length > 0) {
                        oResults = oData[0];
                    } else {
                        oResults = fnGetJSONFromFile('C_DefectTaskRecord_45_For_Defect_374.json');
                        oData.push(oResults);
                        oMockServer.setEntitySetData('C_DefectTaskRecord', oData);
                    }

                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            aRequests.push({
                method: 'GET',
                path: new RegExp('(.*)374(.*)_DefectTaskRecord(.*)'),
                response: function (oXhr, x) {
                    var oResults;
                    var oData = oMockServer.getEntitySetData('C_DefectTaskRecord');
                    if (oData.length > 0) {
                        oResults = oData[0];
                    } else {
                        oResults = fnGetJSONFromFile('C_DefectTaskRecord_45_For_Defect_374.json');
                        oData.push(oResults);
                        oMockServer.setEntitySetData('C_DefectTaskRecord', oData);
                    }

                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            aRequests.push({
                method: 'GET',
                path: new RegExp('(.*)372(.*)_DefectTaskRecord(.*)'),
                response: function (oXhr, x) {
                    var oResults;
                    oResults = fnGetJSONFromFile('C_DefectTaskRecord_455_For_Defect_372.json');

                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            aRequests.push({
                method: 'POST',
                path: new RegExp('(.*)A50C3043801EBEdit_active_i_qualitytasktp(.*)'),
                response: function (oXhr, CreateParameter1, createParameter2) {
                    //for a unknown reasons all parameters of the function import are in createParameter2 and still concatenated
                    var aMatchQualityTaskProcessor = createParameter2.match(/QualityTaskProcessor='.'/);
                    var QualityTaskProcessor = aMatchQualityTaskProcessor[0].substring(22, 23);

                    var oResults;
                    var vRespondCode;

                    if (QualityTaskProcessor === '2') {
                        oResults = fnGetJSONFromFile('/error_results/Error_Task_Edit_With_BP_eq_2.json');
                        vRespondCode = 400;
                    } else if (QualityTaskProcessor === '3') {
                        oResults = fnGetJSONFromFile('/error_results/Error_Task_Edit_With_BP_eq_3.json');
                        vRespondCode = 400;
                    } else if (QualityTaskProcessor === '4') {
                        var oData = oMockServer.getEntitySetData('C_DefectTaskRecord');
                        oData[0].d.results[0].QualityTaskProcessor = '0000000004';
                        oResults = oData[0];
                        oMockServer.setEntitySetData('C_DefectTaskRecord', oData);
                        vRespondCode = 200;
                    }

                    oXhr.respond(
                        vRespondCode,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            aRequests.push({
                method: 'GET',
                path: new RegExp('C_DefectRecordCodeVH.*'),
                response: function (oXhr) {
                    var oResults = fnGetJSONFromFile('C_DefectRecordCodeVH.json');
                    oXhr.respond(
                        0,
                        {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        JSON.stringify(oResults)
                    );
                    return oResults;
                }
            });

            oMockServer.setRequests(aRequests);

            oMockServer.start();

            jQuery.sap.log.info('Running the app with mock data');

            if (aAnnotations) {
                aAnnotations.forEach(function (sAnnotationName) {
                    var oAnnotation = oDataSource[sAnnotationName],
                        sUri = oAnnotation.uri,
                        sLocalUri = jQuery.sap.getModulePath(
                            _sAppModulePath + oAnnotation.settings.localUri.replace('.xml', ''),
                            '.xml'
                        );

                    ///annotiaons
                    new MockServer({
                        rootUri: sUri,
                        requests: [
                            {
                                method: 'GET',
                                path: new RegExp('([?#].*)?'),
                                response: function (oXhr) {
                                    jQuery.sap.require('jquery.sap.xml');

                                    var oAnnotations = jQuery.sap.sjax({
                                        url: sLocalUri,
                                        dataType: 'xml'
                                    }).data;

                                    oXhr.respondXML(200, {}, jQuery.sap.serializeXML(oAnnotations));
                                    return true;
                                }
                            }
                        ]
                    }).start();
                });
            }
        },

        /**
         * @public
         * @returns {sap.ui.core.util.MockServer}
         */
        getMockServer: function () {
            return oMockServer;
        }
    };
});
