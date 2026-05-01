import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Key, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { tokensAPI } from '../services/api'
import { formatDateShort } from '../utils/dateUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Token {
  id: number
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
}

export default function ApiTokensSection() {
  const queryClient = useQueryClient()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)

  const { data: tokensData, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => tokensAPI.list().then((r) => r.data),
  })

  const generateMutation = useMutation({
    mutationFn: (name: string) => tokensAPI.generate(name).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      setNewToken(data.token)
      setTokenName('')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to generate token')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => tokensAPI.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      toast.success('Token revoked')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to revoke token')
    },
  })

  const handleCopy = async () => {
    if (!newToken) return
    await navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseCopyModal = () => {
    if (!copied) {
      setCloseConfirmOpen(true)
    } else {
      setNewToken(null)
      setGenerateOpen(false)
    }
  }

  const tokens: Token[] = tokensData ?? []

  return (
    <div>
      <div className="border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">API Tokens</p>
            <p className="text-xs text-muted-foreground">Programmatic access — shown only once when generated</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto" onClick={() => setGenerateOpen(true)}>
            <Plus size={14} />
            Generate
          </Button>
        </div>

        {/* Token list */}
        <div>
          {isLoading ? (
            <div className="p-6 flex justify-center">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-6 text-center">
              <Key size={32} className="opacity-30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tokens yet</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Prefix', 'Created', 'Last used', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-sm font-medium">{token.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground" style={{ fontFamily: 'monospace' }}>
                        {token.prefix}…
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDateShort(token.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {token.last_used_at ? formatDateShort(token.last_used_at) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => revokeMutation.mutate(token.id)}
                            disabled={revokeMutation.isPending}
                            className="flex items-center justify-center w-7 h-7 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 disabled:opacity-30"
                          >
                            <Trash2 size={15} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke token</TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Generate Token Dialog */}
      <Dialog open={generateOpen && !newToken} onOpenChange={(v) => !v && setGenerateOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate API Token</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); generateMutation.mutate(tokenName) }}
            className="flex flex-col gap-4 pt-2"
          >
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Token name</Label>
              <Input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g. CI deploy, Home automation"
                required
                autoFocus
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setGenerateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={generateMutation.isPending || !tokenName.trim()} className="gap-1.5">
                {generateMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                Generate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* One-time token copy dialog */}
      <Dialog open={!!newToken} onOpenChange={(v) => !v && handleCloseCopyModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your new API token</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Alert>
              <AlertDescription>Copy this token now. You won't be able to see it again.</AlertDescription>
            </Alert>
            <div className="flex items-center gap-2">
              <Input
                value={newToken ?? ''}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="h-9 text-sm font-mono"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border flex-shrink-0 transition-colors duration-150 ${copied ? 'text-primary border-primary/30' : 'text-muted-foreground border-border hover:text-foreground'}`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{copied ? 'Copied!' : 'Copy to clipboard'}</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCloseCopyModal}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm close without copying */}
      <Dialog open={closeConfirmOpen} onOpenChange={(v) => !v && setCloseConfirmOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close without copying?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-sm text-muted-foreground">
              You haven't copied the token. Once you close this dialog, the token cannot be retrieved.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCloseConfirmOpen(false)}>Go back</Button>
              <Button variant="destructive" size="sm" onClick={() => {
                setNewToken(null)
                setCloseConfirmOpen(false)
                setGenerateOpen(false)
              }}>
                Close anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
