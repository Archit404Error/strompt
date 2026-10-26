from hypothesis import assume, given, settings
from hypothesis import strategies as st

from strompt import MarkdownPromptRenderer
from strompt.renderer.markdown_renderer import markdown_renderer_spec

JS_WHITESPACE = frozenset(
    "\t\n\v\f\r \u00a0\u1680\u2028\u2029\u202f\u205f\u3000\ufeff"
    + "".join(chr(code_point) for code_point in range(0x2000, 0x200B))
)


def normalize(tag_name: str, text: str) -> str:
    assert markdown_renderer_spec.normalize_content is not None

    return markdown_renderer_spec.normalize_content(tag_name, text)


def ascii_lower(text: str) -> str:
    return "".join(char.lower() if "A" <= char <= "Z" else char for char in text)


def is_whitespace(text: str, idx: int) -> bool:
    return idx < len(text) and text[idx] in JS_WHITESPACE


def count_conflicting_tags(text: str, tag_name: str) -> int:
    """Independent oracle for the normalization regex: counts every `<` that begins a
    tag an LLM could read as `tag_name` (case-insensitive, optional whitespace and
    slash, followed by whitespace, `/`, `>`, or the end of the text)
    """
    haystack = ascii_lower(text)
    name = ascii_lower(tag_name)
    count = 0

    for i, char in enumerate(haystack):
        if char != "<":
            continue

        j = i + 1
        while is_whitespace(haystack, j):
            j += 1
        if haystack.startswith("/", j):
            j += 1
        while is_whitespace(haystack, j):
            j += 1

        if not haystack.startswith(name, j):
            continue

        end = j + len(name)
        if (
            end == len(haystack)
            or is_whitespace(haystack, end)
            or haystack[end] in "/>"
        ):
            count += 1

    return count


def ends_with_dangling_tag_start(text: str) -> bool:
    stripped = text.rstrip("".join(JS_WHITESPACE))

    if stripped.endswith("/"):
        stripped = stripped[:-1].rstrip("".join(JS_WHITESPACE))

    return stripped.endswith("<")


def decode_entities(text: str) -> str:
    return text.replace("&lt;", "<").replace("&gt;", ">")


tag_names = st.from_regex(r"[a-zA-Z][a-zA-Z0-9._+-]{0,7}", fullmatch=True)


def case_variants(tag_name: str) -> st.SearchStrategy[str]:
    return st.lists(st.booleans(), min_size=len(tag_name), max_size=len(tag_name)).map(
        lambda flips: "".join(
            char.upper() if flip else char.lower()
            for char, flip in zip(tag_name, flips, strict=True)
        )
    )


def injections(tag_name: str) -> st.SearchStrategy[str]:
    return st.tuples(
        st.sampled_from(["", " ", "\n", "\t"]),
        st.sampled_from(["", "/"]),
        st.sampled_from(["", " "]),
        case_variants(tag_name),
        st.sampled_from(["", " ", "/", " /", ' id="x"', "\n", " a=b"]),
    ).map(lambda parts: f"<{''.join(parts)}>")


def adversarial_texts(tag_name: str) -> st.SearchStrategy[str]:
    return st.lists(
        st.one_of(
            st.text(),
            injections(tag_name),
            st.sampled_from(["<", ">", "</", "/>", f"<{tag_name}", f"{tag_name}>"]),
        ),
        max_size=12,
    ).map("".join)


tags_and_texts = tag_names.flatmap(
    lambda tag_name: st.tuples(st.just(tag_name), adversarial_texts(tag_name))
)


class TestNormalizeContentProperties:
    @settings(max_examples=1000)
    @given(tags_and_texts)
    def test_never_leaves_a_conflicting_tag(
        self, tag_and_text: tuple[str, str]
    ) -> None:
        tag_name, text = tag_and_text

        assert count_conflicting_tags(normalize(tag_name, text), tag_name) == 0

    @settings(max_examples=1000)
    @given(tag_names, st.text())
    def test_leaves_text_without_conflicting_tags_unchanged(
        self, tag_name: str, text: str
    ) -> None:
        assume(count_conflicting_tags(text, tag_name) == 0)
        assume(not ends_with_dangling_tag_start(text))

        assert normalize(tag_name, text) == text

    @given(tags_and_texts)
    def test_is_idempotent(self, tag_and_text: tuple[str, str]) -> None:
        tag_name, text = tag_and_text
        once = normalize(tag_name, text)

        assert normalize(tag_name, once) == once

    @given(tags_and_texts)
    def test_is_reversible_by_decoding_entities(
        self, tag_and_text: tuple[str, str]
    ) -> None:
        tag_name, text = tag_and_text

        assume("&lt;" not in text and "&gt;" not in text)

        assert decode_entities(normalize(tag_name, text)) == text


class TestMarkdownPromptRendererInjectionProperties:
    @settings(max_examples=500)
    @given(tags_and_texts)
    def test_keeps_exactly_one_pair_of_section_boundary_tags(
        self, title_and_text: tuple[str, str]
    ) -> None:
        title, text = title_and_text

        renderer = MarkdownPromptRenderer()
        with renderer.section(title) as section, section.subsection(text) as sub:
            sub.text(text)
            sub.unordered_list(text, lambda unordered_list: unordered_list.bullet(text))

        rendered = renderer.render()

        assert rendered.startswith(f"<{title}>\n")
        assert rendered.endswith(f"\n</{title}>")
        assert count_conflicting_tags(rendered, title) == 2

    @settings(max_examples=500)
    @given(
        st.tuples(tag_names, tag_names).flatmap(
            lambda tags: st.tuples(
                st.just(tags[0]),
                st.just(tags[1]),
                st.lists(
                    st.one_of(adversarial_texts(tags[0]), adversarial_texts(tags[1])),
                    max_size=4,
                ),
            )
        )
    )
    def test_keeps_exactly_one_pair_of_tags_for_both_the_section_and_document_list(
        self, title_boundary_and_documents: tuple[str, str, list[str]]
    ) -> None:
        title, boundary, documents = title_boundary_and_documents

        renderer = MarkdownPromptRenderer()
        with (
            renderer.section(title) as section,
            section.subsection("Inputs") as sub,
            sub.documents("Files", boundary, "File") as document_list,
        ):
            for document in documents:
                document_list.document(document)

        rendered = renderer.render()
        same_tag = ascii_lower(title) == ascii_lower(boundary)

        assert count_conflicting_tags(rendered, title) == (4 if same_tag else 2)
        assert count_conflicting_tags(rendered, boundary) == (4 if same_tag else 2)

    @given(tags_and_texts)
    def test_preserves_the_users_text_once_entities_are_decoded(
        self, title_and_text: tuple[str, str]
    ) -> None:
        title, text = title_and_text

        assume("&lt;" not in text and "&gt;" not in text)

        prefix = f"<{title}>\n# Inputs\n"
        suffix = f"\n</{title}>"
        rendered = (
            MarkdownPromptRenderer()
            .section(
                title,
                lambda section: section.subsection(
                    "Inputs", lambda sub: sub.text(text)
                ),
            )
            .render()
        )

        assert decode_entities(rendered[len(prefix) : -len(suffix)]) == text
