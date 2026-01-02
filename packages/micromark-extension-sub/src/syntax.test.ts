import { describe, it, expect } from 'vitest'
import { micromark } from 'micromark'
import { sub } from './syntax.js'

function parse(input: string): string {
  return micromark(input, {
    extensions: [sub()],
    htmlExtensions: [{
      enter: {
        sub() {
          this.tag('<span class="sub">')
        }
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
        sub() {
          this.tag('</span>')
        }
      }
    }]
  })
}

describe('sub tokenizer', () => {
  it('parses basic sub', () => {
    expect(parse(':sub[x]{y}')).toBe('<p><span class="sub"><span class="initial">x</span><span class="replacement">y</span></span></p>')
  })

  it('parses sub with spaces', () => {
    expect(parse(':sub[click here]{revealed text}')).toBe(
      '<p><span class="sub"><span class="initial">click here</span><span class="replacement">revealed text</span></span></p>'
    )
  })

  it('parses sub in sentence', () => {
    expect(parse('The answer is :sub[hidden]{42}.')).toBe(
      '<p>The answer is <span class="sub"><span class="initial">hidden</span><span class="replacement">42</span></span>.</p>'
    )
  })

  describe('bracket balancing in initial', () => {
    it('handles nested brackets', () => {
      expect(parse(':sub[f(x) = [a, b]]{expanded}')).toBe(
        '<p><span class="sub"><span class="initial">f(x) = [a, b]</span><span class="replacement">expanded</span></span></p>'
      )
    })

    it('handles multiple nested brackets', () => {
      expect(parse(':sub[[a][b][c]]{d}')).toBe(
        '<p><span class="sub"><span class="initial">[a][b][c]</span><span class="replacement">d</span></span></p>'
      )
    })
  })

  describe('brace balancing in replacement', () => {
    it('handles nested braces', () => {
      expect(parse(':sub[x]{{a, b}}')).toBe(
        '<p><span class="sub"><span class="initial">x</span><span class="replacement">{a, b}</span></span></p>'
      )
    })

    it('handles multiple nested braces', () => {
      expect(parse(':sub[x]{{a}{b}{c}}')).toBe(
        '<p><span class="sub"><span class="initial">x</span><span class="replacement">{a}{b}{c}</span></span></p>'
      )
    })
  })

  describe('escaping in initial', () => {
    it('escapes ] with backslash', () => {
      expect(parse(':sub[a\\]b]{c}')).toBe(
        '<p><span class="sub"><span class="initial">a\\]b</span><span class="replacement">c</span></span></p>'
      )
    })

    it('escapes [ with backslash (no depth increment)', () => {
      expect(parse(':sub[\\[]{c}')).toBe(
        '<p><span class="sub"><span class="initial">\\[</span><span class="replacement">c</span></span></p>'
      )
    })

    it('escapes backslash', () => {
      expect(parse(':sub[a\\\\]{c}')).toBe(
        '<p><span class="sub"><span class="initial">a\\\\</span><span class="replacement">c</span></span></p>'
      )
    })
  })

  describe('escaping in replacement', () => {
    it('escapes } with backslash', () => {
      expect(parse(':sub[a]{b\\}c}')).toBe(
        '<p><span class="sub"><span class="initial">a</span><span class="replacement">b\\}c</span></span></p>'
      )
    })

    it('escapes { with backslash (no depth increment)', () => {
      expect(parse(':sub[a]{\\{}')).toBe(
        '<p><span class="sub"><span class="initial">a</span><span class="replacement">\\{</span></span></p>'
      )
    })

    it('escapes backslash', () => {
      expect(parse(':sub[a]{b\\\\}')).toBe(
        '<p><span class="sub"><span class="initial">a</span><span class="replacement">b\\\\</span></span></p>'
      )
    })
  })

  describe('boundary conditions', () => {
    it('does NOT parse when preceded by word char', () => {
      expect(parse('foo:sub[x]{y}')).toBe('<p>foo:sub[x]{y}</p>')
    })

    it('parses after punctuation', () => {
      expect(parse('test(:sub[x]{y})')).toBe(
        '<p>test(<span class="sub"><span class="initial">x</span><span class="replacement">y</span></span>)</p>'
      )
    })

    it('parses after space', () => {
      expect(parse('test :sub[x]{y}')).toBe(
        '<p>test <span class="sub"><span class="initial">x</span><span class="replacement">y</span></span></p>'
      )
    })

    it('parses at start of document', () => {
      expect(parse(':sub[x]{y} test')).toBe(
        '<p><span class="sub"><span class="initial">x</span><span class="replacement">y</span></span> test</p>'
      )
    })

    it('does NOT parse with space after colon', () => {
      expect(parse(': sub[x]{y}')).toBe('<p>: sub[x]{y}</p>')
    })

    it('does NOT parse across newlines in initial', () => {
      expect(parse(':sub[x\ny]{z}')).toBe('<p>:sub[x\ny]{z}</p>')
    })

    it('does NOT parse across newlines in replacement', () => {
      expect(parse(':sub[x]{y\nz}')).toBe('<p>:sub[x]{y\nz}</p>')
    })

    it('does NOT parse with missing replacement', () => {
      expect(parse(':sub[x]')).toBe('<p>:sub[x]</p>')
    })

    it('does NOT parse with space between ] and {', () => {
      expect(parse(':sub[x] {y}')).toBe('<p>:sub[x] {y}</p>')
    })

    it('parses multiple :sub in same line', () => {
      expect(parse(':sub[a]{b} and :sub[c]{d}')).toBe(
        '<p><span class="sub"><span class="initial">a</span><span class="replacement">b</span></span> and <span class="sub"><span class="initial">c</span><span class="replacement">d</span></span></p>'
      )
    })

    it('parses adjacent :sub without space', () => {
      expect(parse(':sub[a]{b}:sub[c]{d}')).toBe(
        '<p><span class="sub"><span class="initial">a</span><span class="replacement">b</span></span><span class="sub"><span class="initial">c</span><span class="replacement">d</span></span></p>'
      )
    })

    it('parses at end of document', () => {
      expect(parse('test :sub[x]{y}')).toBe(
        '<p>test <span class="sub"><span class="initial">x</span><span class="replacement">y</span></span></p>'
      )
    })
  })

  describe('edge cases', () => {
    it('handles empty initial (fails to parse)', () => {
      // Empty initial should fail - micromark requires non-empty token
      expect(parse(':sub[]{y}')).toBe('<p>:sub[]{y}</p>')
    })

    it('handles empty replacement (fails to parse)', () => {
      expect(parse(':sub[x]{}')).toBe('<p>:sub[x]{}</p>')
    })

    it('handles whitespace-only initial', () => {
      expect(parse(':sub[ ]{y}')).toBe(
        '<p><span class="sub"><span class="initial"> </span><span class="replacement">y</span></span></p>'
      )
    })

    it('handles whitespace-only replacement', () => {
      expect(parse(':sub[x]{ }')).toBe(
        '<p><span class="sub"><span class="initial">x</span><span class="replacement"> </span></span></p>'
      )
    })

    it('handles escaped backslash before ] in initial', () => {
      // \\] = literal backslash + closing bracket (ends the initial)
      expect(parse(':sub[a\\\\]{b}')).toBe(
        '<p><span class="sub"><span class="initial">a\\\\</span><span class="replacement">b</span></span></p>'
      )
    })

    it('handles escaped backslash before } in replacement', () => {
      expect(parse(':sub[a]{b\\\\}')).toBe(
        '<p><span class="sub"><span class="initial">a</span><span class="replacement">b\\\\</span></span></p>'
      )
    })

    it('handles unicode content', () => {
      expect(parse(':sub[café]{日本語}')).toBe(
        '<p><span class="sub"><span class="initial">café</span><span class="replacement">日本語</span></span></p>'
      )
    })

    it('handles emoji content', () => {
      expect(parse(':sub[👋]{🎉}')).toBe(
        '<p><span class="sub"><span class="initial">👋</span><span class="replacement">🎉</span></span></p>'
      )
    })

    it('handles trailing backslash in initial (escaped)', () => {
      // To have literal trailing backslash, must escape it: \\ then ]
      // :sub[test\\]{y} → initial has "test\" then ] closes
      expect(parse(':sub[test\\\\]{y}')).toBe(
        '<p><span class="sub"><span class="initial">test\\\\</span><span class="replacement">y</span></span></p>'
      )
    })

    it('handles trailing backslash in replacement (escaped)', () => {
      // :sub[x]{test\\} → replacement has "test\" then } closes
      expect(parse(':sub[x]{test\\\\}')).toBe(
        '<p><span class="sub"><span class="initial">x</span><span class="replacement">test\\\\</span></span></p>'
      )
    })

    it('backslash before ] escapes it (no close)', () => {
      // :sub[test\]{y} - the \] is escaped ], so no closing bracket - fails to parse as sub
      const result = parse(':sub[test\\]{y}')
      expect(result).not.toContain('class="sub"')
    })

    it('backslash before } escapes it (no close)', () => {
      // :sub[x]{test\} - the \} is escaped }, so no closing brace - fails to parse as sub
      const result = parse(':sub[x]{test\\}')
      expect(result).not.toContain('class="sub"')
    })

    it('rejects CRLF in initial', () => {
      expect(parse(':sub[x\r\ny]{z}')).toBe('<p>:sub[x\r\ny]{z}</p>')
    })

    it('rejects CRLF in replacement', () => {
      expect(parse(':sub[x]{y\r\nz}')).toBe('<p>:sub[x]{y\r\nz}</p>')
    })

    it('allows tabs in content', () => {
      expect(parse(':sub[a\tb]{c\td}')).toBe(
        '<p><span class="sub"><span class="initial">a\tb</span><span class="replacement">c\td</span></span></p>'
      )
    })
  })
})
