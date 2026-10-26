from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol, TypedDict


class PromptNode(Protocol):
    def render(self) -> str:
        """Renders this prompt node's prompt tree as a string

        Returns:
            The rendered prompt tree, as a string
        """
        ...


@dataclass(slots=True)
class PromptRendererSpec:
    """Rendering methods for every `PromptNode`

    Attributes:
        render_prompt: Renders the root prompt node, given a list of all rendered sub
            nodes of the root node
        render_section: Renders a prompt section, given the section title and a list of
            all rendered sub nodes of the section
        render_subsection: Renders a prompt subsection, given a list of all rendered sub
            nodes of the subsection
        render_section_header: Renders a section header, given its text content
        render_section_subheader: Renders a section subheader, given its text content
        render_section_text: Renders section text, given its text content
        render_section_ordered_list: Renders an ordered list, given the list title and
            chronologically ordered list bullets
        render_section_unordered_list: Renders an unordered list, given the list title
            and chronologically ordered list bullets
        render_section_document_list: Renders a list of documents, given the list title,
            the boundary string marking the list start and end, the type of document
            being listed, and a chronologically ordered list of documents
        normalize_content: Normalizes content that would conflict with an enclosing
            boundary tag, given the name of the enclosing section title or document list
            boundary and the content to normalize. Called on every `PromptNode` during
            rendering
    """

    render_prompt: Callable[[list[str]], str]
    render_section: Callable[[str, list[str]], str]
    render_subsection: Callable[[list[str]], str]
    render_section_header: Callable[[str], str]
    render_section_subheader: Callable[[str], str]
    render_section_text: Callable[[str], str]
    render_section_ordered_list: Callable[[str, list[str]], str]
    render_section_unordered_list: Callable[[str, list[str]], str]
    render_section_document_list: Callable[[str, str, str, list[str]], str]
    normalize_content: Callable[[str, str], str] | None = None


class PromptRendererSpecOverrides(TypedDict, total=False):
    """A partial `PromptRendererSpec`, consisting of rendering methods to override"""

    render_prompt: Callable[[list[str]], str]
    render_section: Callable[[str, list[str]], str]
    render_subsection: Callable[[list[str]], str]
    render_section_header: Callable[[str], str]
    render_section_subheader: Callable[[str], str]
    render_section_text: Callable[[str], str]
    render_section_ordered_list: Callable[[str, list[str]], str]
    render_section_unordered_list: Callable[[str, list[str]], str]
    render_section_document_list: Callable[[str, str, str, list[str]], str]
    normalize_content: Callable[[str, str], str] | None
