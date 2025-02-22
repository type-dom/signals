import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { babel } from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import postcss from 'rollup-plugin-postcss'

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/esm/index.js',
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'dist/cjs/index.cjs',
            format: 'cjs',
            exports: 'named',
            sourcemap: true
        },
        {
            file: 'dist/umd/index.umd.js',
            format: 'umd',
            name: 'MyLib',
            sourcemap: true
        }
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript(),
        babel({
            babelHelpers: 'bundled',
            extensions: ['.ts'],
            presets: [['@babel/preset-env', { targets: '> 0.25%, not dead' }]]
        }),
        // 添加到plugins数组
        postcss({
            extract: true,
            modules: true,
            use: ['sass']
        }),
        terser()
    ]
}
