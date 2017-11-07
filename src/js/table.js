(function($){
  //先设置一个false矩阵，然后通过更改矩阵状态来为每一列标上索引
  function setFieldIndex(columns){
    var i, j, k,
        totalCol = 0,
        flag = [];
    for(i = 0; i < columns[0].length; i++){
      totalCol += columns[0][i].colspan || 1;
    }
    for (i = 0; i < columns.length; i++) {
      flag[i] = []
      for (var j = 0; j < totalCol; j++) {
        flag[i][j] = false;
      }
    }

    for (var i = 0; i < columns.length; i++) {
      for (var j = 0; j < columns[i].length; j++) {
        var col = columns[i][j];
        var rowspan = col.rowspan || 1;
        var colspan = col.colspan || 1;
        var index = $.inArray(false,flag[i]);
        //只有不跨列的列才能标注上索引值
        if(colspan === 1){
          col.fieldIndex = index;
        }
        //把跨行跨列的col对应的格子全部标注为true
        for (var k = 0; k < rowspan; k++) {
          flag[i + k][index] = true
        }

        for (var k = 0; k < colspan; k++) {
          flag[i][index + k] = true
        }
      }
    }
  }
  function Datatable(elem,options){
    this.$elem = elem;
    this.options = options;
    this.jqueryMap = {
      $container: undefined, //初始化完成后的整个html结构
      $header: undefined
    }
    this.dataMap = {
      data: [],
      header: {
        stateField: undefined,
        fields: [],
        columns: [],
        columnFieldToIndex: {}
      },
      selectedRows: []
    };
    this._init();
  }
  Datatable.DEFAULTS = {
    classes: '',
    columns: [[]],
    data: [],
    selectAll: true,
    selectAllName: 'btSelectAll',
    selectSingleName: 'btSelectSingle',
    dataGetType: 'server', //client || server
    url: undefined,
    method: 'get',
    contentType: 'application/json',
    cache: true,
    dataType: 'json', //ajax返回数据的格式
    pagination: true,
    formatLoadingMessage: function(){
      return "数据加载中..."
    },
    thFormatter: function(value){
      return value
    },
    tdFormatter: function(value){
      return value
    }
  }
  Datatable.COLUMN_DEFAULTS ={
    checkbox: false,
    radio: false,
    align: 'center',
    valign: 'middle',
    titleTooltip: ''
  }

  Datatable.prototype = {
    constructor: Datatable,
    _init: function(){
      this.initContainer();
      this.initHeader();
      this.initData();
      this.initBody();
    },
    initContainer: function(){
      this.jqueryMap.$container = $([
        '<div class="cui-table">',
        '<div class="cui-table-toolbar"></div>',
        '<div class="cui-table-container">',
        '<div class="cui-table-header"><table></table></div>',
        '<div class="cui-table-body">',
        '<div class="cui-table-loading">',
        '<div class="loadingCnt">',
        '<image src="images/loading.png" class="icon-loading">',
        this.options.formatLoadingMessage(),
        '</div>',
        '</div>',
        '</div>',
        '<div class="cui-table-pagination"></div>',
        '</div>',
        '</div>'
      ].join(""))

      this.jqueryMap.$container.insertAfter(this.$elem);
      this.jqueryMap.$tableContainer = this.jqueryMap.$container.find('.cui-table-container');
      this.jqueryMap.$tableHeader = this.jqueryMap.$container.find('.cui-table-header');
      this.jqueryMap.$tableBody = this.jqueryMap.$container.find('.cui-table-body');
      this.jqueryMap.$tableLoading = this.jqueryMap.$container.find('.cui-table-loading');
      this.jqueryMap.$toolbar = this.jqueryMap.$container.find('.cui-table-toolbar');
      this.jqueryMap.$pagination = this.jqueryMap.$container.find('.cui-table-pagination');
      //this.$el会被从原来位置移除然后添加到this.$tableBody里面
      this.jqueryMap.$tableBody.append(this.$elem);
      this.jqueryMap.$container.after('<div class="clearfix"></div>');

      this.$elem.addClass('table table-hover' + this.options.classes);
      if ($.inArray('table-no-bordered', this.options.classes.split(' ')) !== -1) {
        this.$tableContainer.addClass('table-no-bordered');
      }
    },
    initHeader: function(){
      var that = this;
      var fieldIndex = -1;
      this.jqueryMap.$header = this.$elem.find('thead')
      if(!this.jqueryMap.$header.length){
        this.$elem.append('<thead></thead>')
        this.jqueryMap.$header = this.$elem.find('thead')
      }
      var html = []
      //使用二维数组是为了给复杂表头做准备
      if(!$.isArray(this.options.columns[0])){
        this.options.columns = [this.options.columns]
      }
      setFieldIndex(this.options.columns)
      $.each(this.options.columns,function(i,columns){
        html.push('<tr>');
        $.each(columns,function (j,column) {
          //凡是列数多于1的就不存
          if(!column.colspan || column.colspan < 2){
            that.dataMap.header.fields[column.fieldIndex] = column.field;
            that.dataMap.header.columns[column.fieldIndex] = column;
            that.dataMap.header.columnFieldToIndex[column.field] = column.fieldIndex;
          }
          var text = '',
              style = '',
              classStr = sprintf(' class="%s"',column['class']),
              unitWidth = 'px',
              width = column.width;
          column = $.extend({},Datatable.COLUMN_DEFAULTS,column)
          if(column.width !== undefined){
            if(typeof column.width === 'string' && column.width.indexOf('%') > -1){
              unitWidth = '%';
            }
          }
          if (column.width && typeof column.width === 'string') {
            width = column.width.replace('%', '').replace('px', '');
          }
          style += sprintf('text-align: %s; vertical-align: %s; width: %s; ', column.align, column.valign,(column.checkbox || column.radio) && !width ? '36px' : (width ? width + unitWidth : undefined));

          html.push(
            '<th ' + sprintf('title="%s"',column.titleTooltip),
            column.checkbox || column.radio ? sprintf(' class="bs-checkbox %s"',column['class']) : classStr,
            sprintf(' style="%s"', style),
            column.checkbox || column.radio ? sprintf(' rowspan="%s"', that.options.columns.length) : sprintf(' rowspan="%s"', column.rowspan || 1),
            sprintf(' colspan="%s"', column.colspan || 1),
            sprintf(' data-field="%s"', column.field),
            '>'
          );

          html.push('<div class="th-inner">');
          text = that.options.thFormatter(column.title);
          if(column.checkbox){
            if(that.options.selectAll){
              text = '<input name="btSelectAll" type="checkbox" />';
            }
            that.dataMap.header.stateField = column.field
          }
          if (column.radio) {
            text = '';
            that.header.stateField = column.field;
          }

          html.push(text);
          html.push('</div>');
          html.push('<div class="fht-cell"></div>');
          html.push('</div>');
          html.push('</th>');
        })
        html.push('</tr>');
      })
      this.jqueryMap.$header.html(html.join(''));
    },
    initData: function(data, type){
      if (type === 'append') {
        this.dataMap.data = this.dataMap.data.concat(data);
      } else if (type === 'prepend') {
        this.dataMap.data = [].concat(data).concat(this.dataMap.data);
      } else {
        this.dataMap.data = data || this.options.data;
      }
    },
    initBody: function(){
      var html = [];
      var that = this;
      this.jqueryMap.$body = this.$elem.find('tbody');
      if(!this.jqueryMap.$body.length){
        this.$elem.append('<tbody></tbody>');
        this.jqueryMap.$body = this.$elem.find('tbody');
      }
      $.each(this.dataMap.data,function (i,data) {
        html = html.concat(that.initRow(data));
      })
      this.jqueryMap.$body.html(html.join(''))
    },
    initRow: function(data){
      var that = this;
      var html = [];
      html.push('<tr>')
      for(var i = 0; i < that.dataMap.header.fields.length; i++){
        var isInputElem = that.dataMap.header.fields[i] == 'checkbox' || that.dataMap.header.fields[i] == 'radio'
        html.push(
          '<td',
          ' style="',
          sprintf('text-align:%s; ', isInputElem ? 'center' : that.dataMap.header.columns[that.dataMap.header.columnFieldToIndex[that.dataMap.header.fields[i]]].align),
          sprintf('vertical-align: %s;',isInputElem ? 'middle' : that.dataMap.header.columns[that.dataMap.header.columnFieldToIndex[that.dataMap.header.fields[i]]].valign),
          '">',
          isInputElem ? sprintf('<input type="%s" name="%">',that.dataMap.header.fields[i],that.options.selectSingleName) : that.options.tdFormatter(data[that.dataMap.header.fields[i]]),
          '</td>'
        )
      }
      html.push('</tr>');
      return html
    },
    load: function(data){
      this.dataMap.data = data;
      this.initBody();
    },
    append: function(data){
      if($.isArray(data) && data.length > 0){
        this.initData(data,'append');
        this.initBody();
      }
    },
    prepend: function(data){
      if($.isArray(data) && data.length > 0){
        this.initData(data,'prepend');
        this.initBody();
      }
    },
    remove: function(){

    },
    removeAll: function(){
      this.dataMap.data = [];
      this.initBody();
    },
    loading: function(){
      this.jqueryMap.$tableLoading.show();
    },
    loaded: function(){
      this.jqueryMap.$tableLoading.hide();
    }
  }

  $.fn.Datatable = function(options){
    var $elem = this;
    var dataTable = new Datatable($elem,$.extend(Datatable.DEFAULTS,options));
    return dataTable;
  }
}(jQuery))

