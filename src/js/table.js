/**
 * Created by feng.shen on 2017/10/25.
 */

// 为每条标题栏数据设置filedIndex:所在列/列坐标;
/**
 * 表头分割成columns.length（总行数）* totalCol（总列数）的矩阵，以flag矩阵标记为false;
 * columns.length（总行数）：columns是个二维数组，每一个元素就是一行
 * 各标题栏为columns[i][j].rowspan（行数）* columns[i][j].colspan（列数）的小矩阵;
 * 从左自右、从上而下遍历标题栏小矩阵，将标题栏对应的flag首行、首列标记为true;
 * 因标题栏只能跨列或跨行，不能既跨行又跨列，函数的实现依赖用户输入正确的options.columns格式，
 */
var setFieldIndex = function (columns) { //注意这是一个引用传递
  var i, j, k,
    totalCol = 0,
    flag = [];

  //获取表格的总列数
  for (i = 0; i < columns[0].length; i++) {
    totalCol += columns[0][i].colspan || 1;
  }

  //设置一个false矩阵,分别对应表格的每一个单元格
  for (i = 0; i < columns.length; i++) {
    flag[i] = [];
    for (j = 0; j < totalCol; j++) {
      flag[i][j] = false;
    }
  }

  for (i = 0; i < columns.length; i++) {
    for (j = 0; j < columns[i].length; j++) {
      var r = columns[i][j],
        rowspan = r.rowspan || 1,
        colspan = r.colspan || 1,
        index = $.inArray(false, flag[i]);

      if (colspan === 1) {
        //只有没有经过横向合并的单元格才会有fieldIndex
        r.fieldIndex = index;
        //如果列配置项的field，就用fieldIndex代替
        if (typeof r.field === 'undefined') {
          r.field = index;
        }
      }
      //有些时候存在合并单元格，将合并单元格所在的flag全部设置为true
      for (k = 0; k < rowspan; k++) {
        flag[i + k][index] = true;
      }
      for (k = 0; k < colspan; k++) {
        flag[i][index + k] = true;
      }
    }
  }
};


//将paramName的data属性转换成param-name修改完成后输出
var getRealDataAttr = function (dataAttr) {
  for (var attr in dataAttr) {
    var auxAttr = attr.split(/(?=[A-Z])/).join('-').toLowerCase();
    if (auxAttr !== attr) {
      dataAttr[auxAttr] = dataAttr[attr];
      delete dataAttr[attr];
    }
  }

  return dataAttr;
};

// 转义;
var escapeHTML = function (text) {
  if (typeof text === 'string') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g, '&#x60;');
  }
  return text;
};

/*/!*
 当field为函数时，获取item[field]并进行转义(escape为真的情况下);
 当field为字符串时，以最末一个点号后的字符获取item中的属性并进行转义(escape为真的情况下);
 问题：实际应用场景field多是字符串，且没有点号，可以限制用户配置使调用函数变得方便;
 *!/
var getItemField = function (item, field, escape) {
  var value = item;

  if (typeof field !== 'string' || item.hasOwnProperty(field)) {
    return escape ? escapeHTML(item[field]) : item[field];
  }
  var props = field.split('.');
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      value = value && value[props[p]];
    }
  }
  return escape ? escapeHTML(value) : value;
};*/
var getItemField = function(item,field,escape){
  return escape ? escapeHTML(item[field]) : item[field];
}


/*
 *     当name为字符串时，获取window对象的方法并执行，参数为args，没有该方法时调用sprintf替换name文本;
 *     当name为函数时，传入args执行该函数;
 *     以上情况都不是返回defaultValue;
 *     问题：原型中的方法可以直接调用，window对象的方法使用户配置变得繁琐，sprintfy也可以预先作判断后调用;
 */
