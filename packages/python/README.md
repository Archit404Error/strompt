# Strompt

## Introduction

Strompt (***str***uctured pr***ompt***s) is an opinionated, extensible, zero-dependency **prompt rendering** library. Strompt is designed to enable the construction of consistent, reusable prompts in agentic applications.

The goal of Strompt is to create prompts that are readable (easy to debug), correct (typo-free), and maintainable.

This is the Python port of Strompt. A JavaScript/TypeScript version with identical rendering is available on npm at [`@4arch/strompt`](https://www.npmjs.com/package/@4arch/strompt).

## Installation

The library can be installed directly from PyPI at `strompt` with any Python package manager, examples for pip and uv are provided below:

```bash
pip install strompt # pip installation
```

or

```bash
uv add strompt # uv installation
```

Strompt supports Python 3.11 and above.

## Usage

Consider the following prompt:

```python
def generate_refund_prompts(user_info: list[str], user_prompt: str) -> tuple[str, str]:
    system_prompt = """You are a customer support agent working at ACME designed to review refund requests and determine whether they are valid or invalid. Your aim is to create the best possible customer experience while also ensuring that fraudulent or unqualified refund requests are not granted. You respond in a tone that is formal and polite but not utterly deferential to the user.

To make your decision, you will be provided with the customer's refund request and a list of statistics about the customer, such as how long their account has existed and how many prior purchases they have completed.

Your output should be the amount of money to refund the user given their request. Adhere to the following rules:
1. Output ONLY the refund amount and nothing else
2. The refund amount should be expressed in USD cents, so if a $1.50 refund should be granted the output should be 150
3. If no refund should be granted, simply output 0
4. Accounts that have no successful prior purchases or have only been active for a short period of time are more likely to be fraudulent, so be extra careful when evaluating refund requests from such accounts
5. Use your available tools to double check a user's refund request reasoning (ex. if the user claims the package was delivered late, use your package lookup tool to confirm this is accurate)."""

    prompt = f"User refund request: {user_prompt}\nUser Background Info: {','.join(user_info)}"

    return system_prompt, prompt
```

These prompts are blocks of text, and are thus fairly difficult to read and maintain. Moreover, it's easy to make typos like messing up the numbering of the output instructions in the process of adding/editing bullets. It is also hard to see whitespace, such as the `\n` separating the sections of the prompt.

In Strompt, the prompt is much cleaner to read and maintain:

```python
from strompt import MarkdownPromptRenderer


def generate_refund_prompts(user_info: list[str], user_prompt: str) -> tuple[str, str]:
    system_prompt = MarkdownPromptRenderer()

    with system_prompt.section("personality") as personality:
        with personality.subsection("Background") as background:
            background.text(
                "You are a customer support agent working at ACME designed to review refund "
                "requests and determine whether they are valid or invalid. You respond in a "
                "tone that is formal and polite but not utterly deferential to the user."
            )

    with system_prompt.section("task") as task:
        with task.subsection("Description") as description:
            description.text(
                "Your aim is to create the best possible customer experience while also "
                "ensuring that fraudulent or unqualified refund requests are not granted."
            )

        with task.subsection("Output") as output:
            output.text(
                "Your output should be the amount of money to refund the user given their "
                "request."
            )

        with task.subsection("Guidelines") as guidelines:
            with guidelines.ordered_list("Adhere to the following rules") as rules:
                rules.bullet("Output ONLY the refund amount and nothing else")
                rules.bullet(
                    "The refund amount should be expressed in USD cents, so if a $1.50 "
                    "refund should be granted the output should be 150"
                )
                rules.bullet("If no refund should be granted, simply output 0")
                rules.bullet(
                    "Accounts that have no successful prior purchases or have only been "
                    "active for a short period of time are more likely to be fraudulent, so "
                    "be extra careful when evaluating refund requests from such accounts"
                )
                rules.bullet(
                    "Use your available tools to double check a user's refund request "
                    "reasoning (ex. if the user claims the package was delivered late, use "
                    "your package lookup tool to confirm this is accurate)."
                )

    prompt = MarkdownPromptRenderer()

    with prompt.section("user request") as request:
        request.subsection("Refund Request", lambda sub: sub.text(user_prompt))
        request.subsection(
            "User Background Info", lambda sub: sub.text(",".join(user_info))
        )

    return system_prompt.render(), prompt.render()
```

As can be seen, Strompt uses the **_Fluid Builder_** design pattern to sequentially construct prompts. Every builder method can be used in one of two ways:

- Without a callback, it returns the node it created, which can be populated within a `with` block
- With a callback, it runs the callback on the node it created and returns the parent, so that calls can be chained

The prompt is now much easer to read, as we can quickly jump to the sections we are looking for simply by glancing at the relevant section headers.

Calling `.render()` also automatically applies markdown styling and list numbering, the output of the prompts above is:

System Prompt

```
<personality>
# Background
You are a customer support agent working at ACME designed to review refund requests and determine whether they are valid or invalid. You respond in a tone that is formal and polite but not utterly deferential to the user.
</personality>

<task>
# Description
Your aim is to create the best possible customer experience while also ensuring that fraudulent or unqualified refund requests are not granted.

# Output
Your output should be the amount of money to refund the user given their request.

# Guidelines
Adhere to the following rules:
1. Output ONLY the refund amount and nothing else
2. The refund amount should be expressed in USD cents, so if a $1.50 refund should be granted the output should be 150
3. If no refund should be granted, simply output 0
4. Accounts that have no successful prior purchases or have only been active for a short period of time are more likely to be fraudulent, so be extra careful when evaluating refund requests from such accounts
5. Use your available tools to double check a user's refund request reasoning (ex. if the user claims the package was delivered late, use your package lookup tool to confirm this is accurate).
</task>
```

Prompt:

```
<user request>
# Refund Request
{refund request}

# User Background Info
{background info}
</user request>
```

## Extensibility

Strompt is designed to be fully extensible, enabling you to override or even define your own Prompt Renderers.

Currently, the only implemented renderer is `MarkdownPromptRenderer`, which renders prompts in Markdown.

To build a custom renderer for specific nodes, you can override the prompt renderer's rendering strategy using the `override_spec` method:

```python
from strompt import MarkdownPromptRenderer

custom_renderer = MarkdownPromptRenderer()
custom_renderer.override_spec(
    # Render all .text() nodes in uppercase
    render_section_text=lambda text: text.upper(),
)
```

You can also define a new renderer from scratch simply by subclassing the `PromptRenderer` base class and passing a complete `PromptRendererSpec` to the super constructor.
