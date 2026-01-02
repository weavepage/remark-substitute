import { sub } from 'micromark-extension-sub'
import { subFromMarkdown, subToMarkdown } from 'mdast-util-sub'
import type { Processor, Data } from 'unified'
import type { Root, PhrasingContent } from 'mdast'
import type { Sub } from 'mdast-util-sub'

declare module 'unified' {
  interface Data {
    micromarkExtensions?: unknown[]
    fromMarkdownExtensions?: unknown[]
    toMarkdownExtensions?: unknown[]
  }
}

export default function remarkSub(this: Processor) {
  const data: Data = this.data()
  const self = this

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = [])
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

  micromarkExtensions.push(sub())
  fromMarkdownExtensions.push(subFromMarkdown())
  toMarkdownExtensions.push(subToMarkdown())

  // Add transform to re-parse raw content as inline Markdown
  return (tree: Root) => {
    visitSub(tree, (node: Sub) => {
      // Parse raw initial content as inline Markdown
      if (node.data.rawInitial) {
        const initialParsed = parseInlineMarkdown(self, node.data.rawInitial)
        node.children = initialParsed
      }

      // Parse raw replacement content as inline Markdown
      if (node.data.rawReplacement) {
        const replacementParsed = parseInlineMarkdown(self, node.data.rawReplacement)
        node.data.replacement = replacementParsed
      }
    })
  }
}

function parseInlineMarkdown(processor: Processor, text: string): PhrasingContent[] {
  // Parse and run transforms (including our own) to handle nested :sub
  const parsed = processor.parse(text)
  const tempTree = processor.runSync(parsed) as Root
  
  // The result should be a root with a paragraph containing our inline content
  if (tempTree.children.length > 0 && tempTree.children[0].type === 'paragraph') {
    return (tempTree.children[0] as { children: PhrasingContent[] }).children
  }
  
  // Fallback: return as plain text
  return [{ type: 'text', value: text }]
}

function visitSub(tree: Root | PhrasingContent, visitor: (node: Sub) => void): void {
  if ('children' in tree) {
    for (const child of tree.children as PhrasingContent[]) {
      if (child.type === 'sub') {
        visitor(child as Sub)
      }
      if ('children' in child) {
        visitSub(child as any, visitor)
      }
    }
  }
}

export type { Sub } from 'mdast-util-sub'
