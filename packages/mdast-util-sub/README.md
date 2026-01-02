# mdast-util-sub

[mdast](https://github.com/syntax-tree/mdast) utilities for inline substitution (`:sub[INITIAL]{REPLACEMENT}`).

Inline substitution enables progressive disclosure — show brief content initially, reveal full content on activation. This package provides the mdast utilities; for a complete solution, use [`remark-sub`](https://www.npmjs.com/package/remark-sub).

## Install

```bash
npm install mdast-util-sub
```

## Usage

```javascript
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { sub } from 'micromark-extension-sub'
import { subFromMarkdown, subToMarkdown } from 'mdast-util-sub'

// Parse
const tree = fromMarkdown(':sub[initial]{replacement}', {
  extensions: [sub()],
  mdastExtensions: [subFromMarkdown()]
})

// Stringify
const md = toMarkdown(tree, {
  extensions: [subToMarkdown()]
})
```

## AST

### `Sub`

```javascript
interface Sub extends Parent {
  type: 'sub'
  children: PhrasingContent[]      // Empty at this layer
  data: {
    replacement: PhrasingContent[] // Empty at this layer
    rawInitial: string             // Raw INITIAL text (escapes processed)
    rawReplacement: string         // Raw REPLACEMENT text (escapes processed)
  }
}
```

At the mdast-util layer, raw content is stored in `rawInitial` and `rawReplacement`. The `children` and `replacement` arrays are populated later by [`remark-sub`](https://www.npmjs.com/package/remark-sub), which re-parses the raw content as inline Markdown.

## Escaping

When serializing to markdown:
- Unbalanced `]` in INITIAL is escaped as `\]`
- Unbalanced `}` in REPLACEMENT is escaped as `\}`
- Balanced brackets/braces don't need escaping

## License

MIT
