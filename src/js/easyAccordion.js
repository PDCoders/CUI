//定义jQuery的作用域
(function($) {

    //插件的默认值属性
    var defaults = {

    };

    var showLink = function(obj) {
        $(obj).append(function() {
            return "(" + $(obj).attr("href") + ")"
        });
    }

    // 插件的扩展方法名称
    $.fn.easyAccordion = function(options) {
        var options = $.extend(defaults, options);
        //支持jQuery选择器
        //支持链式调用
        return this.each(function() {

        });
    }
})(jQuert);