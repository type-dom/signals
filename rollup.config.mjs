import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import copy from 'rollup-plugin-copy'; // 导入插件

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.esm.js',  // 从 dist/esm/ 移动到 dist/
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'dist/index.cjs.js',  // 从 dist/cjs/ 移动到 dist/
            format: 'cjs',
            exports: 'named',
            sourcemap: true
        },
        {
            file: 'dist/index.umd.js',  // 从 dist/umd/ 移动到 dist/
            format: 'umd',
            name: 'Signals',
            sourcemap: true
        },
        {
            file: 'dist/index.min.js',
            format: 'umd',
            name: 'Signals',
            plugins: [terser()],
            sourcemap: true
        }
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript({tsconfig: './tsconfig.json'}),  // 显式指定 tsconfig 路径
        babel({
            babelHelpers: 'bundled',
            extensions: ['.ts'],
            presets: [['@babel/preset-env', {targets: '> 0.25%, not dead'}]]
        }),
        copy({ // 新增配置
            targets: [
                {src: ['package.json', 'README.md'], dest: 'dist/'}, // 复制到 dist/ 目录
            ],
        }),
    ],
    external: id => /node_modules/.test(id) // 修正条件：仅排除 node_modules
}
