import fs from 'fs'
import path from 'path'
import sync_dir from 'sync-directory'// 默认为单向copy更加安全

import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

const WEB_PATH = 'digital-twin'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
    // plugins: [react()],

    plugins: [
        {
            name: 'build-index',

            async buildStart(options) {
                console.log('## buildStart', command, mode)
                // serve	serve development
                // build	build production
                // lib		build lib

                // #20231128, 不同于syncFolders target目录写法差一级

                if (fs.existsSync('./crossyo.local')) {

                    let KUTSI_HOME = '/svn/crossyo4/2021/1028_kutsi'
                    if (process.platform == 'darwin') {
                        KUTSI_HOME = '../../../../../2021/1028_kutsi'
                    }

                    // console.log(path.resolve(`${KUTSI_HOME}/v1/src/kutsi-0/src/crossyo`))

                    // comment out when release!
                    sync_dir(
                        `${KUTSI_HOME}/v2/src/kutsi-0/src/crossyo`, // from 
                        path.resolve(__dirname, './src-kutsi/crossyo'), // to
                        {
                            // watch: true, // from - to 立即
                            type: 'hardlink' // default copy, hardlink
                        }
                    )
                    sync_dir(
                        `${KUTSI_HOME}/v2/src/kutsi-0-17-digital-twin/src/crossyo`,
                        path.resolve(__dirname, './src-kutsi-digital-twin/crossyo')
                    )

                    // _bake_names()

                }

                // TODO copy draco
                // TODO SrcGenPlugin()



            }
        }

    ],

    resolve: {
        alias: {
            'kutsi': path.resolve(__dirname, './src-kutsi/crossyo/kutsi'),
            'kutsi-digital-twin': path.resolve(__dirname, './src-kutsi-digital-twin/crossyo/kutsi'),
        }
    },


    base: `/${WEB_PATH}`,
    server: {
        port: 4186,
        // open: `/${WEB_PATH}/`,
    },
    build: mode == 'lib'
        ? {
            lib: {
                entry: path.resolve(__dirname, 'src/crossyo/digital-twin/lib.js'),
                formats: ['es'], // es cjs umd iife
                // formats: ['umd'],
                fileName: () => `${WEB_PATH}.mjs`,

            },

            // https://rollupjs.org/configuration-options/

            // rollupOptions: {
            // 	output: {
            // 		sourcemap: true, // for debug!
            // 	},
            // },


            sourcemap: true, // for debug!

            outDir: path.resolve(__dirname, '../../dist'),
            emptyOutDir: false,
        }
        : {
            outDir: `dist/${WEB_PATH}`,
        }
}))
