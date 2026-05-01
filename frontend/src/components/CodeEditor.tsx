import Editor from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/context/ThemeContext'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  helperText?: string
  placeholder?: string
  height?: string
  language?: string
}

export default function CodeEditor({
  value,
  onChange,
  label,
  helperText,
  placeholder: _placeholder = '#!/bin/bash\n',
  height = '180px',
  language = 'shell',
}: CodeEditorProps) {
  const { t } = useTranslation()
  const { effectiveMode } = useTheme()
  return (
    <div className="mb-4">
      {label && (
        <p className="text-sm font-medium mb-1">{label}</p>
      )}
      <div className="border-2 border-border rounded overflow-hidden transition-colors hover:border-muted-foreground focus-within:border-primary">
        <Editor
          height={height}
          language={language}
          value={value || ''}
          onChange={(val) => onChange(val || '')}
          theme={effectiveMode === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 5,
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            padding: { top: 8, bottom: 8 },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true,
            },
          }}
          loading={<div className="p-4 bg-foreground text-background/60">{t('codeEditor.loading')}</div>}
        />
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      )}
    </div>
  )
}