var calculateObjectValue = function (self, name, args, defaultValue) {
  var func = name;

  if (typeof name === 'string') {
    // support obj.func1.func2
    var names = name.split('.'); //切分字符串变成数组

    if (names.length > 1) {
      func = window;
      $.each(names, function (i, f) {
        func = func[f];
      });
    } else {
      func = window[name];
    }
  }
  if (typeof func === 'object') {
    return func;
  }
  if (typeof func === 'function') {
    return func.apply(self, args || []);
  }
  if (!func && typeof name === 'string' && sprintf.apply(this, [name].concat(args))) {
    return sprintf.apply(this, [name].concat(args));
  }
  return defaultValue;
};


function Datatable(elem,options){
  this.$elem = elem;
  this.options = options;
  this.jqueryMap = {
    $container: undefined, //整个html结构的容器，包含toolbar,table,pagination
    $toolbar: undefined, //表格上面的工具条
    $tableContainer: undefined, //表格容器
    $tableHeader: undefined, //表格容器里面的表头
    $tableBody: undefined, //包含我们html里面写入的表格的直接父元素
    $pagination: undefined, //翻页条

    $header:undefined,  //html中加入的table元素的thead元素
    $body:undefined,  //html中加入的table元素的tbody元素
  };
  this.dataMap = {
    columns: [], //保存每一列配置项的数组，每一列配置项都对应着一个序号（数组中的索引）
    fieldsColumnsIndex: [], //每一个field值对应着一个序号，根据这个序号可以在上面的columns中找到对应的配置对象
    headerConfig: {
      fields: [],
      styles: [],
      classes: [],
      formatters: [],
      events: [],
      sorters: [],
      sortNames: [],
      cellStyles: [],
      searchables: []
    },  //保存表格的相关配置
  };
  this._init();
}
Datatable.DEFAULTS = {
  classes: 'table table-hover', //触发样式table加入的样式
  sortClass: undefined,
  locale: undefined, //设置语言包
  height: undefined, //包括分页和工具栏的高度
  undefinedText: '-', //无显示文本时默认显示内容
  sortName: undefined,
  // 初始化排序字段名，须是column.filed主键名;
  // 点击排序后更新options.sortName为被排序列的主键名columns[i].field;
  // 通过主键名在this.header.fields中的序号获取sortName，比较后排序;
  sortOrder: 'asc',
  sortStable: false,
  rememberOrder: false,
  striped: false, //触发元素table是否隔行变色
  columns: [[]], //默认是个二维数组
  data: [],
  totalField: 'total',
  dataField: 'rows', //后台传回data数据的字段名
  method: 'get', //ajax发送类型
  url: undefined, //ajax发送地址
  ajax: undefined,
  cache: true, //ajax设置
  contentType: 'application/json', //设置ajax请求头content-type属性的值
  dataType: 'json', //ajax返回数据的格式
  ajaxOptions: {},
  queryParams: function (params) {
    return params;
  },
  queryParamsType: 'limit', // undefined
  responseHandler: function (res) {
    return res;
  }, //ajax处理相应的函数
  pagination: false, //分页是否显示
  onlyInfoPagination: false, //分页文案提示只显示有多少条数据
  paginationLoop: true,
  sidePagination: 'client', // client or server 前台分页或者后台分页
  totalRows: 0, // server side need to set
  pageNumber: 1, //初始化显示第几页
  pageSize: 10, //初始化每页显示多少条数据
  pageList: [10, 25, 50, 100], //每页显示数据量切换配置项
  paginationHAlign: 'right', //right, left 分页浮动设置
  paginationVAlign: 'bottom', //bottom, top, both
  // 分页显示位置，上、下或上下均显示，默认底部显示
  // 设置一页显示多少条数据按钮向上下拉，还是向下下拉，默认向上下拉
  // 设置为both时，分页在上下位置均显示，设置一页显示多少条数据按钮向上下拉
  paginationDetailHAlign: 'left', //right, left //每页几行数据显示区浮动情况
  paginationPreText: '&lsaquo;', //分页上一页按钮
  paginationNextText: '&rsaquo;', //分页下一页按钮
  search: false, //是否支持搜索
  searchOnEnterKey: false, //enter键开启搜索
  strictSearch: false, //严格搜索还是模糊搜索
  searchAlign: 'right', //搜索框水平对齐方式
  selectItemName: 'btSelectItem', //复选框默认上传name值
  showHeader: true, //显示表头，包含标题栏内容
  showFooter: false, //默认隐藏表尾
  showColumns: false, //显示筛选条目按钮
  showPaginationSwitch: false, //显示分页隐藏展示按钮
  showRefresh: false, //显示刷新按钮
  showToggle: false, //显示切换表格显示或卡片式详情显示按钮
  buttonsAlign: 'right', //显示隐藏分页、刷新、切换表格或卡片显示模式、筛选显示条目、下载按钮浮动设置
  smartDisplay: true, //smartDisplay为真，当总页数为1时，屏蔽分页，以及下拉列表仅有一条时，屏蔽切换条目数按钮下拉功能
  escape: false, //是否转义
  minimumCountColumns: 1, //最小显示条目数
  idField: undefined, //data中存储复选框value的键值
  uniqueId: undefined, //从data中获取每行数据唯一标识的属性名
  cardView: false, //是否显示卡片式详情（移动端），直接罗列每行信息，不以表格形式显现
  detailView: false, //表格显示数据时，每行数据前是否有点击按钮，显示这行数据的卡片式详情
  detailFormatter: function (index, row) {
    return '';
  }, //折叠式卡片详情渲染文本，包含html标签、Dom元素
  detailFilter: function (index, row) {
    return true;
  },
  trimOnSearch: true, //搜索框键入值执行搜索时，清除两端空格填入该搜索框
  clickToSelect: false,
  singleSelect: false, //复选框只能单选，需设置column.radio属性为真
  toolbar: undefined, //用户自定义按钮组，区别于搜索框、分页切换按钮等
  toolbarAlign: 'left', //用户自定义按钮组浮动情况
  checkboxHeader: true, //是否隐藏全选按钮
  sortable: true, //可排序全局设置
  silentSort: true, //ajax交互的时候是否显示loadding加载信息
  maintainSelected: false, //为真且翻页时，保持前一页各条row[that.header.stateField]为翻页前的值
  searchTimeOut: 500, //搜索框键入值敲enter后隔多少时间执行搜索，使用clearTimeout避免间隔时间内多次键入反复搜索
  searchText: '', //初始化搜索内容
  iconSize: undefined, //按钮、搜索输入框通用大小，使用bootstrap的sm、md、lg等
  buttonsClass: 'default',
  iconsPrefix: 'glyphicon', // glyphicon of fa (font awesome)
  icons: {
    paginationSwitchDown: 'glyphicon-collapse-down icon-chevron-down',
    paginationSwitchUp: 'glyphicon-collapse-up icon-chevron-up',
    refresh: 'glyphicon-refresh icon-refresh',
    toggle: 'glyphicon-list-alt icon-list-alt',
    columns: 'glyphicon-th icon-th',
    detailOpen: 'glyphicon-plus icon-plus',
    detailClose: 'glyphicon-minus icon-minus'
  },

  customSearch: $.noop,

  customSort: $.noop,

  rowStyle: function (row, index) {
    return {};
  },

  rowAttributes: function (row, index) {
    return {};
  },

  footerStyle: function (row, index) {
    return {};
  },

  onAll: function (name, args) {
    return false;
  },
  onClickCell: function (field, value, row, $element) {
    return false;
  },
  onDblClickCell: function (field, value, row, $element) {
    return false;
  },
  onClickRow: function (item, $element) {
    return false;
  },
  onDblClickRow: function (item, $element) {
    return false;
  },
  onSort: function (name, order) {
    return false;
  },
  onCheck: function (row) {
    return false;
  },
  onUncheck: function (row) {
    return false;
  },
  onCheckAll: function (rows) {
    return false;
  },
  onUncheckAll: function (rows) {
    return false;
  },
  onCheckSome: function (rows) {
    return false;
  },
  onUncheckSome: function (rows) {
    return false;
  },
  onLoadSuccess: function (data) {
    return false;
  },
  onLoadError: function (status) {
    return false;
  },
  onColumnSwitch: function (field, checked) {
    return false;
  },
  onPageChange: function (number, size) {
    return false;
  },
  onSearch: function (text) {
    return false;
  },
  onToggle: function (cardView) {
    return false;
  },
  onPreBody: function (data) {
    return false;
  },
  onPostBody: function () {
    return false;
  },
  onPostHeader: function () {
    return false;
  },
  onExpandRow: function (index, row, $detail) {
    return false;
  },
  onCollapseRow: function (index, row) {
    return false;
  },
  onRefreshOptions: function (options) {
    return false;
  },
  onRefresh: function (params) {
    return false;
  },
  onResetView: function () {
    return false;
  },


  formatLoadingMessage: function () {
    return 'Loading, please wait...';
  },
  formatRecordsPerPage: function (pageNumber) {
    return sprintf('%s records per page', pageNumber);
  },// 每页显示条目数提示文案
  formatShowingRows: function (pageFrom, pageTo, totalRows) {
    return sprintf('Showing %s to %s of %s rows', pageFrom, pageTo, totalRows);
  },// 分页提示当前页从第pageFrom到pageTo，总totalRows条
  formatDetailPagination: function (totalRows) {
    return sprintf('Showing %s rows', totalRows);// 分页提示供多少条数据
  },
  formatSearch: function () {
    return 'Search';
  },// 设置搜索框placeholder属性
  formatNoMatches: function () {
    return 'No matching records found';
  },// 没有数据时提示文案
  formatPaginationSwitch: function () {
    return 'Hide/Show pagination';
  },// 显示隐藏分页按钮title属性提示文案
  formatRefresh: function () {
    return 'Refresh';
  },// 刷新按钮title属性提示文案
  formatToggle: function () {
    return 'Toggle';
  },// 切换表格、卡片显示模式按钮title属性提示文案
  formatColumns: function () {
    return 'Columns';
  },// 筛选显示条目按钮title属性提示文案
  formatAllRows: function () {
    return 'All';
  },

  formatterCellCnt: function(){

  }
}

