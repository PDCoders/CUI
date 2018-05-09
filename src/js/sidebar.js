/**
 * Created by feng.shen on 2017/11/21.
 */
;(function($){
  function Sidebar(element,options){
    this.element = element;
    this.options = $.extend({
      data: [],
      defaultActiveId: '9',
      animationSpeed: 500,
      accordion     : true,
      followLink    : false,
      //初始化完成
      onCreated: function(text,data){

      },
      onItemClick: function(text,data){

      }
    },options);
    this._init();
  }
  Sidebar.className = {
    active: 'active',
    open: 'menu-open', //判断是否处于打开状态
    leaf: 'leaf',
    treeview: 'treeview',
    treeviewMenu: 'treeview-menu'
  }
  Sidebar.prototype = {
    constructor: Sidebar,
    _init: function(){
      if(!this.element.hasClass('sidebar-menu')){
        this.element.addClass('sidebar-menu')
      }

      this.initElems();
      //设置默认选中项
      this._setDefaultItem();
      this.initEventHandle();
    },
    _setDefaultItem: function(){
      var selector = this.sprintf('[data-id="%s"]',this.options.defaultActiveId);
      //如果默认选中的是一个包含子节点的元素，则默认选中该节点的第一个li节点
      if($(selector).hasClass("treeview")){
        selector = this.sprintf('[data-id="%s"]',$(selector).children(".treeview-menu").children("li").eq(0).data("id"))
      }
      this.selectItem($(selector))
      this._setDefaultOpen($(selector));
    },
    _setDefaultOpen: function($li){
      var $treeviewMenu = $li.parent('.' + Sidebar.className.treeviewMenu);
      var $treeview = $treeviewMenu.parent('.' + Sidebar.className.treeview);
      if(!$treeviewMenu.length){
        return;
      }
      $treeviewMenu.show();
      $treeview.addClass(Sidebar.className.open);
      this._setDefaultOpen($treeview)
    },
    initElems: function(){
      for (var i = 0; i < this.options.data.length; i++) {
        this.element.append(this.initData(this.options.data[i]))
      }
    },
    initData: function(obj){
      var html = []
      var that = this
      //渲染方式分两种，一种是有子菜单的渲染方式，li元素上面会有treeview类；另外一种是渲染叶子节点，叶子节点的li会有leaf类
      if(obj.children && obj.children.length > 0){
        html.push(
          that.sprintf("<li class='%s' data-info='%s' data-id='%s'>",Sidebar.className.treeview,JSON.stringify(obj),obj.id),
          "<a href='#'>",
          that.sprintf("<i class='%s'></i>",obj.icon || 'a'),
          that.sprintf("<span class='labelName' title='%s'>%s</span>",obj.name,obj.name),
          "<span class='arrow'></span>",
          "</a>",
          "<ul class='treeview-menu'>"
        )
        obj.children.forEach(function(v,i){
          html.push(that.initData(v))
        })
        html.push("</ul>")
      }else{
        html.push(that.sprintf("<li class='%s' data-info='%s'  data-id='%s'><a href='%s'><span" +
          " class='labelName' title='%s'>%s</span></a></li>",Sidebar.className.leaf,JSON.stringify(obj), obj.id, obj.url || '#', obj.icon || "fa fa-circle-o", obj.name, obj.name));
      }
      return html.join('')
    },
    initEventHandle: function(){
      var that = this
      $(this.element).off().on('click', 'a', function (event) {
        if(!that.options.followLink){
          event.preventDefault()
        }
        that.toggle($(this), event)
      })
    },
    selectItem: function($li){
      $li.addClass('active')
      this.activeItem = $li;
      this.options.onItemClick.call(this.activeItem,this.getActiveItemText(),this.activeItem.data("info"))
      this.setParentsActive($li);
      this.setSiblingsUnactive($li);
    },
    getActiveItemText: function(){
      return this.activeItem.find('.labelName').text()
    },
    toggle: function($link,event){
      var that = this;
      var $parentLi = $link.parent();
      var $treeviewMenu = $link.next();

      //!$treeviewMenu.length = 0说明这个$parentLi是叶子节点
      if(!$treeviewMenu.length){
        that.selectItem($parentLi);
        if(that.options.accordion){
          //关闭同级所有的子菜单
          $.each($parentLi.siblings('li'),function(index,item){
            that.collapse($(this).children('.' + Sidebar.className.treeviewMenu),$(this))
          })
        }
        return;
      }

      if($parentLi.hasClass(Sidebar.className.open)){
        that.collapse($treeviewMenu,$parentLi);
      }else{
        that.open($treeviewMenu,$parentLi);
      }
    },
    //关闭子菜单方法
    collapse: function($treeviewMenu,$parentLi){
      var that = this
      $parentLi.removeClass(Sidebar.className.open)
      $treeviewMenu.slideUp(this.options.animationSpeed,function(){
        var $treeview = $treeviewMenu.children('.' + Sidebar.className.treeview)
        that.collapse($treeview.children('.' + Sidebar.className.treeviewMenu),$treeview)
      })
    },
    //打开子菜单方法
    open: function($treeviewMenu,$parentLi){
      var that = this
      // $parentLi.addClass(Sidebar.className.open)
      $treeviewMenu.slideDown(that.options.animationSpeed)

      if(that.options.accordion){
        $.each($parentLi.siblings('li'),function(index,item){
          that.collapse($(this).children('.' + Sidebar.className.treeviewMenu),$(this))
        })
      }
    },
    //设置父节点的的选中状态，并向上冒泡
    setParentsActive: function($li){
      var $parentLi = $li.parent('.' + Sidebar.className.treeviewMenu).parent('.' + Sidebar.className.treeview)
      if($parentLi.length){
        $parentLi.addClass(Sidebar.className.active)
        this.setParentsActive($parentLi)
        this.setSiblingsUnactive($parentLi)
      }
    },
    //取消兄弟节点的选中状态，并向下冒泡
    setSiblingsUnactive: function($li){
      var that = this
      $.each($li.siblings('li'),function(){
        that.cancelSelectState($(this))
      })
    },
    //取消该节点以下所有节点的选中状态
    cancelSelectState: function($li){
      var that = this
      $li.removeClass(Sidebar.className.active)
      if($li.hasClass(Sidebar.className.treeview)){
        $.each($li.children('.' + Sidebar.className.treeviewMenu).children('li'),function(){
          that.cancelSelectState($(this))
        })
      }
    },
    sprintf: function (str) {
      var args = arguments,
        flag = true,
        i = 1;

      str = str.replace(/%s/g, function () {
        var arg = args[i++];

        if (typeof arg === 'undefined') {
          flag = false;
          return '';
        }
        return arg;
      });
      return flag ? str : '';
    }
  }
  $.fn.sidebar = function(options){
    var $elem = this
    var sidebar = new Sidebar($elem,options)
    return sidebar
  }
})(jQuery)

