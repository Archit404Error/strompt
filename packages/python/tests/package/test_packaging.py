import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path

import pytest

import strompt

ROOT = Path(__file__).parents[2]
UV = shutil.which("uv")

pytestmark = pytest.mark.skipif(
    UV is None, reason="uv is required to build the package"
)


@pytest.fixture(scope="module")
def dist_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    assert UV is not None

    out_dir = tmp_path_factory.mktemp("dist")
    subprocess.run(
        [UV, "build", "--quiet", "--out-dir", str(out_dir), str(ROOT)],
        check=True,
        capture_output=True,
    )

    return out_dir


def test_wheel_only_contains_the_package_and_its_metadata(dist_dir: Path) -> None:
    [wheel] = dist_dir.glob("*.whl")

    with zipfile.ZipFile(wheel) as archive:
        paths = archive.namelist()

    assert "strompt/py.typed" in paths
    for path in paths:
        assert re.match(r"^(strompt/|strompt-[^/]+\.dist-info/)", path), path


def test_sdist_only_contains_source_and_package_metadata(dist_dir: Path) -> None:
    [sdist] = dist_dir.glob("*.tar.gz")

    with tarfile.open(sdist) as archive:
        paths = [name.split("/", 1)[1] for name in archive.getnames() if "/" in name]

    assert "src/strompt/py.typed" in paths
    for path in paths:
        assert re.match(
            r"^(src/strompt/|pyproject\.toml$|README\.md$|LICENSE$|PKG-INFO$|\.gitignore$)",
            path,
        ), path


def test_installed_wheel_works_outside_the_source_tree(
    dist_dir: Path, tmp_path: Path
) -> None:
    assert UV is not None

    [wheel] = dist_dir.glob("*.whl")
    venv = tmp_path / "venv"
    python = venv / ("Scripts" if os.name == "nt" else "bin") / "python"

    subprocess.run(
        [UV, "venv", "--quiet", "--python", sys.executable, str(venv)],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [UV, "pip", "install", "--quiet", "--python", str(python), str(wheel)],
        check=True,
        capture_output=True,
    )

    script = """
import json
import strompt

renderer = strompt.MarkdownPromptRenderer()
with renderer.section("task") as section, section.subsection("Inputs") as sub:
    sub.text("</task> hi")

print(json.dumps({"exports": strompt.__all__, "rendered": renderer.render()}))
"""
    result = subprocess.run(
        [str(python), "-c", script],
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )
    output = json.loads(result.stdout)

    assert output["exports"] == strompt.__all__
    assert output["rendered"] == "<task>\n# Inputs\n&lt;/task&gt; hi\n</task>"
