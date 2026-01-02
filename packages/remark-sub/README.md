# remark-sub

A [remark](https://github.com/remarkjs/remark) plugin for inline substitution using `:sub[INITIAL]{REPLACEMENT}` syntax.

## Why?

Inline substitution enables progressive disclosure of content:
- **TL;DR summaries** that expand to full explanations
- **Spoiler text** that reveals on interaction
- **Interactive learning** with expandable definitions
- **Contextual detail** — brief by default, detailed on demand

The syntax is explicit and unambiguous, integrating cleanly with Markdown parsing.

## Install

```bash
npm install remark-sub
```

## Usage

```javascript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkSub from 'remark-sub'
import remarkStringify from 'remark-stringify'

const result = await unified()
  .use(remarkParse)
  .use(remarkSub)
  .use(remarkStringify)
  .process('The :sub[TL;DR]{full explanation here} summarizes the point.')
```

### Markdown Syntax

```markdown
Basic: :sub[click]{revealed text}

Inline Markdown works: :sub[**bold**]{_italic_ and `code`}

Nested substitution: :sub[outer]{:sub[inner]{deep}}

Balanced brackets: :sub[f(x) = [a, b]]{expanded}
```

## Escaping

**In INITIAL:**
- `\]` → literal `]` (doesn't close)
- `\[` → literal `[` (no depth change)
- `\\` → literal `\`

**In REPLACEMENT:**
- `\}` → literal `}` (doesn't close)
- `\{` → literal `{` (no depth change)
- `\\` → literal `\`

## AST Node

The plugin creates `sub` nodes:

```javascript
interface Sub extends Parent {
  type: 'sub'
  children: PhrasingContent[]      // Parsed INITIAL
  data: {
    replacement: PhrasingContent[] // Parsed REPLACEMENT
  }
}
```

## Boundary Rules

`:sub[...]` must not be preceded by a word character. Use parentheses for adjacency:

```markdown
test(:sub[x]{y})   <!-- Works -->
test:sub[x]{y}     <!-- Does NOT parse -->
```

## Use with remark-directive

If you use both `remark-sub` and `remark-directive`, **the plugin registered last takes precedence** for `:sub[...]` syntax.

```javascript
// Sub wins:
unified()
  .use(remarkDirective)
  .use(remarkSub)  // registered last

// Directive wins:
unified()
  .use(remarkSub)
  .use(remarkDirective)   // registered last
```

## License

MIT
