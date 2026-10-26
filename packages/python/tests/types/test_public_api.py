from collections.abc import Callable
from typing import assert_type

import strompt
from strompt import (
    MarkdownPromptRenderer,
    PromptRenderer,
    PromptRendererSpec,
    PromptSection,
    PromptSubsection,
    SectionDocumentList,
    SectionOrderedList,
    SectionUnorderedList,
)


def test_exports_the_public_api() -> None:
    assert sorted(strompt.__all__) == [
        "MarkdownPromptRenderer",
        "PromptRenderer",
        "PromptRendererSpec",
        "PromptSection",
        "PromptSubsection",
        "SectionDocumentList",
        "SectionOrderedList",
        "SectionUnorderedList",
    ]


def test_keeps_normalize_content_optional_so_custom_specs_without_it_are_valid() -> (
    None
):
    spec = PromptRendererSpec(
        render_prompt=lambda nodes: "".join(nodes),
        render_section=lambda title, nodes: "".join(nodes),
        render_subsection=lambda nodes: "".join(nodes),
        render_section_header=lambda text: text,
        render_section_subheader=lambda text: text,
        render_section_text=lambda text: text,
        render_section_ordered_list=lambda title, bullets: "".join(bullets),
        render_section_unordered_list=lambda title, bullets: "".join(bullets),
        render_section_document_list=lambda title, boundary, document_type, documents: (
            "".join(documents)
        ),
    )

    assert_type(spec.normalize_content, Callable[[str, str], str] | None)
    assert spec.normalize_content is None


def test_accepts_normalize_content_through_override_spec() -> None:
    MarkdownPromptRenderer().override_spec(normalize_content=lambda _, text: text)


def test_rejects_a_normalize_content_with_the_wrong_signature() -> None:
    def type_only(renderer: MarkdownPromptRenderer) -> None:
        renderer.override_spec(normalize_content=lambda _, __: 1)  # type: ignore[arg-type, return-value]

    assert callable(type_only)


def test_returns_the_created_node_without_a_callback_and_self_with_one() -> None:
    renderer = MarkdownPromptRenderer()
    section = renderer.section("s")
    subsection = section.subsection("h")

    assert_type(section, PromptSection)
    assert_type(renderer.section("s", lambda _: None), MarkdownPromptRenderer)

    assert_type(subsection, PromptSubsection)
    assert_type(section.subsection("h", lambda _: None), PromptSection)

    assert_type(subsection.ordered_list("ol"), SectionOrderedList)
    assert_type(subsection.unordered_list("ul"), SectionUnorderedList)
    assert_type(subsection.documents("d", "b", "D"), SectionDocumentList)
    assert_type(subsection.ordered_list("ol", lambda _: None), PromptSubsection)


def test_markdown_prompt_renderer_is_a_prompt_renderer() -> None:
    renderer: PromptRenderer = MarkdownPromptRenderer()

    assert isinstance(renderer, PromptRenderer)
