from collections.abc import Callable
from dataclasses import replace
from typing import Any
from unittest.mock import ANY, Mock, call

import pytest

from strompt import (
    PromptRenderer,
    PromptRendererSpec,
    PromptSection,
    PromptSubsection,
    SectionDocumentList,
    SectionOrderedList,
    SectionUnorderedList,
)

SPEC = PromptRendererSpec(
    render_prompt=lambda nodes: " | ".join(nodes),
    render_section=lambda title, nodes: f"section[{title}]{{{', '.join(nodes)}}}",
    render_subsection=lambda nodes: f"sub{{{', '.join(nodes)}}}",
    render_section_header=lambda text: f"H:{text}",
    render_section_subheader=lambda text: f"SH:{text}",
    render_section_text=lambda text: f"T:{text}",
    render_section_ordered_list=lambda title, bullets: (
        f"OL:{title}[{';'.join(bullets)}]"
    ),
    render_section_unordered_list=lambda title, bullets: (
        f"UL:{title}[{';'.join(bullets)}]"
    ),
    render_section_document_list=lambda title, boundary, document_type, documents: (
        f"DL:{title}<{boundary}>{document_type}[{';'.join(documents)}]"
    ),
    normalize_content=lambda tag_name, text: f"{tag_name}({text})",
)


def create_spec(**overrides: Any) -> PromptRendererSpec:
    return replace(SPEC, **overrides)


def render_subsection(
    spec: PromptRendererSpec, build: Callable[[PromptSubsection], object]
) -> str:
    return (
        PromptRenderer(spec)
        .section("s", lambda section: section.subsection("head", build))
        .render()
    )


class TestNormalization:
    def test_normalizes_headers_subheaders_and_text_against_the_section_title(
        self,
    ) -> None:
        assert (
            render_subsection(
                create_spec(), lambda sub: sub.subheader("subhead").text("body")
            )
            == "section[s]{sub{H:s(head), SH:s(subhead), T:s(body)}}"
        )

    def test_does_not_normalize_the_section_title_itself(self) -> None:
        render_section = Mock(return_value="")

        PromptRenderer(create_spec(render_section=render_section)).section(
            "</s>", lambda section: section.subsection("h")
        ).render()

        render_section.assert_called_with("</s>", ANY)

    def test_normalizes_list_titles_and_bullets_against_the_section_title(self) -> None:
        assert (
            render_subsection(
                create_spec(),
                lambda sub: sub.ordered_list(
                    "ol", lambda ordered_list: ordered_list.bullet("a").bullet("b")
                ).unordered_list(
                    "ul", lambda unordered_list: unordered_list.bullet("c")
                ),
            )
            == "section[s]{sub{H:s(head), OL:s(ol)[s(a);s(b)], UL:s(ul)[s(c)]}}"
        )

    def test_normalizes_documents_against_the_section_title_then_the_boundary(
        self,
    ) -> None:
        assert (
            render_subsection(
                create_spec(),
                lambda sub: sub.documents(
                    "files",
                    "b",
                    "File",
                    lambda document_list: document_list.document("x").document("y"),
                ),
            )
            == "section[s]{sub{H:s(head), DL:s(files)<b>b(s(File))[b(s(x));b(s(y))]}}"
        )

    def test_passes_the_document_list_boundary_through_unnormalized(self) -> None:
        render_section_document_list = Mock(return_value="")

        render_subsection(
            create_spec(render_section_document_list=render_section_document_list),
            lambda sub: sub.documents("files", "</b>", "File"),
        )

        render_section_document_list.assert_called_with(
            "s(files)",
            "</b>",
            "</b>(s(File))",
            [],
        )

    def test_calls_normalize_content_once_per_piece_of_content_per_enclosing_tag(
        self,
    ) -> None:
        normalize_content = Mock(side_effect=lambda _, text: text)

        render_subsection(
            create_spec(normalize_content=normalize_content),
            lambda sub: (
                sub.text("t")
                .unordered_list("ul", lambda unordered_list: unordered_list.bullet("a"))
                .documents(
                    "files",
                    "b",
                    "File",
                    lambda document_list: document_list.document("d"),
                )
            ),
        )

        assert normalize_content.call_args_list == [
            call("s", "head"),
            call("s", "t"),
            call("s", "ul"),
            call("s", "a"),
            call("s", "files"),
            call("s", "File"),
            call("b", "File"),
            call("s", "d"),
            call("b", "d"),
        ]

    def test_renders_content_as_is_when_the_spec_has_no_normalize_content(self) -> None:
        assert (
            render_subsection(
                create_spec(normalize_content=None),
                lambda sub: sub.text("</s>").documents(
                    "files",
                    "b",
                    "File",
                    lambda document_list: document_list.document("</b>"),
                ),
            )
            == "section[s]{sub{H:head, T:</s>, DL:files<b>File[</b>]}}"
        )

    def test_normalizes_at_render_time_so_later_spec_overrides_apply(self) -> None:
        renderer = PromptRenderer(create_spec()).section(
            "s",
            lambda section: section.subsection("head", lambda sub: sub.text("body")),
        )

        renderer.override_spec(normalize_content=lambda tag, text: f"[{tag}]{text}")

        assert renderer.render() == "section[s]{sub{H:[s]head, T:[s]body}}"

    def test_does_not_compound_normalization_across_repeated_renders(self) -> None:
        renderer = PromptRenderer(create_spec()).section(
            "s",
            lambda section: section.subsection("head", lambda sub: sub.text("body")),
        )

        assert renderer.render() == renderer.render()


