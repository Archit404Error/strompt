# Strompt

Strompt (***str***uctured pr***ompt***s) is an opinionated, extensible, zero-dependency **prompt rendering** library. Strompt is designed to enable the construction of consistent, reusable prompts in agentic applications.

Strompt is available for both JavaScript/TypeScript and Python, with identical rendering behavior:

| Language              | Package                                                          | Source                                 |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| JavaScript/TypeScript | [`@4arch/strompt`](https://www.npmjs.com/package/@4arch/strompt) | [`packages/js`](packages/js)           |
| Python                | [`strompt`](https://pypi.org/project/strompt/)                   | [`packages/python`](packages/python)   |

See each package's README for installation and usage instructions.

## Repository Layout

```
packages/js/        JavaScript/TypeScript package, published to npm
packages/python/    Python package, published to PyPI
spec/fixtures/      Shared test cases that both packages must pass
```

## Shared Test Fixtures

Every JSON file in `spec/fixtures` is run by both the Vitest and pytest suites, which keeps the two packages' rendering byte-for-byte identical. Each file has a `kind`:

- `render` cases describe a prompt as data, which each test suite rebuilds with its `MarkdownPromptRenderer`. `expected` is the rendered prompt, split into lines
- `normalize` cases call `normalizeContent` / `normalize_content` with a `tagName` and `text`, and compare against `expected`

To add a test case for both packages, add it to a fixture file. Tests that can't be expressed as data, such as spec overrides, types, and packaging, live in each package's own test suite.

## Development

JavaScript/TypeScript, from `packages/js`:

```bash
yarn install
yarn typecheck
yarn test
```

Python, from `packages/python` (requires [uv](https://docs.astral.sh/uv/)):

```bash
uv sync
uv run ruff check . && uv run ruff format --check .
uv run mypy
uv run pytest --cov
```

## Releasing

Each package is versioned independently and published by GitHub Actions when a matching tag is pushed. The tag must match the version in the package's `package.json` or `pyproject.toml`:

```bash
git tag js-v1.0.11 && git push origin js-v1.0.11 # publishes packages/js to npm
git tag py-v0.1.0 && git push origin py-v0.1.0   # publishes packages/python to PyPI
```

Both workflows publish with trusted publishing (OIDC), so no registry tokens are stored in the repository.
