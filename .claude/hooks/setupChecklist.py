#!/usr/bin/env python3
"""Print the setup steps of README.md whose condition is true right now."""

import os
import sys
from itertools import islice
from pathlib import Path

LOG_LINES_MAX = 2000
LOG_PATH = Path.home() / ".local/state/script-logs/setupChecklist.log"
SOURCE_FILES_MAX = 5000
STEP_PREFIX = "- [ ] "


def log(message):
    assert isinstance(message, str)
    assert len(message) > 0
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    if LOG_PATH.exists():
        lines = LOG_PATH.read_text(encoding="utf-8").splitlines()
    lines.append(message)
    kept = lines[-LOG_LINES_MAX:]
    assert len(kept) <= LOG_LINES_MAX
    LOG_PATH.write_text("\n".join(kept) + "\n", encoding="utf-8")


def source_files(root):
    assert isinstance(root, Path)
    source = root / "src"
    if not source.is_dir():
        return []
    found = islice(source.rglob("*.ts*"), SOURCE_FILES_MAX)
    files = [path for path in found if path.suffix in (".ts", ".tsx")]
    assert len(files) <= SOURCE_FILES_MAX
    return files


def stryker_floor_is_default(root):
    assert isinstance(root, Path)
    config = root / "stryker.config.json"
    if not config.is_file():
        return False
    text = config.read_text(encoding="utf-8")
    assert len(text) > 0
    return '"break": 60' in text


def readme_title_is_default(root):
    assert isinstance(root, Path)
    readme = root / "README.md"
    if not readme.is_file():
        return False
    text = readme.read_text(encoding="utf-8")
    assert len(text) >= 0
    return text.startswith("# Project name")


def package_lacks(root, name):
    assert isinstance(root, Path)
    assert len(name) > 0
    package = root / "package.json"
    if not package.is_file():
        return True
    text = package.read_text(encoding="utf-8")
    assert len(text) > 0
    return f'"{name}"' not in text


def routes_are_empty(root):
    assert isinstance(root, Path)
    path = root / "a11y/routes.yaml"
    if not path.is_file():
        return False
    lines = path.read_text(encoding="utf-8").splitlines()
    body = [line for line in lines if line.strip() and not line.startswith("#")]
    assert len(body) <= len(lines)
    return body == ["[]"]


def ui_primitives(root):
    assert isinstance(root, Path)
    directory = root / "src/shared/ui"
    if not directory.is_dir():
        return []
    found = list(islice(directory.rglob("*.tsx"), SOURCE_FILES_MAX))
    assert len(found) <= SOURCE_FILES_MAX
    return found


def page_files(root):
    assert isinstance(root, Path)
    directory = root / "src/pages"
    if not directory.is_dir():
        return []
    found = list(islice(directory.rglob("*.tsx"), SOURCE_FILES_MAX))
    assert len(found) <= SOURCE_FILES_MAX
    return found


def conditions(root):
    assert isinstance(root, Path)
    sources = source_files(root)
    screens = [path for path in sources if path.suffix == ".tsx"]
    assert len(screens) <= len(sources)
    infrastructure = root / "src/shared/infrastructure"
    modules = list(islice(infrastructure.glob("*.ts"), SOURCE_FILES_MAX))
    live = {
        "walking skeleton": readme_title_is_default(root) and len(sources) > 0,
        "domain has a name": not (root / "CONTEXT.md").is_file() and len(sources) > 0,
        "first feature has code": not (root / "graphify-out").is_dir()
        and len(sources) > 0,
        "first screen renders": not (root / "DESIGN.md").is_file()
        and len(screens) > 0,
        "apps/api": (root / "apps/api").is_dir(),
        "first module in `src/` has logic": stryker_floor_is_default(root)
        and len(sources) > 0,
        "src/shared/infrastructure": len(modules) > 0,
        "first route renders": routes_are_empty(root) and len(page_files(root)) > 0,
        "first interactive component exists": package_lacks(root, "axe-core")
        and len(ui_primitives(root)) > 0,
        "palette is complete": package_lacks(root, "apca-w3")
        and (root / "DESIGN.md").is_file(),
        "holds a primitive": package_lacks(
            root, "@guidepup/virtual-screen-reader"
        )
        and len(ui_primitives(root)) > 0,
    }
    assert len(live) == 11
    return live


def open_steps(root):
    assert isinstance(root, Path)
    readme = root / "README.md"
    if not readme.is_file():
        return []
    lines = readme.read_text(encoding="utf-8").splitlines()
    steps = [line[len(STEP_PREFIX) :] for line in lines if line.startswith(STEP_PREFIX)]
    assert len(steps) <= len(lines)
    return steps


def live_steps(root):
    assert isinstance(root, Path)
    live = conditions(root)
    steps = open_steps(root)
    found = [step for step in steps if step_applies(step, live)]
    assert len(found) <= len(steps)
    return found


def step_applies(step, live):
    assert isinstance(step, str)
    assert len(live) > 0
    for key, applies in live.items():
        if key in step:
            return applies
    return False


def main():
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR", "."))
    assert isinstance(root, Path)
    try:
        steps = live_steps(root)
    except OSError as error:
        log(f"error: {error}")
        return 0
    assert isinstance(steps, list)
    if len(steps) == 0:
        log("no step applies")
        return 0
    log(f"{len(steps)} steps apply")
    print("Setup steps of README.md that apply now:")
    for step in steps:
        print(f"- {step}")
    print("Do the step, or make an issue for it. Then write its check.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
