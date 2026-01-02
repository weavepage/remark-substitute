# remark-sub Implementation Plan

Implementation plan for the `:sub[INITIAL]{REPLACEMENT}` inline substitution syntax, following the same patterns established in `remark-math-inline`.

## Syntax

```
:sub[INITIAL]{REPLACEMENT}
```

- **INITIAL**: Text shown initially
- **REPLACEMENT**: Text shown after activation (one-way toggle)

## Parsing Rules (Matching :math Patterns)

### 1. Word Boundary

`:sub` must not be preceded by an ASCII word character (a-z, A-Z, 0-9, _).

```
foo:sub[x]{y}  → NOT parsed (preceded by 'o')
test :sub[x]{y} → parsed
(:sub[x]{y})   → parsed
```

### 2. No Newlines

Cannot span lines. If a newline is encountered before the closing `}`, parsing fails.

### 3. Bracket Balancing in INITIAL

Unescaped `[`/`]` pairs are balanced. The first unbalanced `]` closes INITIAL.

```
:sub[f(x) = [a, b]]{expanded} → INITIAL = "f(x) = [a, b]"
:sub[a\]b]{c}                 → INITIAL = "a]b" (escaped)
```

### 4. Brace Balancing in REPLACEMENT

Unescaped `{`/`}` pairs are balanced. The first unbalanced `}` closes REPLACEMENT.

```
:sub[x]{{a, b}}   → REPLACEMENT = "{a, b}"
:sub[x]{a\}b}     → REPLACEMENT = "a}b" (escaped)
```

### 5. Escape Sequences

| Escape | Result | Context |
|--------|--------|---------|
| `\]` | Literal `]` | In INITIAL |
| `\[` | Literal `[` (no depth increment) | In INITIAL |
| `\}` | Literal `}` | In REPLACEMENT |
| `\{` | Literal `{` (no depth increment) | In REPLACEMENT |
| `\\` | Literal `\` | Both |

### 6. Content Parsing

Unlike `:math` (raw text), both INITIAL and REPLACEMENT are parsed as inline Markdown in isolation. This enables:

```
:sub[**bold**]{_italic_ and :math[x^2]}
```

Nested `:sub` inside REPLACEMENT is allowed.

**Nesting enforcement:**
- Parser: permissive (allows nesting anywhere)
- Validator: may enforce stricter rules (e.g., "only in REPLACEMENT") if needed

**Failure behavior:** If parsing fails at any point, the input MUST be treated as plain text.

**Implementation approach:**

1. The tokenizer captures raw text for `subInitialData` and `subReplacementData`
2. In `from-markdown.ts`, the raw text is re-parsed as inline Markdown using the same parser pipeline
3. The parsed nodes become `children` (INITIAL) and `data.replacement` (REPLACEMENT)

This differs from `:math` where content is stored as a raw `value` string. The re-parsing step requires access to the full remark/micromark pipeline to handle nested syntax correctly.

## Package Structure

Follow the monorepo pattern from `remark-math-inline`:

```
remark-sub/
├── packages/
│   ├── micromark-extension-sub/
│   │   └── src/
│   │       ├── syntax.ts      # Tokenizer
│   │       ├── syntax.test.ts
│   │       └── index.ts
│   ├── mdast-util-sub/
│   │   └── src/
│   │       ├── from-markdown.ts  # Token → AST
│   │       ├── to-markdown.ts    # AST → Markdown
│   │       └── index.ts
│   └── remark-sub/
│       └── src/
│           ├── index.ts          # Unified plugin
│           └── index.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## AST Node Type

```typescript
interface Sub extends Parent {
  type: 'sub'
  children: PhrasingContent[]      // Parsed INITIAL
  data: {
    replacement: PhrasingContent[] // Parsed REPLACEMENT
  }
}
```

Note: Unlike `inlineMath` which has a `value: string`, `sub` has `children` because content is parsed as Markdown.

HTML rendering details (`hName`, `hProperties`) are handled separately in a remark-rehype handler or rehype plugin, not stored on the AST node.

## Tokenizer State Machine

```
start → : → s → u → b → [ → insideInitial → ] → { → insideReplacement → } → ok
                              ↑                         ↑
                              └── bracket balancing     └── brace balancing
```

### Token Types

- `sub` — wrapper
- `subInitial` — content between `[` and `]`
- `subReplacement` — content between `{` and `}`

## Key Implementation Differences from :math

| Aspect | :math | :sub |
|--------|-------|------|
| Content type | Raw string (`value`) | Parsed Markdown (`children`) |
| Delimiters | `[...]` only | `[...]{...}` |
| Balancing | `[`/`]` | `[`/`]` in INITIAL, `{`/`}` in REPLACEMENT |
| Escapes | `\]`, `\[`, `\\` | `\]`, `\[`, `\\` in INITIAL; `\}`, `\{`, `\\` in REPLACEMENT |

## Test Cases

### Parsing

```typescript
':sub[x]{y}'                    // basic
':sub[**bold**]{_italic_}'      // inline markdown
':sub[a [b] c]{d {e} f}'        // balanced brackets/braces
':sub[a\\]b]{c\\}d}'            // escapes
':sub[outer]{:sub[inner]{deep}}' // nested
'foo:sub[x]{y}'                 // NOT parsed (word boundary)
':sub[x\ny]{z}'                 // NOT parsed (newline)
```

### Round-trip

Ensure AST → Markdown → AST produces identical results.

