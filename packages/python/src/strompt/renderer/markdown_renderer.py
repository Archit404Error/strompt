import re

from .prompt_renderer import PromptRenderer
from .types import PromptRendererSpec

# The characters matched by JavaScript's `\s`, which differ from Python's `\s`, so that
# both ports of Strompt escape identical content
_WHITESPACE = "\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"

# A trailing `<` could combine with the start of the next rendered node to form a
# conflicting tag, so it is escaped regardless of `tag_name`
_DANGLING_TAG_START = re.compile(rf"<([{_WHITESPACE}]*/?[{_WHITESPACE}]*)\Z")


def _fold_case(text: str) -> str:
    """Folds the case of every character in a given string, so that two strings match
    case-insensitively exactly when they would in a JavaScript regex with the `i` flag

    Args:
        text: string to fold

    Returns:
        case-folded string, with the same length as `text`
    """
    folded = []

    for char in text:
        upper = char.upper()

        # JavaScript folds UTF-16 code units, so it never folds characters outside the
        # BMP, multi-character uppercase forms, or non-ASCII characters onto ASCII ones
        keeps_case = (
            ord(char) > 0xFFFF
            or len(upper) != 1
            or (ord(char) >= 128 and ord(upper) < 128)
        )

        folded.append(char if keeps_case else upper)

    return "".join(folded)


def _escape_tag(tag: str) -> str:
    return tag.replace("<", "&lt;").replace(">", "&gt;")


def _render_prompt(rendered_sub_nodes: list[str]) -> str:
    return "\n\n".join(rendered_sub_nodes)


def _render_section(title: str, rendered_sub_nodes: list[str]) -> str:
    return f"<{title}>\n" + "\n\n".join(rendered_sub_nodes) + f"\n</{title}>"


def _render_subsection(rendered_sub_nodes: list[str]) -> str:
    return "\n".join(rendered_sub_nodes)


def _render_section_header(text: str) -> str:
    return f"# {text}"


def _render_section_subheader(text: str) -> str:
    return f"## {text}"


def _render_section_text(text: str) -> str:
    return text


def _render_section_document_list(
    title: str, boundary: str, document_type: str, documents: list[str]
) -> str:
    rendered_documents = "\n\n".join(
        f"[{document_type} {idx}]\n{document}"
        for idx, document in enumerate(documents, start=1)
    )

    return f"{title}:\n<{boundary}>\n{rendered_documents}\n</{boundary}>"


def _render_section_ordered_list(title: str, bullets: list[str]) -> str:
    rendered_bullets = "\n".join(
        f"{idx}. {bullet}" for idx, bullet in enumerate(bullets, start=1)
    )

    return f"{title}:\n{rendered_bullets}"


def _render_section_unordered_list(title: str, bullets: list[str]) -> str:
    rendered_bullets = "\n".join(f"- {bullet}" for bullet in bullets)

    return f"{title}:\n{rendered_bullets}"


def _normalize_content(tag_name: str, text: str) -> str:
    if not tag_name:
        return text

    # Matches opening, closing, and self-closing tags for exactly `tag_name`, tolerating
    # case differences, inner whitespace, and attributes. Unterminated tags also match,
    # since a later boundary tag's `>` could close them
    conflicting_tag = re.compile(
        rf"<[{_WHITESPACE}]*/?[{_WHITESPACE}]*{re.escape(_fold_case(tag_name))}"
        rf"(?=[{_WHITESPACE}/>]|\Z)[^<>]*>?"
    )

    normalized = []
    end = 0

    for match in conflicting_tag.finditer(_fold_case(text)):
        normalized.append(text[end : match.start()])
        normalized.append(_escape_tag(text[match.start() : match.end()]))
        end = match.end()

    normalized.append(text[end:])

    return _DANGLING_TAG_START.sub(r"&lt;\1", "".join(normalized), count=1)


markdown_renderer_spec = PromptRendererSpec(
    render_prompt=_render_prompt,
    render_section=_render_section,
    render_subsection=_render_subsection,
    render_section_header=_render_section_header,
    render_section_subheader=_render_section_subheader,
    render_section_text=_render_section_text,
    render_section_document_list=_render_section_document_list,
    render_section_ordered_list=_render_section_ordered_list,
    render_section_unordered_list=_render_section_unordered_list,
    normalize_content=_normalize_content,
)


class MarkdownPromptRenderer(PromptRenderer):
    def __init__(self) -> None:
        super().__init__(markdown_renderer_spec)
