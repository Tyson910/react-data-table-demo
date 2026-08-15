#!/bin/bash

cd "$CLAUDE_PROJECT_DIR" || exit 0

fmt_output=$(pnpm fmt 2>&1)
fmt_exit=$?

if [ $fmt_exit -ne 0 ]; then
  echo "$fmt_output"
  exit 2
fi

output=$(pnpm lint:fix 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo "$output"
  exit 2
fi

exit 0
