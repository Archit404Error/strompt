from strompt import MarkdownPromptRenderer


def build_task_prompt(
    renderer: MarkdownPromptRenderer, text: str
) -> MarkdownPromptRenderer:
    return renderer.section(
        "task", lambda section: section.subsection("Inputs", lambda sub: sub.text(text))
    )


def test_can_replace_the_normalization_strategy() -> None:
    renderer = MarkdownPromptRenderer()
    renderer.override_spec(
        normalize_content=lambda tag_name, text: text.replace(
            f"</{tag_name}>", f"[/{tag_name}]"
        )
    )

    assert (
        build_task_prompt(renderer, "</task> hi").render()
        == "<task>\n# Inputs\n[/task] hi\n</task>"
    )


def test_can_disable_normalization() -> None:
    renderer = MarkdownPromptRenderer()
    renderer.override_spec(normalize_content=lambda _, text: text)

    assert (
        build_task_prompt(renderer, "</task> hi").render()
        == "<task>\n# Inputs\n</task> hi\n</task>"
    )


def test_passes_already_normalized_content_to_overridden_render_methods() -> None:
    received: list[str] = []

    def render_section_text(text: str) -> str:
        received.append(text)

        return text.upper()

    renderer = MarkdownPromptRenderer()
    renderer.override_spec(render_section_text=render_section_text)

    assert (
        build_task_prompt(renderer, "</task> hi").render()
        == "<task>\n# Inputs\n&LT;/TASK&GT; HI\n</task>"
    )
    assert received == ["&lt;/task&gt; hi"]


def test_does_not_leak_overrides_into_other_instances() -> None:
    existing = build_task_prompt(MarkdownPromptRenderer(), "hi")

    MarkdownPromptRenderer().override_spec(
        render_section_text=lambda text: f"OVERRIDDEN {text}"
    )

    expected = "<task>\n# Inputs\nhi\n</task>"
    assert existing.render() == expected
    assert build_task_prompt(MarkdownPromptRenderer(), "hi").render() == expected


def test_applies_overrides_to_sections_built_before_the_override() -> None:
    renderer = build_task_prompt(MarkdownPromptRenderer(), "hi")

    renderer.override_spec(render_section_text=lambda text: f"OVERRIDDEN {text}")

    assert renderer.render() == "<task>\n# Inputs\nOVERRIDDEN hi\n</task>"
