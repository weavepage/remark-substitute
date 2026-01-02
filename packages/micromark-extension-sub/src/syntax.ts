import type {
  Construct,
  Effects,
  Extension,
  State,
  TokenizeContext,
  Code
} from 'micromark-util-types'

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    sub: 'sub'
    subMarker: 'subMarker'
    subInitialData: 'subInitialData'
    subReplacementData: 'subReplacementData'
  }
}

const subConstruct: Construct = {
  name: 'sub',
  tokenize: tokenizeSub,
  previous: previousSub
}

function previousSub(this: TokenizeContext, code: Code): boolean {
  // :sub[ must not be preceded by an ASCII word character (a-z, A-Z, 0-9, _)
  if (code === null) return true // start of document
  if (
    (code >= 97 && code <= 122) || // a-z
    (code >= 65 && code <= 90) ||  // A-Z
    (code >= 48 && code <= 57) ||  // 0-9
    code === 95                     // _
  ) {
    return false
  }
  return true
}

function tokenizeSub(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State
): State {
  let bracketDepth = 0
  let braceDepth = 0

  return start

  function start(code: Code): State | undefined {
    // Must start with ':'
    if (code !== 58) return nok(code) // :
    effects.enter('sub')
    effects.enter('subMarker')
    effects.consume(code)
    return colonConsumed
  }

  function colonConsumed(code: Code): State | undefined {
    if (code !== 115) return nok(code) // s
    effects.consume(code)
    return s
  }

  function s(code: Code): State | undefined {
    if (code !== 117) return nok(code) // u
    effects.consume(code)
    return su
  }

  function su(code: Code): State | undefined {
    if (code !== 98) return nok(code) // b
    effects.consume(code)
    return sub
  }

  function sub(code: Code): State | undefined {
    if (code !== 91) return nok(code) // [
    effects.consume(code)
    effects.exit('subMarker')
    effects.enter('subInitialData')
    bracketDepth = 0
    return insideInitialStart
  }

  function insideInitialStart(code: Code): State | undefined {
    // Empty initial not allowed - must have at least one char
    if (code === 93) return nok(code) // ]
    return insideInitial(code)
  }

  function insideInitial(code: Code): State | undefined {
    // Cannot span lines
    if (code === null || code === -5 || code === -4 || code === -3 || code === 10 || code === 13) {
      return nok(code)
    }

    // Backslash - potential escape
    if (code === 92) { // \
      effects.consume(code)
      return insideInitialAfterBackslash
    }

    // Opening bracket - increase depth
    if (code === 91) { // [
      bracketDepth++
      effects.consume(code)
      return insideInitial
    }

    // Closing bracket
    if (code === 93) { // ]
      if (bracketDepth > 0) {
        bracketDepth--
        effects.consume(code)
        return insideInitial
      }
      // End of initial, expect {
      effects.exit('subInitialData')
      effects.enter('subMarker')
      effects.consume(code)
      return afterInitial
    }

    effects.consume(code)
    return insideInitial
  }

  function insideInitialAfterBackslash(code: Code): State | undefined {
    // Cannot span lines
    if (code === null || code === -5 || code === -4 || code === -3 || code === 10 || code === 13) {
      return nok(code)
    }

    // Escaped chars: ] [ \ - consume without special handling
    if (code === 93 || code === 91 || code === 92) {
      effects.consume(code)
      return insideInitial
    }

    // Not a special char - go back to insideInitial to handle this char normally
    return insideInitial(code)
  }

  function afterInitial(code: Code): State | undefined {
    if (code !== 123) return nok(code) // {
    effects.consume(code)
    effects.exit('subMarker')
    effects.enter('subReplacementData')
    braceDepth = 0
    return insideReplacementStart
  }

  function insideReplacementStart(code: Code): State | undefined {
    // Empty replacement not allowed - must have at least one char
    if (code === 125) return nok(code) // }
    return insideReplacement(code)
  }

  function insideReplacement(code: Code): State | undefined {
    // Cannot span lines
    if (code === null || code === -5 || code === -4 || code === -3 || code === 10 || code === 13) {
      return nok(code)
    }

    // Backslash - potential escape
    if (code === 92) { // \
      effects.consume(code)
      return insideReplacementAfterBackslash
    }

    // Opening brace - increase depth
    if (code === 123) { // {
      braceDepth++
      effects.consume(code)
      return insideReplacement
    }

    // Closing brace
    if (code === 125) { // }
      if (braceDepth > 0) {
        braceDepth--
        effects.consume(code)
        return insideReplacement
      }
      // End of replacement
      effects.exit('subReplacementData')
      effects.enter('subMarker')
      effects.consume(code)
      effects.exit('subMarker')
      effects.exit('sub')
      return ok
    }

    effects.consume(code)
    return insideReplacement
  }

  function insideReplacementAfterBackslash(code: Code): State | undefined {
    // Cannot span lines
    if (code === null || code === -5 || code === -4 || code === -3 || code === 10 || code === 13) {
      return nok(code)
    }

    // Escaped chars: } { \ - consume without special handling
    if (code === 125 || code === 123 || code === 92) {
      effects.consume(code)
      return insideReplacement
    }

    // Not a special char - go back to insideReplacement to handle this char normally
    return insideReplacement(code)
  }
}

export function sub(): Extension {
  return {
    text: {
      58: subConstruct // :
    }
  }
}

export { subConstruct }
