#!/usr/bin/env bash
set -euo pipefail

# Defense in depth: a future workflow edit must not publish a feature branch.
[[ "${GITHUB_REF:-}" == 'refs/heads/main' ]] || { echo 'Catalogue writes require the main ref.' >&2; exit 1; }
case "${GITHUB_EVENT_NAME:-}" in
  schedule|workflow_dispatch|push) ;;
  *) echo 'Unsupported catalogue write event.' >&2; exit 1 ;;
esac
[[ "$(git symbolic-ref --short HEAD)" == main ]] || { echo 'Catalogue writes require a main checkout.' >&2; exit 1; }
git diff --cached --quiet || { echo 'Unexpected staged changes.' >&2; exit 1; }
while IFS= read -r changed; do
  case "$changed" in
    data/import-state.json|data/staging/ocre.json) ;;
    *) echo 'Unexpected worktree changes.' >&2; exit 1 ;;
  esac
done < <(git diff --name-only)

git fetch origin main
git merge-base --is-ancestor HEAD FETCH_HEAD || { echo 'Checkout contains commits outside origin main.' >&2; exit 1; }
git config user.name 'NUMIS VIA catalogue bot'
git config user.email 'actions@users.noreply.github.com'
git add data/import-state.json data/staging/ocre.json
if git diff --cached --quiet; then
  echo 'No catalogue changes to publish.'
  exit 0
fi
git commit -m 'Catalogue: import next OCRE batch'
git pull --rebase origin main
# Validate the actual rebased tree, not only the earlier checkout.
npm run check
git push origin HEAD:refs/heads/main
