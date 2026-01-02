# remark-sub

A remark plugin for inline substitution syntax using `:sub[INITIAL]{REPLACEMENT}`.

## Why?

Inline substitution allows progressive disclosure of content — show a brief version initially, then reveal the full content on activation.

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

## Syntax

```markdown
:sub[INITIAL]{REPLACEMENT}
```

- **INITIAL**: Text shown initially
- **REPLACEMENT**: Text shown after activation (one-way toggle)

Both sections support inline Markdown:

```markdown
:sub[**bold**]{_italic_ and `code`}
```

Nested `:sub` is allowed in REPLACEMENT:

```markdown
:sub[outer]{:sub[inner]{deep}}
```

### Escaping

**In INITIAL:**
- `\]` → literal `]` (doesn't close)
- `\[` → literal `[` (no depth change)
- `\\` → literal `\`

**In REPLACEMENT:**
- `\}` → literal `}` (doesn't close)
- `\{` → literal `{` (no depth change)
- `\\` → literal `\`

### Bracket & Brace Balancing

Unescaped brackets/braces are balanced:

```markdown
:sub[f(x) = [a, b]]{expanded}   <!-- INITIAL = "f(x) = [a, b]" -->
:sub[x]{{a, b}}                 <!-- REPLACEMENT = "{a, b}" -->
```

### Boundary Rules

- `:sub[` must NOT be preceded by a word character (a-z, A-Z, 0-9, _)
- Cannot span multiple lines

```markdown
foo:sub[x]{y}     <!-- Does NOT parse -->
test(:sub[x]{y})  <!-- Parses -->
test :sub[x]{y}   <!-- Parses -->
```

## Packages

This monorepo contains:

| Package | Purpose |
|---------|---------|
| `micromark-extension-sub` | Tokenizer |
| `mdast-util-sub` | AST utilities |
| `remark-sub` | Remark plugin |

For direct micromark or mdast integration, see the individual package READMEs.

## AST Node

```javascript
interface Sub extends Parent {
  type: 'sub'
  children: PhrasingContent[]      // Parsed INITIAL
  data: {
    replacement: PhrasingContent[] // Parsed REPLACEMENT
  }
}
```

## With remark-directive

If using both plugins, **the one registered last wins** for `:sub[...]` syntax:

```javascript
// Sub wins:
unified()
  .use(remarkDirective)
  .use(remarkSub)  // registered last

// Directive wins:
unified()
  .use(remarkSub)
  .use(remarkDirective)  // registered last
```

## License

MIT
