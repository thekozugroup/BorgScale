import React from 'react'
import { AlertTriangle, ChevronDown, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  componentStack: string | null
}

// The boundary wraps every provider in main.tsx, so the fallback has to render
// without i18n, theme or router context. Its copy is therefore untranslated.
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // The fallback keeps the stack out of the user's way, so the console is the
    // only place a bug report can be assembled from.
    console.error('Unhandled render error:', error, errorInfo.componentStack)
    this.setState({ componentStack: errorInfo.componentStack ?? null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error, componentStack } = this.state

    if (!error) {
      return this.props.children
    }

    const details = [error.stack || `${error.name}: ${error.message}`, componentStack]
      .filter(Boolean)
      .join('\n')

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border" role="alert">
          <CardHeader>
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle size={18} />
            </div>
            <CardTitle className="mt-3 text-lg">This page stopped working</CardTitle>
            <CardDescription className="leading-relaxed">
              Something went wrong while drawing this page. Reloading usually sorts it out. Your
              repositories, backups and schedules are unaffected.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={this.handleReload} className="w-full" size="lg">
              <RotateCw size={15} />
              Reload
            </Button>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground"
                >
                  Technical details
                  <ChevronDown
                    size={14}
                    className="transition-transform group-data-[state=open]/button:rotate-180"
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {details}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    )
  }
}
