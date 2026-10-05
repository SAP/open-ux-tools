sap.ui.define([
	"fin/co/costcenter/manage/formatter/CCMFormatter",
	"sap/ui/core/Element",
	"sap/ui/model/type/Date",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/format/NumberFormat",
	"fin/co/costcenter/manage/utils/Mapping"
	], function(CCMFormatter){
		QUnit.module("CCMFormatter",{
			beforeEach:function(){
				var sRootPath = jQuery.sap.getModulePath("fin.co.costcenter.manage");
				if(sRootPath.indexOf('/',sRootPath.length-1) === -1){ // ends with '/'
					sRootPath = sRootPath + '/';
				}
				this.aSinons = [];
				//jQuery.sap.require("fin.gl.profitcenter.manage.formatter.PCMFormatter");
				//this.oController = new fin.gl.profitcenter.manage.formatter.PCMFormatter();
				this.oFormatter = sap.ui.core.format.DateFormat;
				this.oApplication = sap.ca.scfld.md.app.Application;
				this.oApplication.getImpl = function(){};
				this.aSinons.push(sinon.stub(this.oApplication,"getImpl").returns({
					$:function(){
						return {
			            closest : function(sClassStyle) {
			                return [ 1, 2, 3 ];
			            }
			        };
					},
					getResourceBundle:function(){
					}
				}));
				this.oFormatter.getDateInstance = function(){};
				this.aSinons.push(sinon.stub(this.oFormatter, "getDateInstance").returns({
			    $ : function() {
			        return {
			            closest : function(sClassStyle) {
			                return [ 1, 2, 3 ];
			            }
			        };
			    },
			    format:function(oDate,bool){
			    	return "2011/01/01";
			    }
			}));	
			},
			afterEach: function() {
   				jQuery.each(this.aSinons, function(index, value) {
   	            	value.restore();
   	        	});
   			}
		});
		QUnit.test("Formatter on init method Test",function(){
			var fn = CCMFormatter.prototype.init;
			var result = fn();
			//ok(this.oController.init,"whatever");
			//this.oController.init();
			equal(result,undefined,"init Success");
		});
		/*QUnit.test("Formatter on statusMapping method Test",function(){
			var fn = CCMFormatter.prototype.statusMapping;
			var result = fn(null);
			//this.oController.statusMapping();
			equal(result,"","statusMapping Success");
			result = fn("D");
			equal(result,"Deleted","statusMapping Success");
		});*/
		// QUnit.test("Formatter on statusColorMapping method Test",function(){
		// 	var fn = PCMFormatter.prototype.statusColorMapping;
		// 	var result = fn();
		// 	equal(result,"None","statusColorMpping Success");
		// 	result = fn("A");
		// 	equal(result,"Success","statusColorMpping Success");
		// });
		QUnit.test("Formatter on formatDate",function(){
			//var fn = PCMFormatter.prototype.formatDate;
			ok(fn = CCMFormatter.prototype.formatDate,"initial");
			var result = fn();
			equal(result,"","formatDate Success");
			result = fn(20110101);
			equal(result,"2011/01/01","formatDate Success");
		});	
		QUnit.test("Formatter on nameWithDescrip",function(){
			//var fn = PCMFormatter.prototype.formatDate;
			ok(fn = CCMFormatter.prototype.nameWithDescrip,"initial");
			var result = fn();
			equal(result,undefined,"nameWithDescrip Success");
			result = fn("hello","ok");
			equal(result,"ok (hello)","nameWithDescrip Success");
			
			
		});
	});