Datatable.COLUMN_DEFAULTS ={
  radio: false, //有否radio，有则options.singleSelect设为真
  checkbox: false, //有否checkbox，options.singleSelect设为真，checkbox单选
  checkboxEnabled: true, //复选框是否可选
  field: undefined, //后台数据的id号
  title: undefined, //内容文案
  titleTooltip: undefined, //title属性文案
  'class': undefined, //样式
  align: undefined, // left, right, center -- tbody、thead、tfoot文本对齐情况
  halign: undefined, // left, right, center -- thead文本对齐情况
  falign: undefined, // left, right, center -- tfoot文本对齐情况
  valign: undefined, // top, middle, bottom -- 垂直对齐情况
  width: undefined, //宽度，字符串或数值输入，均转化为"36px"或"10%"形式
  sortable: false, //是否可排序，options.sortable设置为真的时候可用
  order: 'asc', // asc, desc
  visible: true, //可见性
  switchable: true, //该条目可以通过筛选条目按钮切换显示状态
  clickToSelect: true,
  formatter: undefined, //以function(field,row,index){}格式化数据，field后台字段，row行数据，index对应row的序号值  无配置时以title显示，有配置时以返回值显示
  footerFormatter: undefined, //填充表尾内容
  events: undefined, //数据格式为[{"click element":functionName}],回调中传入（value,row,index）
  sorter: undefined, //调用sorter函数或window[sorter]函数进行排序，高优先级
  sortName: undefined, //进行排序的字段名，用以获取options.data中的数据
  cellStyle: undefined,
  // 调用cellStyle函数或window[cellStyle]函数添加样式以及类;
  // 以function(field,row,index){}设置单元格样式以及样式类，返回数据格式为{classes:"class1 class2",css:{key:value}}
  searchable: true, //设置哪一列的数据元素可搜索
  searchFormatter: true,
  cardVisible: true, //设为否时，卡片式显示时该列数据不显
  escape : false
}

