/**
 * Created by feng.shen on 2017/10/25.
 */

function Datatable(elem,options){
  this.$elem = elem;
  this.options = options;
  this.dataMap = {

  };
  this._init();
}
Datatable.DEFAULTS = {

}
Datatable.COLUMN_DEFAULTS ={

}

Datatable.prototype = {
  constructor: Datatable,
  _init: function(){

  }
}

$.fn.Datatable = function(options){
  var $elem = this;
  var dataTable = new Datatable($elem,$.extend(Datatable.DEFAULTS,options));
  return dataTable;
}
