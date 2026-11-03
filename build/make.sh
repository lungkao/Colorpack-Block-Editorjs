#!/bin/sh
set -e
cd "$(dirname "$0")"
VERSION=1.1.0
npx esbuild src/index.js --bundle --minify --format=esm --target=es2020 --external:editor-api --loader:.css=text --legal-comments=none --outfile=../pkg/media/js/editorjs.min.js
cd ..
rm -rf dist && mkdir -p dist/packages
(cd pkg && zip -qr ../dist/packages/plg_editors_editorjs.zip . -x '*.DS_Store')
(cd pkg-content && zip -qr ../dist/packages/plg_content_colorpackembed.zip . -x '*.DS_Store')
cp package/pkg_colorpackblockeditorjs.xml dist/
(cd dist && zip -qr "../colorpack-block-editorjs-$VERSION.zip" .)
rm -rf dist
