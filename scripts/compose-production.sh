#!/usr/bin/env sh
set -eu

if [ -z "${IMAGE_SHA:-}" ]; then
  printf '%s\n' 'IMAGE_SHA is required (7-40 lowercase hex chars, without sha- prefix).' >&2
  exit 2
fi

case "$IMAGE_SHA" in
  *[!0123456789abcdef]* )
    printf '%s\n' 'IMAGE_SHA must contain only lowercase hex characters.' >&2
    exit 2
    ;;
esac

sha_len=${#IMAGE_SHA}
if [ "$sha_len" -lt 7 ] || [ "$sha_len" -gt 40 ]; then
  printf '%s\n' 'IMAGE_SHA length must be between 7 and 40 characters.' >&2
  exit 2
fi

exec docker compose -f compose.production.yml "$@"
