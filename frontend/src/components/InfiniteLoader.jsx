import { useEffect, useRef } from 'react'

// Sentinel that pulls the next page into view-driven lists. Rendered after the
// rows; when it becomes visible (200px early), the hook fetches the next page.
export function InfiniteLoader({ paged, noun = 'items' }) {
  const ref = useRef(null)
  const { items, count, hasMore, loading, loadMore } = paged

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // Recreate after every load so a still-visible sentinel re-fires and
    // short pages keep chaining until the viewport is filled.
  }, [loadMore, items.length, hasMore, loading])

  return (
    <div className="infinite-loader" ref={ref}>
      {loading && items.length > 0 ? (
        <span className="spinner" style={{ margin: '4px auto' }} />
      ) : !hasMore && count > 20 ? (
        `All ${count} ${noun} loaded`
      ) : null}
    </div>
  )
}
