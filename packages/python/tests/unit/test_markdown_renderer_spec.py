from strompt.renderer.markdown_renderer import markdown_renderer_spec as spec


def test_render_prompt_separates_sections_with_a_blank_line() -> None:
    assert spec.render_prompt(["a", "b", "c"]) == "a\n\nb\n\nc"


def test_render_prompt_renders_an_empty_prompt_as_an_empty_string() -> None:
    assert spec.render_prompt([]) == ""


def test_render_section_wraps_subnodes_in_tags_named_after_the_title() -> None:
    assert spec.render_section("task", ["one", "two"]) == "<task>\none\n\ntwo\n</task>"


def test_render_section_renders_an_empty_section() -> None:
    assert spec.render_section("task", []) == "<task>\n\n</task>"


def test_render_subsection_joins_subnodes_with_newlines() -> None:
    assert spec.render_subsection(["# h", "text"]) == "# h\ntext"


def test_renders_headers_and_subheaders_as_markdown_headings() -> None:
    assert spec.render_section_header("Title") == "# Title"
    assert spec.render_section_subheader("Sub") == "## Sub"


def test_render_section_text_returns_text_as_is() -> None:
    assert spec.render_section_text("hello\nworld") == "hello\nworld"


def test_render_section_ordered_list_numbers_bullets_from_1() -> None:
    assert (
        spec.render_section_ordered_list("Steps", ["a", "b", "c"])
        == "Steps:\n1. a\n2. b\n3. c"
    )


def test_render_section_unordered_list_prefixes_bullets_with_dashes() -> None:
    assert spec.render_section_unordered_list("Notes", ["a", "b"]) == "Notes:\n- a\n- b"


def test_render_section_document_list_labels_and_wraps_documents_in_the_boundary() -> (
    None
):
    assert (
        spec.render_section_document_list("Files", "files", "File", ["x", "y"])
        == "Files:\n<files>\n[File 1]\nx\n\n[File 2]\ny\n</files>"
    )


def test_render_section_document_list_renders_an_empty_list() -> None:
    assert (
        spec.render_section_document_list("Files", "files", "File", [])
        == "Files:\n<files>\n\n</files>"
    )


def test_does_not_normalize_content_itself() -> None:
    assert spec.render_section_text("</task>") == "</task>"
    assert spec.render_section("task", ["</task>"]) == "<task>\n</task>\n</task>"