class TestSpecOwnership:
    def test_does_not_mutate_the_spec_passed_to_the_constructor(self) -> None:
        spec = create_spec()
        original_render_section_text = spec.render_section_text

        PromptRenderer(spec).override_spec(render_section_text=lambda _: "x")

        assert spec.render_section_text is original_render_section_text

    def test_does_not_share_overrides_between_renderers_built_from_the_same_spec(
        self,
    ) -> None:
        spec = create_spec()
        overridden = PromptRenderer(spec)
        untouched = PromptRenderer(spec)

        overridden.override_spec(render_section_text=lambda text: f"X:{text}")

        def build(renderer: PromptRenderer) -> str:
            return renderer.section(
                "s",
                lambda section: section.subsection(
                    "head", lambda sub: sub.text("body")
                ),
            ).render()

        assert build(overridden) == "section[s]{sub{H:s(head), X:s(body)}}"
        assert build(untouched) == "section[s]{sub{H:s(head), T:s(body)}}"

    def test_rejects_overrides_for_unknown_render_methods(self) -> None:
        renderer = PromptRenderer(create_spec())

        with pytest.raises(AttributeError):
            renderer.override_spec(render_paragraph=lambda text: text)  # type: ignore[call-arg]


class TestBuilder:
    def test_renders_an_empty_prompt(self) -> None:
        assert PromptRenderer(create_spec()).render() == ""

    def test_allows_sections_subsections_and_lists_without_build_callbacks(
        self,
    ) -> None:
        renderer = PromptRenderer(create_spec())

        renderer.section("empty")

        subsection = renderer.section("s").subsection("head")
        subsection.ordered_list("ol")
        subsection.unordered_list("ul")
        subsection.documents("d", "b", "D")

        assert renderer.render() == (
            "section[empty]{} | "
            "section[s]{sub{H:s(head), OL:s(ol)[], UL:s(ul)[], DL:s(d)<b>b(s(D))[]}}"
        )

    def test_returns_the_same_instance_from_every_builder_method_given_a_callback(
        self,
    ) -> None:
        renderer = PromptRenderer(create_spec())

        def build_ordered_list(ordered_list: SectionOrderedList) -> None:
            assert ordered_list.bullet("b") is ordered_list

        def build_document_list(document_list: SectionDocumentList) -> None:
            assert document_list.document("doc") is document_list

        def build_subsection(sub: PromptSubsection) -> None:
            assert sub.text("t") is sub
            assert sub.subheader("sh") is sub
            assert sub.ordered_list("ol", build_ordered_list) is sub
            assert sub.unordered_list("ul", lambda _: None) is sub
            assert sub.documents("d", "b", "D", build_document_list) is sub

        def build_section(section: PromptSection) -> None:
            assert section.subsection("h", build_subsection) is section

        assert renderer.section("s", build_section) is renderer

    def test_returns_the_created_node_from_every_builder_method_without_a_callback(
        self,
    ) -> None:
        renderer = PromptRenderer(create_spec())

        section = renderer.section("s")
        subsection = section.subsection("h")

        assert isinstance(section, PromptSection)
        assert isinstance(subsection, PromptSubsection)
        assert isinstance(subsection.ordered_list("ol"), SectionOrderedList)
        assert isinstance(subsection.unordered_list("ul"), SectionUnorderedList)
        assert isinstance(subsection.documents("d", "b", "D"), SectionDocumentList)

    def test_builds_the_same_prompt_with_context_managers_and_callbacks(self) -> None:
        spec = create_spec(normalize_content=None)

        with_callbacks = PromptRenderer(spec).section(
            "s",
            lambda section: section.subsection(
                "head",
                lambda sub: (
                    sub.text("t")
                    .ordered_list("ol", lambda ordered_list: ordered_list.bullet("a"))
                    .documents(
                        "d", "b", "D", lambda document_list: document_list.document("x")
                    )
                ),
            ),
        )

        with_context_managers = PromptRenderer(spec)

        with (
            with_context_managers.section("s") as section,
            section.subsection("head") as sub,
        ):
            sub.text("t")

            with sub.ordered_list("ol") as ordered_list:
                ordered_list.bullet("a")

            with sub.documents("d", "b", "D") as document_list:
                document_list.document("x")

        assert with_context_managers.render() == with_callbacks.render()

    def test_preserves_insertion_order_of_sections_and_children(self) -> None:
        assert (
            PromptRenderer(create_spec(normalize_content=None))
            .section(
                "a",
                lambda section: section.subsection(
                    "1", lambda sub: sub.text("x").text("y")
                ).subsection("2"),
            )
            .section("b", lambda _: None)
            .render()
            == "section[a]{sub{H:1, T:x, T:y}, sub{H:2}} | section[b]{}"
        )
