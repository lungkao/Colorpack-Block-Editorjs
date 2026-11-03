#!/bin/sh
set -e
cd "$(dirname "$0")"
npx esbuild src/index.js --bundle --minify --format=esm --target=es2020 --external:editor-api --legal-comments=none --outfile=../pkg/media/js/editorjs.min.js
rm -f ../colorpack-block-editorjs-1.0.0.zip
cd ../pkg && zip -qr ../colorpack-block-editorjs-1.0.0.zip . -x '*.DS_Store'
