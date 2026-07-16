import { useCallback, useEffect, useRef, useState } from 'react'

// Owns one DRF-paginated list ({count, next, previous, results}) as an
// infinite-scroll accumulator: pages are appended as `loadMore` is called.
// Deps changing (or `reload()`) resets back to page 1.
export function usePaged(fetcher, deps = []) {
  const depsKey = JSON.stringify(deps)
  const [state, setState] = useState({ items: [], count: 0, loading: true, error: null, hasMore: false })

  const seq = useRef(0)
  const pageRef = useRef(0)
  const hasMoreRef = useRef(false)
  const loadingRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const fetchPage = useCallback((page, replace) => {
    const id = ++seq.current
    loadingRef.current = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcherRef.current(page).then(
      (data) => {
        if (id !== seq.current) return
        loadingRef.current = false
        pageRef.current = page
        hasMoreRef.current = data.next != null
        setState((s) => {
          const base = replace ? [] : s.items
          // Dedupe on id: items can shift between pages if rows are created
          // or deleted while scrolling.
          const seen = new Set(base.map((item) => item.id))
          return {
            items: [...base, ...data.results.filter((item) => !seen.has(item.id))],
            count: data.count,
            loading: false,
            error: null,
            hasMore: data.next != null,
          }
        })
      },
      (error) => {
        if (id !== seq.current) return
        loadingRef.current = false
        setState((s) => ({ ...s, loading: false, error }))
      },
    )
  }, [])

  useEffect(() => {
    fetchPage(1, true)
  }, [depsKey, fetchPage])

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return
    fetchPage(pageRef.current + 1, false)
  }, [fetchPage])

  const reload = useCallback(() => fetchPage(1, true), [fetchPage])

  return { ...state, loadMore, reload }
}
