const gulp = require('gulp'),
      babel = require('gulp-babel'),
      browserify = require('browserify'),
      uglify = require('gulp-uglify'),
      sourcemaps = require('gulp-sourcemaps'),
      source = require('vinyl-source-stream'),
      buffer = require('vinyl-buffer'),
      runSequence = require('run-sequence');

gulp.task('babel-zango', () => {
    return gulp.src('./src/**/*.js')
        .pipe(babel({ presets: ['es2015'] }))
        .pipe(gulp.dest('./build/src'));
});

gulp.task('browserify-zango', () => {
    return browserify('./build/src/index.js', {
        standalone: 'zango'
    })
        .bundle()
        .pipe(source('zangodb.min.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify())
        .pipe(sourcemaps.write('/'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('babel-test', () => {
    return gulp.src('./test/**/*.js')
        .pipe(babel({ presets: ['es2015'] }))
        .pipe(gulp.dest('./build/test'));
});

gulp.task('browserify-test', () => {
    return browserify('./build/test/index.js')
        .bundle()
        .pipe(source('zangodb-test-suite.js'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build', (cb) => {
    runSequence(...[
        'babel-zango',
        'browserify-zango',
        'babel-test',
        'browserify-test'
    ], cb);
});

gulp.task('default', ['build']);
