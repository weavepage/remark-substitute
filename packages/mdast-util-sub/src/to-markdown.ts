import type { Options, State, Info } from 'mdast-util-to-markdown'
import type { Sub } from './from-markdown.js'

export function subToMarkdown(): Options {
  return {
    handlers: {
      // @ts-expect-error: sub is a custom node type
      sub: handleSub
    },
    unsafe: [
      {
        character: ':',
        after: 'sub\\[',
        inConstruct: ['phrasing']
      }
    ]
  }
}

function handleSub(node: Sub, _parent: unknown, state: State, info: Info): string {
  // Serialize children (INITIAL) back to markdown
  const initialContent = state.containerPhrasing(node as any, {
    ...info,
    before: '[',
    after: ']'
  })
  
  // Serialize replacement back to markdown
  // Create a temporary parent node for the replacement content
  const replacementContent = state.containerPhrasing(
    { type: 'paragraph', children: node.data.replacement } as any,
    {
      ...info,
      before: '{',
      after: '}'
    }
  )
  
  return ':sub[' + escapeInitial(initialContent) + ']{' + escapeReplacement(replacementContent) + '}'
}

function escapeInitial(value: string): string {
  // Only escape unbalanced ] that would close the construct prematurely
  let result = ''
  let bracketDepth = 0
  
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    
    // Handle escape sequences - pass through as-is
    if (char === '\\' && i + 1 < value.length) {
      result += char + value[i + 1]
      i++
      continue
    }
    
    if (char === '[') {
      bracketDepth++
      result += char
    } else if (char === ']') {
      if (bracketDepth > 0) {
        bracketDepth--
        result += char
      } else {
        // Unbalanced, must escape
        result += '\\]'
      }
    } else {
      result += char
    }
  }
  return result
}

function escapeReplacement(value: string): string {
  // Only escape unbalanced } that would close the construct prematurely
  let result = ''
  let braceDepth = 0
  
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    
    // Handle escape sequences - pass through as-is
    if (char === '\\' && i + 1 < value.length) {
      result += char + value[i + 1]
      i++
      continue
    }
    
    if (char === '{') {
      braceDepth++
      result += char
    } else if (char === '}') {
      if (braceDepth > 0) {
        braceDepth--
        result += char
      } else {
        // Unbalanced, must escape
        result += '\\}'
      }
    } else {
      result += char
    }
  }
  return result
}
