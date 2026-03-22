'use client'

import { useEffect } from 'react'

/**
 * Attaches a clipboard copy button to every <pre> element on the page.
 * Works with dangerouslySetInnerHTML content because it runs after mount.
 */
export function CopyCodeBlocks() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('pre')

    blocks.forEach((pre) => {
      // Skip if already has a button
      if (pre.querySelector('.copy-btn')) return

      // Make pre relatively positioned for the button overlay
      pre.style.position = 'relative'

      const btn = document.createElement('button')
      btn.className = 'copy-btn'
      btn.setAttribute('aria-label', 'Copy code')
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>`

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')
        // Strip ANSI/HTML tags from the text content
        const text = (code ?? pre).innerText
          .replace(/^\$\s*/gm, '')   // strip "$ " prompt prefix from each line
          .trim()

        try {
          await navigator.clipboard.writeText(text)
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>`
          btn.style.color = '#3dd68c'
          setTimeout(() => {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>`
            btn.style.color = ''
          }, 2000)
        } catch {
          // clipboard not available (non-https, etc.) — silent fail
        }
      })

      pre.appendChild(btn)
    })
  }, [])

  return null
}
