#!/bin/sh
set -e

SELF_DIR="$(dirname "$0")";
"$SELF_DIR/install.sh";
npm --prefix="$SELF_DIR" start;
