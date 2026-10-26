# Strompt

## Introduction

Strompt (***str***uctured pr***ompt***s) is an opinionated, extensible, zero-dependency **prompt rendering** library. Strompt is designed to enable the construction of consistent, reusable prompts in agentic applications.

The goal of Strompt is to create prompts that are readable (easy to debug), correct (typo-free), and maintainable.

A Python port with identical rendering is available on PyPI at [`strompt`](https://pypi.org/project/strompt/).

## Installation

The library can be installed directly from npm at `@4arch/strompt` with any JS package manager, examples for npm and yarn are provided below:

```bash
npm install @4arch/strompt # npm installation
```

or

```bash
yarn add @4arch/strompt # yarn installation
```

## Usage

Consider the following prompt:

```js
const generateRefundPrompts = (userInfo: string[], userPrompt: string) => {
    const systemPrompt = `You are a customer support agent working at ACME designed to review refund requests and determine whether they are valid or invalid. Your aim is to create the best possible customer experience while also ensuring that fraudulent or unqualified refund requests are not granted. You respond in a tone that is formal and polite but not utterly deferential to the user.

    To make your decision, you will be provided with the customer's refund request and a list of statistics about the customer, such as how long their account has existed and how many prior purchases they have completed.

    Your output should be the amount of money to refund the user given their request. Adhere to the following rules:
    1. Output ONLY the refund amount and nothing else
    2. The refund amount should be expressed in USD cents, so if a $1.50 refund should be granted the output should be 150
    3. If no refund should be granted, simply output 0
    4. Accounts that have no successful prior purchases or have only been active for a short period of time are more likely to be fraudulent, so be extra careful when evaluating refund requests from such accounts
    5. Use your available tools to double check a user's refund request reasoning (ex. if the user claims the package was delivered late, use your package lookup tool to confirm this is accurate).`

    const prompt = `User refund request: ${userPrompt}\nUser Background Info: ${userInfo.join()}`;

    return {systemPrompt, prompt}
}
```

These prompts are blocks of text, and are thus fairly difficult to read and maintain. Moreover, it's easy to make typos like messing up the numbering of the output instructions in the process of adding/editing bullets. It is also hard to see whitespace, such as the `\n` separating the sections of the prompt.

In Strompt, the prompt is much cleaner to read and maintain:

```js
import { MarkdownPromptRenderer } from "@4arch/strompt";

const generateRefundPrompts = (userInfo: string[], userPrompt: string) => {
  const systemPromptRenderer = new MarkdownPromptRenderer();

  systemPromptRenderer.section("personality", (personalitySection) => {
    personalitySection.subsection("Background", (subsection) => {
      subsection.text(
        "You are a customer support agent working at ACME designed to review refund " +
          "requests and determine whether they are valid or invalid. You respond in a " +
          "tone that is formal and polite but not utterly deferential to the user.",
      );
    });
  });

  systemPromptRenderer.section("task", (taskSection) => {
    taskSection
      .subsection("Description", (subsection) => {
        subsection.text(
          "Your aim is to create the best possible customer experience while also ensuring " +
            "that fraudulent or unqualified refund requests are not granted.",
        );
      })
      .subsection("Output", (subsection) => {
        subsection.text(
          "Your output should be the amount of money to refund the user given their request.",
        );
      })
      .subsection("Guidelines", (subsection) => {
        subsection.orderedList("Adhere to the following rules", (ruleList) => {
          ruleList
            .bullet("Output ONLY the refund amount and nothing else")
            .bullet(
              "The refund amount should be expressed in USD cents, so if a $1.50 refund " +
                "should be granted the output should be 150",
            )
            .bullet("If no refund should be granted, simply output 0")
            .bullet(
              "Accounts that have no successful prior purchases or have only been active " +
                "for a short period of time are more likely to be fraudulent, so be extra " +
                "careful when evaluating refund requests from such accounts",
            )
            .bullet(
              "Use your available tools to double check a user's refund request reasoning " +
                "(ex. if the user claims the package was delivered late, use your package " +
                "lookup tool to confirm this is accurate).",
            );
        });
      });
  });

  const promptRenderer = new MarkdownPromptRenderer();

  promptRenderer.section("user request", (requestSection) => {
    requestSection
      .subsection("Refund Request", (subsection) => subsection.text(userPrompt))
      .subsection("User Background Info", (subsection) =>
        subsection.text(userInfo.join()),
      );
  });

  return {
    systemPrompt: systemPromptRenderer.render(),
    prompt: promptRenderer.render(),
  };
};
```

As can be seen, Strompt uses the **_Fluid Builder_** design pattern to sequentially construct prompts through chained method calls and callbacks.

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

To build a custom renderer for specific nodes, you can override the prompt renderer's rendering strategy using the `overrideSpec` method:

```js
import { MarkdownPromptRenderer } from "@4arch/strompt";

const customRenderer = new MarkdownPromptRenderer();
customRenderer.overrideSpec({
  renderSectionText(text) {
    return text.toUpperCase(); // Render all .text() nodes in uppercase
  },
});
```

You can also define a new renderer from scratch simply by subclassing the `PromptRenderer` base class and passing a complete `PromptRendererSpec` to the super constructor.
