import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkSub from './index.js'
import type { Root } from 'mdast'
import type { Sub } from 'mdast-util-sub'

function parse(input: string): Root {
  return unified()
    .use(remarkParse)
    .use(remarkSub)
    .runSync(unified().use(remarkParse).use(remarkSub).parse(input)) as Root
}

function stringify(tree: Root): string {
  return unified()
    .use(remarkParse)
    .use(remarkSub)
    .use(remarkStringify)
    .stringify(tree)
}

function roundtrip(input: string): string {
  const tree = parse(input)
  return stringify(tree)
}

describe('remark-sub', () => {
  describe('parsing', () => {
    it('creates sub node', () => {
      const tree = parse(':sub[x]{y}')
      const paragraph = tree.children[0]
      expect(paragraph.type).toBe('paragraph')
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.type).toBe('sub')
      }
    })

    it('parses initial content as inline markdown', () => {
      const tree = parse(':sub[**bold**]{y}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.children.length).toBeGreaterThan(0)
        expect(sub.children[0].type).toBe('strong')
      }
    })

    it('parses replacement content as inline markdown', () => {
      const tree = parse(':sub[x]{_italic_}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.replacement.length).toBeGreaterThan(0)
        expect(sub.data.replacement[0].type).toBe('emphasis')
      }
    })

    it('handles escaped brackets in initial', () => {
      const tree = parse(':sub[a\\]b]{c}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.rawInitial).toBe('a]b')
      }
    })

    it('handles escaped braces in replacement', () => {
      const tree = parse(':sub[a]{b\\}c}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.rawReplacement).toBe('b}c')
      }
    })

    it('handles nested brackets', () => {
      const tree = parse(':sub[f(x) = [a, b]]{expanded}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.rawInitial).toBe('f(x) = [a, b]')
      }
    })

    it('handles nested braces', () => {
      const tree = parse(':sub[x]{{a, b}}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.rawReplacement).toBe('{a, b}')
      }
    })

    it('parses nested :sub in replacement', () => {
      const tree = parse(':sub[outer]{:sub[inner]{deep}}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const outerSub = paragraph.children[0] as Sub
        expect(outerSub.type).toBe('sub')
        expect(outerSub.data.replacement.length).toBeGreaterThan(0)
        const innerSub = outerSub.data.replacement[0] as Sub
        expect(innerSub.type).toBe('sub')
        expect(innerSub.data.rawInitial).toBe('inner')
        expect(innerSub.data.rawReplacement).toBe('deep')
      }
    })

    it('parses links in content', () => {
      const tree = parse(':sub[click]{[link text](https://example.com)}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.replacement[0].type).toBe('link')
      }
    })

    it('parses inline code in content', () => {
      const tree = parse(':sub[before]{`code`}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.replacement[0].type).toBe('inlineCode')
      }
    })

    it('parses combined markdown in both sections', () => {
      const tree = parse(':sub[**bold** and _italic_]{`code` and [link](url)}')
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        // Initial has strong
        expect(sub.children.some(c => c.type === 'strong')).toBe(true)
        // Initial has emphasis
        expect(sub.children.some(c => c.type === 'emphasis')).toBe(true)
        // Replacement has inlineCode
        expect(sub.data.replacement.some(c => c.type === 'inlineCode')).toBe(true)
        // Replacement has link
        expect(sub.data.replacement.some(c => c.type === 'link')).toBe(true)
      }
    })
  })

  describe('stringifying', () => {
    it('serializes sub node to markdown', () => {
      const tree: Root = {
        type: 'root',
        children: [{
          type: 'paragraph',
          children: [{
            type: 'sub',
            children: [{ type: 'text', value: 'initial' }],
            data: {
              replacement: [{ type: 'text', value: 'replacement' }],
              rawInitial: 'initial',
              rawReplacement: 'replacement'
            }
          } as Sub]
        }]
      }
      expect(stringify(tree).trim()).toBe(':sub[initial]{replacement}')
    })

    it('escapes unbalanced ] in initial', () => {
      const tree: Root = {
        type: 'root',
        children: [{
          type: 'paragraph',
          children: [{
            type: 'sub',
            children: [{ type: 'text', value: 'a]b' }],
            data: {
              replacement: [{ type: 'text', value: 'c' }],
              rawInitial: 'a]b',
              rawReplacement: 'c'
            }
          } as Sub]
        }]
      }
      expect(stringify(tree).trim()).toBe(':sub[a\\]b]{c}')
    })

    it('escapes unbalanced } in replacement', () => {
      const tree: Root = {
        type: 'root',
        children: [{
          type: 'paragraph',
          children: [{
            type: 'sub',
            children: [{ type: 'text', value: 'a' }],
            data: {
              replacement: [{ type: 'text', value: 'b}c' }],
              rawInitial: 'a',
              rawReplacement: 'b}c'
            }
          } as Sub]
        }]
      }
      expect(stringify(tree).trim()).toBe(':sub[a]{b\\}c}')
    })
  })

  describe('round-trip', () => {
    it('preserves simple sub', () => {
      const input = ':sub[x]{y}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('preserves sub with text', () => {
      const input = ':sub[click here]{revealed text}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('preserves nested brackets semantically', () => {
      // Note: remark-stringify escapes brackets to prevent link interpretation
      // The escaped form \[a, b\] is semantically equivalent
      const input = ':sub[f(x) = [a, b]]{expanded}'
      const output = roundtrip(input).trim()
      // Verify it round-trips again to same output (stable)
      expect(roundtrip(output).trim()).toBe(output)
      // Verify the raw content is preserved
      const tree = parse(output)
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const sub = paragraph.children[0] as Sub
        expect(sub.data.rawInitial).toBe('f(x) = [a, b]')
      }
    })

    it('preserves nested braces', () => {
      const input = ':sub[x]{{a, b}}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('round-trips nested :sub', () => {
      const input = ':sub[outer]{:sub[inner]{deep}}'
      const output = roundtrip(input).trim()
      // Verify stability (round-trips to same output)
      expect(roundtrip(output).trim()).toBe(output)
      // Verify nested structure preserved
      const tree = parse(output)
      const paragraph = tree.children[0]
      if (paragraph.type === 'paragraph') {
        const outerSub = paragraph.children[0] as Sub
        const innerSub = outerSub.data.replacement[0] as Sub
        expect(innerSub.type).toBe('sub')
        expect(innerSub.data.rawReplacement).toBe('deep')
      }
    })

    it('round-trips inline code', () => {
      const input = ':sub[before]{`code`}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('round-trips links', () => {
      const input = ':sub[click]{[text](https://example.com)}'
      const output = roundtrip(input).trim()
      expect(roundtrip(output).trim()).toBe(output)
    })

    it('round-trips combined markdown', () => {
      const input = ':sub[**bold**]{_italic_}'
      const output = roundtrip(input).trim()
      expect(roundtrip(output).trim()).toBe(output)
    })

    it('round-trips unicode content', () => {
      const input = ':sub[café]{日本語}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('round-trips emoji content', () => {
      const input = ':sub[👋 hello]{🎉 party}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('round-trips multiple :sub in same paragraph', () => {
      const input = ':sub[a]{b} and :sub[c]{d}'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('round-trips deeply nested :sub (3 levels)', () => {
      const input = ':sub[L1]{:sub[L2]{:sub[L3]{deep}}}'
      const output = roundtrip(input).trim()
      expect(roundtrip(output).trim()).toBe(output)
      // Verify structure
      const tree = parse(output)
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        const l1 = p.children[0] as Sub
        const l2 = l1.data.replacement[0] as Sub
        const l3 = l2.data.replacement[0] as Sub
        expect(l3.data.rawReplacement).toBe('deep')
      }
    })
  })

  describe('edge cases', () => {
    it('fails gracefully on empty initial', () => {
      const tree = parse(':sub[]{y}')
      // Should be parsed as plain text, not a sub node
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        expect(p.children[0].type).toBe('text')
      }
    })

    it('fails gracefully on empty replacement', () => {
      const tree = parse(':sub[x]{}')
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        expect(p.children[0].type).toBe('text')
      }
    })

    it('handles :sub before emphasis', () => {
      // :sub followed by emphasis works
      const tree = parse(':sub[before]{_italic_}')
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        const sub = p.children[0] as Sub
        expect(sub.type).toBe('sub')
        // Replacement contains emphasis
        expect(sub.data.replacement[0].type).toBe('emphasis')
      }
    })

    it('handles emphasis containing :sub', () => {
      // Note: :sub inside emphasis parses correctly with space
      const tree = parse('_text :sub[a]{b}_')
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        const em = p.children[0]
        expect(em.type).toBe('emphasis')
        if (em.type === 'emphasis' && 'children' in em) {
          // Should contain text and sub
          expect((em.children as any).some((c: any) => c.type === 'sub')).toBe(true)
        }
      }
    })

    it('round-trips whitespace-only content', () => {
      const input = ':sub[ ]{ }'
      expect(roundtrip(input).trim()).toBe(input)
    })

    it('handles very deep nesting (10 levels) without crashing', () => {
      const input = ':sub[L1]{:sub[L2]{:sub[L3]{:sub[L4]{:sub[L5]{:sub[L6]{:sub[L7]{:sub[L8]{:sub[L9]{:sub[L10]{deep}}}}}}}}}}'
      const tree = parse(input)
      const p = tree.children[0]
      expect(p.type).toBe('paragraph')
      // Verify it parsed as sub, not text
      if (p.type === 'paragraph') {
        expect(p.children[0].type).toBe('sub')
      }
      // Verify round-trip stability
      const output = roundtrip(input).trim()
      expect(roundtrip(output).trim()).toBe(output)
    })

    it('handles trailing backslash in content', () => {
      const input = ':sub[test\\\\]{also\\\\}'
      const tree = parse(input)
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        const sub = p.children[0] as Sub
        expect(sub.type).toBe('sub')
        expect(sub.data.rawInitial).toBe('test\\')
        expect(sub.data.rawReplacement).toBe('also\\')
      }
    })

    it('handles tabs in content', () => {
      const input = ':sub[a\tb]{c\td}'
      const tree = parse(input)
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        const sub = p.children[0] as Sub
        expect(sub.data.rawInitial).toBe('a\tb')
        expect(sub.data.rawReplacement).toBe('c\td')
      }
    })

    it('rejects CRLF line endings', () => {
      const input = ':sub[x\r\ny]{z}'
      const tree = parse(input)
      const p = tree.children[0]
      if (p.type === 'paragraph') {
        // Should be parsed as text, not sub
        expect(p.children[0].type).toBe('text')
      }
    })
  })
})

