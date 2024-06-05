<script lang="ts">
  import Catalyst from '$lib/Catalyst.svelte'
  import { getCatalystWeb } from '$lib/client.js'
  import { browser } from '$app/environment'

  export let data

  if (browser) {
    getCatalystWeb().setUserInfo(
      data.user != null
        ? { loggedInId: data.user.id, loggedInUserName: data.user.userName }
        : null
    )
  }
</script>

<Catalyst />
<h1>Catalyst Sveltekit</h1>

{#if data.user != null}
  <div><strong>You are logged in as: {data.user.userName}</strong></div>
{:else}
  <div><strong>You are not logged in</strong></div>
{/if}

<div class="links">
  <a href="/">Back home</a>
  <a href="/server">Server Actions</a>
  <a href="/actions">Actions</a>
  <a href="/components/layout">Layout Component</a>
  <a href="/components/page">Page Component</a>
  <a href="/server-loading/layout">Layout Server Loading</a>
  <a href="/server-loading/page">Page Server Loading</a>
  <a href="/univ-loading/layout" data-sveltekit-preload-data={false}
    >Layout Universal Loading</a
  >
  <a href="/univ-loading/page" data-sveltekit-preload-data={false}
    >Page Universal Loading</a
  >
  <a href="/dynamic-routes/rest/a/b/c">Dynamic routes (rest param)</a>
  <a href="/dynamic-routes/single/test-me-param">Dynamic routes (single)</a>
</div>

<slot />

<style>
  .links {
    margin-bottom: 36px;
  }

  a {
    display: block;
  }
</style>
