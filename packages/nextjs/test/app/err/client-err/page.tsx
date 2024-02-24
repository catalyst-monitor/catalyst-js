'use client'

import { useEffect } from 'react'

export default function Page() {
  useEffect(() => {
    throw new Error('Client error!')
  }, [])
  return <main>This page has a client error!</main>
}
