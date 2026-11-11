#!/usr/bin/env bash
#
# Bounded wrapper around the gh CLI, used by the Claude issue-triage workflow.
#
# Claude never gets `gh` directly: it only gets this script, with a closed set of
# subcommands. The issue number is always read from the workflow event payload,
# so a triage run can never act on a different issue.
#
# Usage:
#   ./.github/scripts/triage.sh issue
#   ./.github/scripts/triage.sh labels
#   ./.github/scripts/triage.sh similar "rotation near the wall"
#   ./.github/scripts/triage.sh apply-labels --add type:bug --add area:gameplay --remove needs-info
#   ./.github/scripts/triage.sh comment /tmp/diagnostico.md

set -euo pipefail

export GH_HOST=github.com

# Hidden marker used to find and update the previous triage comment.
MARKER='<!-- claude-triage -->'

REPO="${GH_REPO:-${GITHUB_REPOSITORY:-}}"
if [[ -z "$REPO" || "$REPO" != */* || "$REPO" == */*/* ]]; then
  echo "Error: GH_REPO or GITHUB_REPOSITORY must be set to owner/repo" >&2
  exit 1
fi
export GH_REPO="$REPO"

ISSUE=$(jq -r '.issue.number // empty' "${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH is not set}")
if ! [[ "$ISSUE" =~ ^[0-9]+$ ]]; then
  echo "Error: the event payload carries no issue number" >&2
  exit 1
fi

usage() {
  cat >&2 <<'USAGE'
Usage:
  triage.sh issue
  triage.sh labels
  triage.sh similar "<query>"
  triage.sh apply-labels [--add <label>]... [--remove <label>]...
  triage.sh comment <markdown-file>
USAGE
}

repo_label_names() {
  gh label list --limit 200 --json name --jq '.[].name'
}

cmd="${1:-}"
[[ $# -gt 0 ]] && shift

case "$cmd" in
  issue)
    # `gh issue view --comments` prints only the comments, so print both.
    gh issue view "$ISSUE"
    echo
    echo "--- comments ---"
    gh issue view "$ISSUE" --comments
    ;;

  labels)
    gh label list --limit 200 --json name,description
    ;;

  similar)
    query="${1:-}"
    if [[ -z "$query" ]]; then
      echo 'Error: similar requires a query, e.g. similar "rotation near the wall"' >&2
      exit 1
    fi
    lowered=$(printf '%s' "$query" | tr '[:upper:]' '[:lower:]')
    if [[ "$lowered" == *"repo:"* || "$lowered" == *"org:"* || "$lowered" == *"user:"* ]]; then
      echo "Error: the query must not contain repo:, org: or user: qualifiers" >&2
      exit 1
    fi
    # `gh search issues` is useless here: GitHub does not index forks. The issue
    # list endpoint is scoped to this repo and works on forks.
    gh issue list --search "$query" --state all --limit 10 || true
    ;;

  apply-labels)
    add=()
    remove=()
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --add)
          [[ $# -ge 2 ]] || { echo "Error: --add needs a value" >&2; exit 1; }
          add+=("$2"); shift 2 ;;
        --remove)
          [[ $# -ge 2 ]] || { echo "Error: --remove needs a value" >&2; exit 1; }
          remove+=("$2"); shift 2 ;;
        *)
          echo "Error: unknown argument '$1' (only --add and --remove are accepted)" >&2
          exit 1 ;;
      esac
    done

    if [[ ${#add[@]} -eq 0 && ${#remove[@]} -eq 0 ]]; then
      echo "Error: nothing to do, pass --add and/or --remove" >&2
      exit 1
    fi

    valid=$(repo_label_names)
    args=(issue edit "$ISSUE")
    did_add=()
    did_remove=()
    skipped=()

    for label in ${add[@]+"${add[@]}"}; do
      if printf '%s\n' "$valid" | grep -qxF -- "$label"; then
        args+=(--add-label "$label")
        did_add+=("$label")
      else
        skipped+=("$label")
      fi
    done

    for label in ${remove[@]+"${remove[@]}"}; do
      if printf '%s\n' "$valid" | grep -qxF -- "$label"; then
        args+=(--remove-label "$label")
        did_remove+=("$label")
      else
        skipped+=("$label")
      fi
    done

    if [[ ${#did_add[@]} -eq 0 && ${#did_remove[@]} -eq 0 ]]; then
      echo "No label exists in this repo. Skipped: ${skipped[*]}" >&2
      exit 1
    fi

    gh "${args[@]}"

    if [[ ${#did_add[@]} -gt 0 ]]; then
      echo "Added: ${did_add[*]}"
    fi
    if [[ ${#did_remove[@]} -gt 0 ]]; then
      echo "Removed: ${did_remove[*]}"
    fi
    if [[ ${#skipped[@]} -gt 0 ]]; then
      echo "Skipped, not defined in .github/labels.json: ${skipped[*]}"
    fi
    ;;

  comment)
    file="${1:-}"
    if [[ -z "$file" ]]; then
      echo "Error: comment requires the path to a markdown file" >&2
      exit 1
    fi
    if [[ ! -f "$file" ]]; then
      echo "Error: file not found: $file" >&2
      exit 1
    fi

    body=$(mktemp)
    payload=$(mktemp)
    trap 'rm -f "$body" "$payload"' EXIT

    { printf '%s\n\n' "$MARKER"; cat "$file"; } > "$body"
    jq -Rs '{ body: . }' < "$body" > "$payload"

    existing=$(gh api "repos/$REPO/issues/$ISSUE/comments?per_page=100" \
      | jq -r --arg m "$MARKER" '[.[] | select((.body // "") | contains($m))] | .[0].id // empty')

    if [[ -n "$existing" ]]; then
      gh api --method PATCH "repos/$REPO/issues/comments/$existing" --input "$payload" --jq '.html_url'
      echo "Updated the existing triage comment on issue #$ISSUE"
    else
      gh api --method POST "repos/$REPO/issues/$ISSUE/comments" --input "$payload" --jq '.html_url'
      echo "Posted a new triage comment on issue #$ISSUE"
    fi
    ;;

  ""|-h|--help|help)
    usage
    exit 1
    ;;

  *)
    echo "Error: unknown subcommand '$cmd'" >&2
    usage
    exit 1
    ;;
esac
