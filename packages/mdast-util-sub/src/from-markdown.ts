import type { CompileContext, Extension, Token } from 'mdast-util-from-markdown'
import type { PhrasingContent } from 'mdast'

export interface Sub {
  type: 'sub'
  children: PhrasingContent[]
  data: {
    replacement: PhrasingContent[]
    rawInitial: string
    rawReplacement: string
  }
}

declare module 'mdast' {
  interface PhrasingContentMap {
    sub: Sub
  }
}

export function subFromMarkdown(): Extension {
  let initialRaw = ''
  let replacementRaw = ''

  return {
    enter: {
      sub: enterSub,
      subInitialData: enterSubInitialData,
      subReplacementData: enterSubReplacementData
    },
    exit: {
      subInitialData: exitSubInitialData,
      subReplacementData: exitSubReplacementData,
      sub: exitSub
    }
  }

  function enterSub(this: CompileContext, token: Token): void {
    // @ts-expect-error: sub is a custom node type
    this.enter({ type: 'sub', children: [], data: { replacement: [], rawInitial: '', rawReplacement: '' } }, token)
  }

  function enterSubInitialData(this: CompileContext): void {
    initialRaw = ''
  }

  function exitSubInitialData(this: CompileContext, token: Token): void {
    initialRaw = processEscapes(this.sliceSerialize(token), 'initial')
  }

  function enterSubReplacementData(this: CompileContext): void {
    replacementRaw = ''
  }

  function exitSubReplacementData(this: CompileContext, token: Token): void {
    replacementRaw = processEscapes(this.sliceSerialize(token), 'replacement')
  }

  function exitSub(this: CompileContext, token: Token): void {
    // @ts-expect-error: accessing custom node
    const node = this.stack[this.stack.length - 1] as Sub
    
    // Store raw text for later re-parsing by the remark plugin
    node.data.rawInitial = initialRaw
    node.data.rawReplacement = replacementRaw
    
    this.exit(token)
  }
}

function processEscapes(input: string, context: 'initial' | 'replacement'): string {
  if (context === 'initial') {
    // In INITIAL: \] -> ], \[ -> [, \\ -> \
    return input.replace(/\\([\[\]\\])/g, '$1')
  } else {
    // In REPLACEMENT: \} -> }, \{ -> {, \\ -> \
    return input.replace(/\\([\{\}\\])/g, '$1')
  }
}
