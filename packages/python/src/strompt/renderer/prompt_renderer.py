from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import replace
from typing import Self, Unpack, overload

from .types import PromptNode, PromptRendererSpec, PromptRendererSpecOverrides


def _normalize_content(spec: PromptRendererSpec, tag_name: str, text: str) -> str:
    if spec.normalize_content is None:
        return text

    return spec.normalize_content(tag_name, text)


class _Builder:
    """Allows a builder to be populated within a `with` block"""

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc_info: object) -> None:
        return None


class _SectionHeader:
    def __init__(self, spec: PromptRendererSpec, section_title: str, text: str) -> None:
        self._spec = spec
        self._section_title = section_title
        self._text = text

    def render(self) -> str:
        return self._spec.render_section_header(
            _normalize_content(self._spec, self._section_title, self._text)
        )


class _SectionSubheader:
    def __init__(self, spec: PromptRendererSpec, section_title: str, text: str) -> None:
        self._spec = spec
        self._section_title = section_title
        self._text = text

    def render(self) -> str:
        return self._spec.render_section_subheader(
            _normalize_content(self._spec, self._section_title, self._text)
        )


class _SectionText:
    def __init__(self, spec: PromptRendererSpec, section_title: str, text: str) -> None:
        self._spec = spec
        self._section_title = section_title
        self._text = text

    def render(self) -> str:
        return self._spec.render_section_text(
            _normalize_content(self._spec, self._section_title, self._text)
        )


class _SectionList(_Builder, ABC):
    def __init__(
        self, spec: PromptRendererSpec, section_title: str, title: str
    ) -> None:
        self._spec = spec
        self._section_title = section_title
        self._title = title
        self._bullets: list[str] = []

    def bullet(self, text: str) -> Self:
        """Adds a bullet point to this list

        Args:
            text: bullet content

        Returns:
            The current instance
        """
        self._bullets.append(text)

        return self

    def _normalized_title(self) -> str:
        return _normalize_content(self._spec, self._section_title, self._title)

    def _normalized_bullets(self) -> list[str]:
        return [
            _normalize_content(self._spec, self._section_title, bullet)
            for bullet in self._bullets
        ]

    @abstractmethod
    def render(self) -> str: ...


class SectionOrderedList(_SectionList):
    def render(self) -> str:
        return self._spec.render_section_ordered_list(
            self._normalized_title(),
            self._normalized_bullets(),
        )


class SectionUnorderedList(_SectionList):
    def render(self) -> str:
        return self._spec.render_section_unordered_list(
            self._normalized_title(),
            self._normalized_bullets(),
        )


class SectionDocumentList(_Builder):
    def __init__(
        self,
        spec: PromptRendererSpec,
        section_title: str,
        title: str,
        boundary: str,
        document_type: str,
    ) -> None:
        self._spec = spec
        self._section_title = section_title
        self._title = title
        self._boundary = boundary
        self._document_type = document_type
        self._documents: list[str] = []

    def document(self, text: str) -> Self:
        """Adds a document to this document list

        Args:
            text: the stringified document

        Returns:
            The current `SectionDocumentList` instance
        """
        self._documents.append(text)

        return self

    def _normalize_document_content(self, text: str) -> str:
        return _normalize_content(
            self._spec,
            self._boundary,
            _normalize_content(self._spec, self._section_title, text),
        )

    def render(self) -> str:
        return self._spec.render_section_document_list(
            _normalize_content(self._spec, self._section_title, self._title),
            self._boundary,
            self._normalize_document_content(self._document_type),
            [
                self._normalize_document_content(document)
                for document in self._documents
            ],
        )


