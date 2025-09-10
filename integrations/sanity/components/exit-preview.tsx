import {useEffect, useState} from 'react'

export function ExitPreview() {
  const [inIframe, setInIframe] = useState(true)
  
  useEffect(() => {
    setInIframe(window.self !== window.top)
  }, [])

  if (inIframe) return null

  return (
      <form
        className="absolute inset-x-0 bottom-0 w-full bg-black/10 flex justify-center items-center gap-1 z-50 pointer-events-auto text-sm py-1"
        action="/api/preview"
        method="POST"
      >
        <p>
          You are currently in preview mode:
        </p>
        <button
          type="submit"
          className="underline"
        >
          Exit Preview Mode
        </button>
      </form>
  )
}