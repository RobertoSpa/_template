# Issue tracker: GitHub

The issues and the specs of this repo are GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`. Use a heredoc for a body with more than one line.
- Read an issue: `gh issue view <number> --comments`. Filter the comments with `jq`, and also get the labels.
- List issues: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with the applicable `--label` and `--state` filters.
- Comment on an issue: `gh issue comment <number> --body "..."`
- Add or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

The `gh` CLI finds the repo from `git remote -v` when you run it in a clone.

## Pull requests as a triage surface

PRs as a request surface: no. Set this flag to `yes` if this repo reads an external PR as a feature request. The `/triage` skill reads this flag.

When the flag is `yes`, a PR goes through the same labels and states as an issue, with the `gh pr` commands:

- Read a PR: `gh pr view <number> --comments`, and `gh pr diff <number>` for the diff.
- List the external PRs for triage: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`. Then keep only the rows with `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`. Remove `OWNER`, `MEMBER`, and `COLLABORATOR`.
- Comment, label, or close: `gh pr comment`, `gh pr edit --add-label` or `--remove-label`, `gh pr close`.

GitHub has one number space for issues and PRs. A bare `#42` can be one or the other. Run `gh pr view 42` first, then `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

The `/wayfinder` skill uses these operations. The map is one issue. Its tickets are child issues.

- Map: one issue with the label `wayfinder:map`. Its body holds the Notes, the Decisions so far, and the Fog. Create it with `gh issue create --label wayfinder:map`.
- Child ticket: an issue that is a GitHub sub-issue of the map, through `gh api` on the sub-issues endpoint. If sub-issues are off, add the child to a task list in the map body, and put `Part of #<map>` at the top of the child body. The label is `wayfinder:<type>`, where the type is `research`, `prototype`, `grilling`, or `task`. A claimed ticket has the dev as assignee.
- Blocking: the native issue dependencies of GitHub. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. The value `<blocker-db-id>` is the numeric database id of the blocker, from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`. It is not the `#number` and not the `node_id`. GitHub reports `issue_dependencies_summary.blocked_by`, which counts only open blockers. If dependencies are not available, write a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when all of its blockers are closed.
- Frontier query: list the open children of the map with `gh issue list --state open`. Keep only the sub-issues or the task list of the map. Remove each child with an open blocker or with an assignee. An open blocker shows as `issue_dependencies_summary.blocked_by > 0`, or as an open issue in the `Blocked by` line. The first child in map sequence wins.
- Claim: `gh issue edit <n> --add-assignee @me`. This is the first write of the session.
- Resolve: `gh issue comment <n> --body "<answer>"`, then close the issue with the close command above. Then add a line with the gist and the link to the Decisions so far of the map.