class PromptSubsection(_Builder):
    def __init__(
        self, spec: PromptRendererSpec, section_title: str, header: str
    ) -> None:
        self._spec = spec
        self._section_title = section_title
        self._children: list[PromptNode] = [
            _SectionHeader(self._spec, self._section_title, header)
        ]

    def subheader(self, text: str) -> Self:
        """Adds a subheader to this subsection

        Args:
            text: subheader text content

        Returns:
            The current `PromptSubsection` instance
        """
        self._children.append(_SectionSubheader(self._spec, self._section_title, text))

        return self

    def text(self, text: str) -> Self:
        """Adds text to this subsection

        Args:
            text: text content

        Returns:
            The current `PromptSubsection` instance
        """
        self._children.append(_SectionText(self._spec, self._section_title, text))

        return self

    @overload
    def ordered_list(self, title: str) -> SectionOrderedList: ...

    @overload
    def ordered_list(
        self, title: str, build_ordered_list: Callable[[SectionOrderedList], object]
    ) -> Self: ...

    def ordered_list(
        self,
        title: str,
        build_ordered_list: Callable[[SectionOrderedList], object] | None = None,
    ) -> SectionOrderedList | Self:
        """Adds an ordered list to this subsection

        Args:
            title: list title
            build_ordered_list: optionally, a callback that runs on the created ordered
                list to add bullets

        Returns:
            The current `PromptSubsection` instance if `build_ordered_list` is given,
            otherwise the created ordered list
        """
        ordered_list = SectionOrderedList(self._spec, self._section_title, title)
        self._children.append(ordered_list)

        if build_ordered_list is None:
            return ordered_list

        build_ordered_list(ordered_list)

        return self

    @overload
    def unordered_list(self, title: str) -> SectionUnorderedList: ...

    @overload
    def unordered_list(
        self, title: str, build_unordered_list: Callable[[SectionUnorderedList], object]
    ) -> Self: ...

    def unordered_list(
        self,
        title: str,
        build_unordered_list: Callable[[SectionUnorderedList], object] | None = None,
    ) -> SectionUnorderedList | Self:
        """Adds an unordered list to this subsection

        Args:
            title: list title
            build_unordered_list: optionally, a callback that runs on the created
                unordered list to add bullets

        Returns:
            The current `PromptSubsection` instance if `build_unordered_list` is given,
            otherwise the created unordered list
        """
        unordered_list = SectionUnorderedList(self._spec, self._section_title, title)
        self._children.append(unordered_list)

        if build_unordered_list is None:
            return unordered_list

        build_unordered_list(unordered_list)

        return self

    @overload
    def documents(
        self, title: str, boundary: str, document_type: str
    ) -> SectionDocumentList: ...

    @overload
    def documents(
        self,
        title: str,
        boundary: str,
        document_type: str,
        build_document_list: Callable[[SectionDocumentList], object],
    ) -> Self: ...

    def documents(
        self,
        title: str,
        boundary: str,
        document_type: str,
        build_document_list: Callable[[SectionDocumentList], object] | None = None,
    ) -> SectionDocumentList | Self:
        """Adds a document list to this subsection

        Args:
            title: list title
            boundary: boundary string to mark list start and end
            document_type: type of document being listed
            build_document_list: optionally, a callback that runs on the newly created
                document list to add documents

        Returns:
            The current `PromptSubsection` instance if `build_document_list` is given,
            otherwise the created document list
        """
        document_list = SectionDocumentList(
            self._spec,
            self._section_title,
            title,
            boundary,
            document_type,
        )
        self._children.append(document_list)

        if build_document_list is None:
            return document_list

        build_document_list(document_list)

        return self

    def render(self) -> str:
        return self._spec.render_subsection(
            [child.render() for child in self._children]
        )


class PromptSection(_Builder):
    def __init__(self, spec: PromptRendererSpec, title: str) -> None:
        self._spec = spec
        self._title = title
        self._children: list[PromptNode] = []

    @overload
    def subsection(self, header: str) -> PromptSubsection: ...

    @overload
    def subsection(
        self, header: str, build_subsection: Callable[[PromptSubsection], object]
    ) -> Self: ...

    def subsection(
        self,
        header: str,
        build_subsection: Callable[[PromptSubsection], object] | None = None,
    ) -> PromptSubsection | Self:
        """Creates a subsection within this `PromptSection`

        Args:
            header: subsection title
            build_subsection: optionally, a callback that runs on the created subsection
                to add subnodes

        Returns:
            The current `PromptSection` instance if `build_subsection` is given,
            otherwise the created subsection
        """
        subsection = PromptSubsection(self._spec, self._title, header)
        self._children.append(subsection)

        if build_subsection is None:
            return subsection

        build_subsection(subsection)

        return self

    def render(self) -> str:
        return self._spec.render_section(
            self._title,
            [child.render() for child in self._children],
        )


class PromptRenderer:
    def __init__(self, spec: PromptRendererSpec) -> None:
        """Initializes a new `PromptRenderer` instance

        Args:
            spec: a `PromptRendererSpec` instance that specifies rendering methods for
                every `PromptNode`
        """
        self._spec = replace(spec)
        self._children: list[PromptNode] = []

    @overload
    def section(self, name: str) -> PromptSection: ...

    @overload
    def section(
        self, name: str, build_section: Callable[[PromptSection], object]
    ) -> Self: ...

    def section(
        self,
        name: str,
        build_section: Callable[[PromptSection], object] | None = None,
    ) -> PromptSection | Self:
        """Adds a new prompt section

        Args:
            name: the name of the section
            build_section: optionally, a callback that runs on the created section to
                add subnodes

        Returns:
            The current `PromptRenderer` instance if `build_section` is given, otherwise
            the created section
        """
        section = PromptSection(self._spec, name)
        self._children.append(section)

        if build_section is None:
            return section

        build_section(section)

        return self

    def render(self) -> str:
        """Renders the prompt tree for this renderer instance

        Returns:
            The rendered prompt, as a string
        """
        return self._spec.render_prompt([child.render() for child in self._children])

    def override_spec(
        self, **overridden_spec: Unpack[PromptRendererSpecOverrides]
    ) -> None:
        """Overrides rendering logic for this renderer instance

        Args:
            **overridden_spec: rendering methods of a `PromptRendererSpec` to override
        """
        for name, render_method in overridden_spec.items():
            setattr(self._spec, name, render_method)
