<script lang="ts">
  import { navigating, page } from '$app/stores'
  import { getCatalystWeb } from '@catalyst-monitor/core/web'
  import { getRouteParams } from './util.js'
  import { browser } from '$app/environment'

  if (browser) {
    const { route, params } = $page
    getCatalystWeb().recordPageView(
      route.id ?? 'Unknown',
      params != null ? getRouteParams(params) : {}
    )
  }

  $: if ($navigating?.to != null) {
    const { route, params } = $navigating.to
    getCatalystWeb().recordPageView(
      route.id ?? 'Unknown',
      params != null ? getRouteParams(params) : {}
    )
  }
</script>
