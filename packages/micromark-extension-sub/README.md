# micromark-extension-sub

[micromark](https://github.com/micromark/micromark) extension for inline substitution syntax (`:sub[INITIAL]{REPLACEMENT}`).

Inline substitution enables progressive disclosure — show brief content initially, reveal full content on activation. Useful for TL;DR summaries, spoilers, and interactive learning. For a complete solution, use [`remark-sub`](https://www.npmjs.com/package/remark-sub).

## Install

```bash
npm install micromark-extension-sub
```

## Usage

```javascript
import { micromark } from 'micromark'
import { sub } from 'micromark-extension-sub'

const html = micromark(':sub[initial]{replacement}', {
  extensions: [sub()],
  htmlExtensions: [{
    enter: {
      sub() { this.tag('<span class="sub">') }
    },
    exit: {
      subInitialData(token) {
        this.tag('<span class="initial">')
        this.raw(this.sliceSerialize(token))
        this.tag('</span>')
      },
      subReplacementData(token) {
        this.tag('<span class="replacement">')
        this.raw(this.sliceSerialize(token))
        this.tag('</span>')
      },
      sub() { this.tag('</span>') }
    }
  }]
})

// Output: <p><span class="sub"><span class="initial">initial</span><span class="replacement">replacement</span></span></p>
```

**Note:** This extension only tokenizes the syntax. You must provide an `htmlExtensions` handler to render output, or use [`remark-sub`](https://www.npmjs.com/package/remark-sub) for a complete solution.

## Tokens

- `sub` — The whole construct
- `subMarker` — The `:sub[`, `]`, `{`, and `}` markers
- `subInitialData` — The INITIAL content
- `subReplacementData` — The REPLACEMENT content

## Syntax

- Starts with `:sub[` (no whitespace allowed)
- INITIAL ends with `]` (with bracket balancing)
- REPLACEMENT is between `{` and `}` (with brace balancing)
- Cannot span multiple lines
- Must not be preceded by a word character (a-z, A-Z, 0-9, _)

## Escaping

**In INITIAL:**
- `\]` → literal `]` (doesn't close)
- `\[` → literal `[` (no depth change)
- `\\` → literal `\`

**In REPLACEMENT:**
- `\}` → literal `}` (doesn't close)
- `\{` → literal `{` (no depth change)
- `\\` → literal `\`

## License

MIT
