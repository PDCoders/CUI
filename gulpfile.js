var gulp = require('gulp');
//加载gulp-load-plugins插件，并马上运行它
var plugins = require('gulp-load-plugins')();
var browsersync = require('browser-sync').create();

gulp.task('default',['serve']);

gulp.task('sass',function() {
  gulp.src('src/sass/*.scss')
    .pipe(plugins.sass())
    .pipe(plugins.autoprefixer({
        browsers: ['last 6 versions', 'last 4 Explorer versions'],
        cascade: true, 
        remove:true
    }))
    .pipe(gulp.dest('dist/css'))
    .pipe(plugins.cssmin())
    .pipe(plugins.rename('cui.min.css'))
    .pipe(gulp.dest('dist/css'))
    .pipe(browsersync.stream());
});

gulp.task('js',function() {
  	gulp.src('src/js/*.js')
    .pipe(plugins.concat('cui.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(plugins.uglify())
    .pipe(plugins.rename('cui.min.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(browsersync.stream());
});

gulp.task('html', function () {
    gulp.src('src/*.html')
    .pipe(gulp.dest('dist'))
    .pipe(browsersync.stream());
});

gulp.task('fonts', function () {
  gulp.src('src/fonts/**/*')
    .pipe(gulp.dest('dist/fonts'))
    .pipe(browsersync.stream());
});

gulp.task('images', function () {
    gulp.src(['src/images/*.png','src/images/*.jpg','src/images/*.gif'])
    .pipe(plugins.cache(plugins.imagemin({
        optimizationLevel: 2, //类型：Number  默认：3  取值范围：0-7（优化等级）
        progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
        interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
        multipass: true, //类型：Boolean 默认：false 多次优化svg直到完全优化
        use: [plugins.pngquant()] //使用pngquant深度压缩png图片的imagemin插件
    })))
    .pipe(gulp.dest('dist/images'))
    .pipe(browsersync.stream());
});

gulp.task('lib', function () {
  gulp.src('src/lib/**/*')
    .pipe(gulp.dest('dist/lib'))
    .pipe(browsersync.stream());
});

/*gulp.task("clean", function(){
    return gulp.src('dist')
        .pipe(plugins.clean());
})*/


gulp.task('serve',  function() {
    gulp.start('sass','js','html','fonts','images','lib');
    browsersync.init({
        port: 9090,
        server: {
            baseDir: ['./dist']
        }
    });
    gulp.watch('src/js/*.js', ['js']);         //监控文件变化，自动更新
    gulp.watch('src/sass/*.scss', ['sass']);
    gulp.watch('src/images/**/*', ['images']);
    gulp.watch('src/lib/**/*', ['lib']);
    gulp.watch('src/*.html', ['html']);
    gulp.watch('src/fonts/**/*', ['fonts']);
});