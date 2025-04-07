module.exports = {
    plugins: [
        require('autoprefixer')({
            overrideBrowserslist: ['>1%', 'last 4 versions']
        }),
        // autoprefixer: {
        //     // 正确参数名：browsers 或 browserslist
        //     browserslist: ['> 1%', 'last 4 versions'],
        //     // 或使用更简洁的写法
        //     // browsers: '> 0.5%, last 2 versions'
        // }
    ]
}
