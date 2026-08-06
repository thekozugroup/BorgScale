import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  helperText?: string
  placeholder?: string
  height?: string
  language?: string
}

type TokenKind = 'plain' | 'comment' | 'string' | 'variable' | 'keyword'

interface Token {
  text: string
  kind: TokenKind
}

const INDENT = '  '

// Applied one line at a time, so an unterminated quote or a heredoc body cannot
// swallow the rest of the script the way a real shell parser would let it.
const SHELL_TOKEN =
  /(?<=^|\s)#.*|"(?:\\.|[^"\\])*"|'[^']*'|\$\{[^}]*\}|\$[A-Za-z_]\w*|\$[\d@*#?$!]|\b(?:if|then|elif|else|fi|for|while|until|do|done|case|esac|in|function|select|return|local|export|readonly|declare|source|trap|set|shift|break|continue|exit)\b/g

// The palette is monochrome everywhere else in the app, so tokens are told apart
// by weight, emphasis and tone rather than by hue.
const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: '',
  comment: 'italic text-muted-foreground',
  string: 'text-foreground/70',
  variable: 'font-semibold text-foreground/70',
  keyword: 'font-semibold',
}

function classify(text: string): TokenKind {
  if (text.startsWith('#')) return 'comment'
  if (text.startsWith('"') || text.startsWith("'")) return 'string'
  if (text.startsWith('$')) return 'variable'
  return 'keyword'
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let cursor = 0
  SHELL_TOKEN.lastIndex = 0
  let match = SHELL_TOKEN.exec(line)
  while (match) {
    if (match.index > cursor) {
      tokens.push({ text: line.slice(cursor, match.index), kind: 'plain' })
    }
    tokens.push({ text: match[0], kind: classify(match[0]) })
    cursor = match.index + match[0].length
    match = SHELL_TOKEN.exec(line)
  }
  if (cursor < line.length) {
    tokens.push({ text: line.slice(cursor), kind: 'plain' })
  }
  return tokens
}

export default function CodeEditor({
  value,
  onChange,
  label,
  helperText,
  placeholder = '#!/bin/bash\n',
  height = '180px',
  language = 'shell',
}: CodeEditorProps) {
  const editorId = useId()
  const helperId = `${editorId}-helper`
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSelection = useRef<[number, number] | null>(null)

  const lines = useMemo(
    () =>
      (value || '')
        .split('\n')
        .map((line) =>
          language === 'shell' ? tokenize(line) : [{ text: line, kind: 'plain' as TokenKind }]
        ),
    [value, language]
  )

  // Rewriting the value through onChange re-renders a controlled textarea with
  // the caret at the end, so indent edits have to put it back themselves.
  useLayoutEffect(() => {
    const selection = pendingSelection.current
    if (!selection || !textareaRef.current) return
    pendingSelection.current = null
    textareaRef.current.setSelectionRange(selection[0], selection[1])
  }, [value])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()

    const source = value || ''
    const { selectionStart, selectionEnd } = event.currentTarget

    if (!event.shiftKey && selectionStart === selectionEnd) {
      onChange(source.slice(0, selectionStart) + INDENT + source.slice(selectionStart))
      pendingSelection.current = [selectionStart + INDENT.length, selectionStart + INDENT.length]
      return
    }

    const blockStart = source.lastIndexOf('\n', selectionStart - 1) + 1
    // A selection ending on a line break stops at that break, so the untouched
    // line below it is not dragged into the indent.
    const searchFrom =
      selectionEnd > blockStart && source[selectionEnd - 1] === '\n'
        ? selectionEnd - 1
        : selectionEnd
    const lineBreak = source.indexOf('\n', searchFrom)
    const blockEnd = lineBreak === -1 ? source.length : lineBreak

    let firstShift = 0
    let totalShift = 0
    const block = source
      .slice(blockStart, blockEnd)
      .split('\n')
      .map((line, index) => {
        let shift = INDENT.length
        let indented = INDENT + line
        if (event.shiftKey) {
          const stripped = line.startsWith(INDENT) ? INDENT.length : line.startsWith(' ') ? 1 : 0
          shift = -stripped
          indented = line.slice(stripped)
        }
        if (index === 0) firstShift = shift
        totalShift += shift
        return indented
      })
      .join('\n')

    if (totalShift === 0) return

    onChange(source.slice(0, blockStart) + block + source.slice(blockEnd))
    pendingSelection.current = [
      Math.max(blockStart, selectionStart + firstShift),
      Math.max(blockStart, selectionEnd + totalShift),
    ]
  }

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={editorId} className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <div className="border-2 border-border rounded overflow-hidden transition-colors hover:border-muted-foreground focus-within:border-primary">
        <div
          className="grid overflow-auto bg-background font-mono text-sm leading-5"
          style={{ height, tabSize: 2 }}
        >
          <div
            aria-hidden="true"
            data-testid="code-editor-highlight"
            className="col-start-1 row-start-1 pointer-events-none py-2 pr-3 text-foreground"
          >
            {lines.map((tokens, index) => (
              <div key={index} className="flex">
                <span className="w-10 shrink-0 select-none pr-3 text-right text-muted-foreground/60">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  {tokens.map((token, tokenIndex) => (
                    <span key={tokenIndex} className={TOKEN_CLASS[token.kind]}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <textarea
            id={editorId}
            ref={textareaRef}
            rows={1}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-describedby={helperText ? helperId : undefined}
            data-testid="code-editor-input"
            className="col-start-1 row-start-1 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent py-2 pl-10 pr-3 font-mono text-sm leading-5 text-transparent caret-foreground outline-none selection:bg-foreground/20 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
      {helperText && (
        <p id={helperId} className="text-xs text-muted-foreground mt-1">
          {helperText}
        </p>
      )}
    </div>
  )
}
