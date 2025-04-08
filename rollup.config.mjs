import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

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
            name: 'CssType',
            sourcemap: true
        },
        {
            file: 'dist/index.min.js',
            format: 'umd',
            name: 'CssType',
            plugins: [terser()],
            sourcemap: true
        }
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript({ tsconfig: './tsconfig.json' }),  // 显式指定 tsconfig 路径
        babel({
            babelHelpers: 'bundled',
            extensions: ['.ts'],
            presets: [['@babel/preset-env', { targets: '> 0.25%, not dead' }]]
        })
    ],
    external: id => /node_modules/.test(id) // 修正条件：仅排除 node_modules
}
