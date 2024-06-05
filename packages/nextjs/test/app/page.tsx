import styles from './page.module.css'
import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <article>
        <p>
          You&apos;ve successfully ran the{' '}
          <a href="https://www.catalystmonitor.com">Catalyst</a> example!
        </p>
        <p>
          This is a simple example of the capabilities and features of Catalyst
          that you get with no manual instrumentation. Click around and check
          out your dashboard at{' '}
          <a href="https://www.catalystmonitor.com">
            https://app.catalystmonitor.com
          </a>
          !
        </p>
      </article>
      <div>
        <h2>Parallel Routes (w/ Middleware)</h2>
        <Link className={styles.mainLink} href="/par/test1">
          Test 1
        </Link>
        <Link className={styles.mainLink} href="/par/random-slug-hello">
          Test 2
        </Link>
        <Link className={styles.mainLink} href="/par/another-test">
          Test 3
        </Link>
      </div>
      <div>
        <h2>Dynamic rest parameters</h2>
        <Link className={styles.mainLink} href="/dynamic-rest/optional/a/b/c">
          Optional rest parameters (populated)
        </Link>
        <Link className={styles.mainLink} href="/dynamic-rest/optional">
          Optional rest parameters (not populated)
        </Link>
        <Link className={styles.mainLink} href="/dynamic-rest/required/a/b/c">
          Required rest parameters
        </Link>
      </div>
      <div>
        <h2>Static pages</h2>
        <Link className={styles.mainLink} href="/stat">
          Try a static page!
        </Link>
      </div>
      <div>
        <h2>Intercepted Routes</h2>
        <Link className={styles.mainLink} href="/inter/willinter">
          Try an intercepted route
        </Link>
      </div>
      <div>
        <h2>Route Handlers</h2>
        <Link className={styles.mainLink} href="/handlers">
          Run some route handlers
        </Link>
      </div>
      <div>
        <h2>Server / Client Fetch</h2>
        <Link className={styles.mainLink} href="/fetch/hi">
          Fetch
        </Link>
        <Link className={styles.mainLink} href="/fetch/err">
          Fetch error
        </Link>
      </div>
      <div>
        <h2>Error Handling</h2>
        <Link className={styles.mainLink} href="/err/client-err">
          Cause a client error
        </Link>
        <Link className={styles.mainLink} href="/err/server-err">
          Cause a server error
        </Link>
        <Link className={styles.mainLink} href="/err/nested-err">
          Cause a server error in a nested component
        </Link>
        <Link className={styles.mainLink} href="/err/random-err">
          Cause a server error that happens randomly.
        </Link>
        <Link className={styles.mainLink} href="/err/layout-err">
          Cause an error in the layout.
        </Link>
      </div>
    </main>
  )
}
