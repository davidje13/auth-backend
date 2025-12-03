#!/bin/sh
set -e

echo "Running package test...";
echo;

SELF_DIR="$(dirname "$0")";
"$SELF_DIR/install.sh";
npm --prefix="$SELF_DIR" test;

echo;
echo "Package test complete";
echo;