describe('remark-gfm compatibility', () => {
  it('handles strikethrough containing :sub', () => {
    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkSub)
      .runSync(unified().use(remarkParse).use(remarkGfm).use(remarkSub).parse('~~text :sub[a]{b}~~')) as Root
    
    const p = tree.children[0]
    if (p.type === 'paragraph') {
      const del = p.children[0]
      expect(del.type).toBe('delete')
      if (del.type === 'delete' && 'children' in del) {
        expect((del.children as any).some((c: any) => c.type === 'sub')).toBe(true)
      }
    }
  })

  it('handles :sub containing strikethrough', () => {
    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkSub)
      .runSync(unified().use(remarkParse).use(remarkGfm).use(remarkSub).parse(':sub[~~strike~~]{text}')) as Root
    
    const p = tree.children[0]
    if (p.type === 'paragraph') {
      const sub = p.children[0] as Sub
      expect(sub.type).toBe('sub')
      expect(sub.children.some((c: any) => c.type === 'delete')).toBe(true)
    }
  })
})

describe('remark-directive compatibility', () => {
  it('parses :sub[...]{...} as sub when remarkSub is registered AFTER remarkDirective', () => {
    const tree = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkSub)
      .parse(':sub[x]{y}') as Root
    
    const paragraph = tree.children[0]
    if (paragraph.type === 'paragraph') {
      const first = paragraph.children[0] as Sub
      expect(first.type).toBe('sub')
    }
  })

  it('parses :sub[...] as textDirective when remarkDirective is registered AFTER remarkSub (partial match)', () => {
    const tree = unified()
      .use(remarkParse)
      .use(remarkSub)
      .use(remarkDirective)
      .parse(':sub[x]{y}') as Root
    
    const paragraph = tree.children[0]
    if (paragraph.type === 'paragraph') {
      const first = paragraph.children[0]
      expect(first.type).toBe('textDirective')
    }
  })
})
