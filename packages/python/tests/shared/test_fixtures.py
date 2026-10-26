import json
from pathlib import Path
from typing import Any, Literal, TypedDict

import pytest

from strompt import MarkdownPromptRenderer
from strompt.renderer.markdown_renderer import markdown_renderer_spec


class TextNode(TypedDict):
    type: Literal["text", "subheader"]
    text: str


class ListNode(TypedDict):
    type: Literal["orderedList", "unorderedList"]
    title: str
    bullets: list[str]


class DocumentsNode(TypedDict):
    type: Literal["documents"]
    title: str
    boundary: str
    documentType: str
    documents: list[str]


FixtureNode = TextNode | ListNode | DocumentsNode


class FixtureSubsection(TypedDict):
    header: str
    nodes: list[FixtureNode]


class FixtureSection(TypedDict):
    title: str
    subsections: list[FixtureSubsection]


class RenderCase(TypedDict):
    name: str
    prompt: list[FixtureSection]
    expected: list[str]


class NormalizeCase(TypedDict):
    name: str
    tagName: str
    text: str
    expected: str


FIXTURES_DIR = Path(__file__).parents[4] / "spec" / "fixtures"
FIXTURE_PATHS = sorted(FIXTURES_DIR.glob("*.json"))


def load_cases(kind: Literal["render", "normalize"]) -> list[Any]:
    cases = []

    for path in FIXTURE_PATHS:
        fixture = json.loads(path.read_text(encoding="utf-8"))

        if fixture["kind"] != kind:
            continue

        for case in fixture["cases"]:
            cases.append(pytest.param(case, id=f"{path.stem}: {case['name']}"))

    return cases


def render(prompt: list[FixtureSection]) -> str:
    renderer = MarkdownPromptRenderer()

    for fixture_section in prompt:
        with renderer.section(fixture_section["title"]) as section:
            for fixture_subsection in fixture_section["subsections"]:
                with section.subsection(fixture_subsection["header"]) as subsection:
                    for node in fixture_subsection["nodes"]:
                        if node["type"] == "text":
                            subsection.text(node["text"])
                        elif node["type"] == "subheader":
                            subsection.subheader(node["text"])
                        elif node["type"] == "orderedList":
                            with subsection.ordered_list(node["title"]) as ordered_list:
                                for bullet in node["bullets"]:
                                    ordered_list.bullet(bullet)
                        elif node["type"] == "unorderedList":
                            with subsection.unordered_list(
                                node["title"]
                            ) as unordered_list:
                                for bullet in node["bullets"]:
                                    unordered_list.bullet(bullet)
                        else:
                            with subsection.documents(
                                node["title"], node["boundary"], node["documentType"]
                            ) as document_list:
                                for document in node["documents"]:
                                    document_list.document(document)

    return renderer.render()


def test_fixtures_are_found() -> None:
    assert FIXTURE_PATHS, f"no shared fixtures found in {FIXTURES_DIR}"


@pytest.mark.parametrize("case", load_cases("render"))
def test_render_fixture(case: RenderCase) -> None:
    assert render(case["prompt"]) == "\n".join(case["expected"])


@pytest.mark.parametrize("case", load_cases("normalize"))
def test_normalize_fixture(case: NormalizeCase) -> None:
    assert markdown_renderer_spec.normalize_content is not None

    assert (
        markdown_renderer_spec.normalize_content(case["tagName"], case["text"])
        == case["expected"]
    )
