<script lang="ts">
  import Catalyst from '$lib/Catalyst.svelte'

  export let data
</script>

<Catalyst />
<h1>Catalyst Sveltekit</h1>

<div class="links">
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
