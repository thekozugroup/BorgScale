import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} – BorgScale`
    return () => {
      document.title = previous
    }
  }, [title])
}