Datatable.prototype = {
  constructor: Datatable,
  _init: function(){
    //动态构建整个html结构
    this.initContainer();
    this.initTable();
    this.initHead();
  },
  initContainer: function(){
    var container = [
      '<div class="cui-table">',
        '<div class="cui-table-toolbar"></div>',
          '<div class="cui-table-container">',
          '<div class="cui-table-header"></div>',
          '<div class="cui-table-body"></div>',
          '<div class="cui-table-pagination"></div>',
        '</div>',
      '</div>'
    ].join('');
    $(container).insertAfter(this.$elem);

    this.jqueryMap.$container = $(".cui-table");
    this.jqueryMap.$toolbar = $(".cui-table-toolbar");
    this.jqueryMap.$tableContainer = $(".cui-table-container");
    this.jqueryMap.$tableHeader = $(".cui-table-header");
    this.jqueryMap.$tableBody = $(".cui-table-body");
    this.jqueryMap.$pagination = $(".cui-table-pagination");
    this.jqueryMap.$tableBody.append(this.$elem);
  },
  initTable: function(){
    var that = this,
        columns =[], //用来保存html结构中提取出来的配置项
        data = []


    //添加thead元素
    that.jqueryMap.$header = this.$elem.find('>thead');
    if (!that.jqueryMap.$header.length) {
      that.jqueryMap.$header = $('<thead></thead>').appendTo(this.$elem);
    }
    //在html结构里面写了表格结构的情况
    that.jqueryMap.$header.find('tr').each(function () {
      var column = [];

      $(this).find('th').each(function () {
        // Fix #2014 - getFieldIndex and elsewhere assume this is string, causes issues if not
        if (typeof $(this).data('field') !== 'undefined') {
          $(this).data('field', $(this).data('field') + '');
        }
        column.push($.extend({}, {
          title: $(this).html(),
          'class': $(this).attr('class'),
          titleTooltip: $(this).attr('title'),
          rowspan: $(this).attr('rowspan') ? +$(this).attr('rowspan') : undefined,
          colspan: $(this).attr('colspan') ? +$(this).attr('colspan') : undefined
        }, $(this).data())); //data方法不传入参数，该方法将以对象的形式从元素中返回所有存储的数据
      });
      columns.push(column);
    });
    // that.options.columns默认是个二维数组，是为了应对复杂表头的情况
    if (!$.isArray(that.options.columns[0])) {
      that.options.columns = [that.options.columns];
    }
    //将html配置项和js配置项进行合并，且js配置项优先级高于html配置项
    this.options.columns = $.extend(true, [], columns, this.options.columns);

    setFieldIndex(this.options.columns);
    //设置每一列的配置项
    $.each(that.options.columns,function (i,columns) {
      $.each(columns,function (j,column) {
        column = $.extend({},Datatable.COLUMN_DEFAULTS,column);
        if (typeof column.fieldIndex !== 'undefined') {
          that.dataMap.columns[column.fieldIndex] = column;
          that.dataMap.fieldsColumnsIndex[column.field] = column.fieldIndex;
        }
        //更新表格整体配置项
        that.options.columns[i][j] = column;
      })
    })

    // if options.data is setting, do not process tbody data
    if (this.options.data.length) {
      return;
    }

    //html结构里面包含数据的时候
    var m = [];
    this.$elem.find('>tbody>tr').each(function (y) {
      var row = {};
      // save tr's id, class and data-* attributes
      //将id，class和data-这些值另存一份到一个对象
      row._id = $(this).attr('id');
      row._class = $(this).attr('class');
      //将paramName的data属性转换成param-name修改完成后输出
      //{userName:'sf'} => {user-name:'sf'}
      row._data = getRealDataAttr($(this).data());

      $(this).find('>td').each(function (x) {
        var $this = $(this),
          cspan = +$this.attr('colspan') || 1,
          rspan = +$this.attr('rowspan') || 1,
          tx, ty;

        for (; m[y] && m[y][x]; x++); //skip already occupied cells in current row

        for (tx = x; tx < x + cspan; tx++) { //mark matrix elements occupied by current cell with true
          for (ty = y; ty < y + rspan; ty++) {
            if (!m[ty]) { //fill missing rows
              m[ty] = [];
            }
            m[ty][tx] = true;
          }
        }

        var field = that.dataMap.columns[x].field;

        row[field] = $(this).html();
        row['_' + field + '_id'] = $(this).attr('id');
        row['_' + field + '_class'] = $(this).attr('class');
        row['_' + field + '_rowspan'] = $(this).attr('rowspan');
        row['_' + field + '_colspan'] = $(this).attr('colspan');
        row['_' + field + '_title'] = $(this).attr('title');
        row['_' + field + '_data'] = getRealDataAttr($(this).data());
      });
      data.push(row);
    });
    this.options.data = data;
    //fromHtml用来指示data是不是来自于html结构
    if (data.length) this.fromHtml = true;
  },
  initHead: function(){
    var that = this
        visibleColumns = {},
        html = [];

    //利用遍历开始渲染表头
    $.each(this.options.columns,function(i,columns){
      html.push('<tr>')
      
      $.each(columns,function (j,column) {
        var text = '',
            halign = '', // thead文本对齐情况
            align = '', //tbody、thead、tfoot文本对齐情况
            style = '',
            class_ = sprintf(' class="%s"', column['class']),
            order = that.options.sortOrder || column.order,
            unitWidth = 'px',
            width = column.width;

        //自定义值里面包含百分号说明设定了一个百分比值
        if (column.width !== undefined) {
          if (typeof column.width === 'string') {
            if (column.width.indexOf('%') !== -1) {
              unitWidth = '%';
            }
          }
        }

        //将设置的width属性去掉单位
        if(column.width && typeof column.width.toLowerCase() === 'string'){
          width = column.width.replace("%","").replace("px","");
        }

        halign = sprintf('text-align: %s; ', column.halign ? column.halign : column.align);
        align = sprintf('text-align: %s; ', column.align);
        style = sprintf('vertical-align: %s; ', column.valign);
        style += sprintf('width: %s; ',(column.checkbox || column.radio) && !width ? '36px' : (width ? width + unitWidth : undefined));

        if(typeof column.fieldIndex !== 'undefined'){
          that.dataMap.headerConfig.fields[column.fieldIndex] = column.field;
          that.dataMap.headerConfig.styles[column.fieldIndex] = align + style;
          that.dataMap.headerConfig.classes[column.fieldIndex] = class_;
          that.dataMap.headerConfig.formatters[column.fieldIndex] = column.formatter || Datatable.DEFAULTS.formatterCellCnt;
          that.dataMap.headerConfig.events[column.fieldIndex] = column.events;
          that.dataMap.headerConfig.sorters[column.fieldIndex] = column.sorter;
          that.dataMap.headerConfig.sortNames[column.fieldIndex] = column.sortName;
          that.dataMap.headerConfig.cellStyles[column.fieldIndex] = column.cellStyle;
          that.dataMap.headerConfig.searchables[column.fieldIndex] = column.searchable;

          if(!column.visible){
            return;
          }
          visibleColumns[column.field] = column;
        }

        html.push(
          '<th' + sprintf(' title="%s"',column.titleTooltip),
          column.checkbox || column.radio ? sprintf(' class="bs-checkbox %s"',column['class'] || '') : class_,
          sprintf(' style="%s"', halign + style),
          sprintf(' rowspan="%s"', column.rowspan),
          sprintf(' colspan="%s"', column.colspan),
          sprintf(' data-field="%s"', column.field),
          '>'
        )
        //添加表示可搜索的css类名
        html.push(sprintf('<div class="th-inner %s">', that.options.sortable && column.sortable ?
          'sortable both' : ''));
        text = that.options.escape ? escapeHTML(column.titlt) : column.title;
        //checkboxHeader属性控制是否显示全选按钮
        if(column.checkbox && that.options.checkboxHeader){
          text = '<input name="btSelectAll" type="checkbox" />';
          that.dataMap.headerConfig.stateField = column.field;
        }
        //单选按钮
        if (column.radio) {
          text = '';
          that.dataMap.headerConfig.stateField = column.field;
          that.options.singleSelect = true;
        }

        html.push(text);
        html.push('</div>');
        html.push('<div class="fht-cell"></div>');
        html.push('</div>');
        html.push('</th>');
      });
      html.push('</tr>');
    });

    this.jqueryMap.$header.html(html.join(''));
    this.jqueryMap.$header.find('th[data-field]').each(function (i) {
      //将每个标题栏的配置项全部写到对应的th标签的data属性里面
      $(this).data(visibleColumns[$(this).data('field')]);
    });
    //对表头绑定绑定点击事件进行排序
    this.jqueryMap.$container.off('click','.th-inner').on('click','.th-inner',function(event){
      var target = $(this);
      if(that.options.sortable && target.parent().data().sortable){
        that.onSort(event);
      }
    })
  },
  initSort: function(){
    /**
     * onSort方法设置点击排序按钮时，更新options.sortName为相应标题栏column.field值;initSort由column.field值获得相应的sortName;
     * 调用option.sorter函数或window[option.sorter]方法进行比较排序;
     * 或者直接比较data[sortName]进行排序;
     * 排序通过更新this.data数据实现,this.data渲染到页面使用initBody方法;
     */
    var that = this,
        name = this.options.sortName,
        order = this.options.sortOrder === 'desc' ? -1 : 1,
        //当前进行排序列的序号值
        index = $.inArray(this.options.sortName,this.dataMap.headerConfig.fields),
        //定时器句柄
        timeoutId = 0;

    //首先判断用户有没有自定义排序方法，有的话就用这个排序方法
    if(that.options.customSort !== $.noop){
      that.options.customSort.apply(that,[that.options.sortName,that.options.sortOrder]);
      return;
    }

    //必须确保用户设置的排序关键字在this.dataMap.headerConfig.fields数组里面
    if(index !== -1){
      //table整体可排序
      this.data = [
        {id:3,name:'商品1',price:'$8'},
        {id:12,name:'商品2',price:'$8'},
        {id:9,name:'商品3',price:'$8'},
        {id:15,name:'商品4',price:'$8'},
        {id:6,name:'商品5',price:'$8'},
        {id:2,name:'商品6',price:'$8'}
      ];
      this.data.sort(function(a,b){
        if(that.dataMap.headerConfig.sortNames[index]){
          name = that.dataMap.headerConfig.sortNames[index];
        }

        var aa = getItemField(a,name,that.options.escape);
        var bb = getItemField(b,name,that.options.escape);
        if (aa === undefined || aa === null) {
          aa = '';
        }
        if (bb === undefined || bb === null) {
          bb = '';
        }
        //value === undefined则表明用户对于这个列没有定义排序方法
        value = that.dataMap.headerConfig.sorters[index] && (typeof that.dataMap.headerConfig.sorters[index]).toLowerCase() === 'function' ? that.dataMap.headerConfig.sorters[index].call(that.dataMap.headerConfig,[aa,bb]) : undefined;
        if(value !== undefined && $.isNumeric(value)){
          return value < 0 ? value * -1 : value;
        }
        // jQuery.isNumeric()函数的返回值为Boolean类型，如果指定的参数是一个数字值或者字
        // 符串形式的数字（“1”，“0x123”等可以，“$0”，"123as"这种就不行），则返回true，否
        // 则返回false
        if ($.isNumeric(aa) && $.isNumeric(bb)) {
          aa = parseFloat(aa);
          bb = parseFloat(bb);
          return aa < bb ? order * -1 : order;
        }
        //两个值可能完全相等
        if (aa === bb) {
          return 0;
        }
        if (typeof aa !== 'string') {
          aa = aa.toString();
        }
        //localeCompare用本地特定的顺序来比较两个字符串，返回值是个数字如果 stringObjec小于 target，则 localeCompare() 返回小于 0 的数。如果stringObject 大于 target，则该方法返回大于 0的数。如果两个字符串相等，或根据本地排序规则没有区别，该方法返回 0;localeCompare相当于是默认比较方法
        if (aa.localeCompare(bb) === -1) {
          return order * -1;
        }
        return order;
      })

      if(this.options.sortClass !== undefined){
        //这一部分功能是给当前排序列的所有td加上一个类名，this.options.sortClass指定类名名称
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function () {
          that.$elem.removeClass(that.options.sortClass);
          var index = that.jqueryMap.$header.find(sprintf('[data-field="%s"]',
              that.options.sortName)).index() + 1;
          that.$elem.find(sprintf('tr td:nth-child(%s)', index))
            .addClass(that.options.sortClass);
        }, 250);
      }
    }

  },
  initBody: function(fixedScroll){
    var that = this,
        html = [],
        data = this.getData();
    //this.trigger('pre-body', data);定义初始化表体之前的事件

    this.jqueryMap.$body = this.$elem.find('>tbody');
    if(!this.$body.length){
      this.$body = $("<tbody></tbody>").appendTo(this.$elem);
    }
  },
  onSort: function(event){
    /**
     * 更新options.sortOrder为被排序列数据对应column[order]值，或保持原有值;
     * 触发sort事件，调用initServer获取后台数据，调用initSort排序、initBody渲染表体;
     */
    var $this = $(event.currentTarget).parent('th')

    //如果点击的列就是当前排序列，则改变排序的顺序
    if(this.options.sortName === $this.data('field')){
      this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
    }else{
      //更新options.sortName为被排序列数据对应column[field]值，以便initSort获取sortName
      this.options.sortName = $this.data('field')
      this.options.sortOrder = $this.data('order') || 'asc'
    }

    $this.data('order',this.options.sortOrder)
    //改变该列排序小图标的样式
    this.getCaret();
    if (this.options.sidePagination === 'server') {
      this.initServer(this.options.silentSort);
      return;
    }

    this.initSort();
    this.initBody();
  },
  getCaret: function(){
    var that = this;
    $.each(that.jqueryMap.$header.find('th'), function (i, th) {
      $(th).find('.sortable').removeClass('desc asc').addClass($(th).data('field') === that.options.sortName ? that.options.sortOrder : 'both');
    });
  },
  getData: function(){
    return [
      {id:3,name:'商品1',price:'$8'},
      {id:12,name:'商品2',price:'$8'},
      {id:9,name:'商品3',price:'$8'},
      {id:15,name:'商品4',price:'$8'},
      {id:6,name:'商品5',price:'$8'},
      {id:2,name:'商品6',price:'$8'}
    ];
  }
}

$.fn.Datatable = function(options){
  var $elem = this;
  var dataTable = new Datatable($elem,$.extend(Datatable.DEFAULTS,options));
  return dataTable;
}
