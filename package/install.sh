#!/bin/sh
set -e

SELF_DIR="$(dirname "$0")";
cp "$SELF_DIR/../package.tgz" "$SELF_DIR/authentication-backend.tgz";

cd "$SELF_DIR";
rm -rf node_modules/authentication-backend || true;
npm install --audit=false;
rm authentication-backend.tgz || true;
cd - >/dev/null;
