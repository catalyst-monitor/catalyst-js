'use client'

import { useState } from 'react'
import styles from './page.module.css'

export default function Page() {
  const [respValue, setRespValue] = useState('')
  return (
    <main>
      {respValue.length > 0 ? <p>Got response: {respValue}</p> : null}
      <p>Click the button to send a fetch request to a route handler!</p>
      <div>
        <button
          className={styles.button}
          onClick={async () => {
            const resp = await fetch('/handlers/handler1', { method: 'get' })
            const respJson = await resp.json()
            setRespValue(respJson.value)
          }}
        >
          Send GET
        </button>
        <button
          className={styles.button}
          onClick={async () => {
            const resp = await fetch('/handlers/handler1', { method: 'put' })
            const respJson = await resp.json()
            setRespValue(respJson.value)
          }}
        >
          Send PUT
        </button>
        <button
          className={styles.button}
          onClick={async () => {
            const resp = await fetch('/handlers/handler1', { method: 'post' })
            const respJson = await resp.json()
            setRespValue(respJson.value)
          }}
        >
          Send POST
        </button>
        <button
          className={styles.button}
          onClick={async () => {
            const resp = await fetch('/handlers/handler1?error=1', {
              method: 'get',
            })
            if (resp.status != 200) {
              setRespValue('An error occurred...')
            }
          }}
        >
          This GET request fails!
        </button>
      </div>
    </main>
  )
}
