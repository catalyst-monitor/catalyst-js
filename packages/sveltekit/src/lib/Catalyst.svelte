<script lang="ts">
  import { navigating, page } from '$app/stores'
  import Catalyst from '@catalyst-monitor/web'
  import { getRouteParams } from './util.js'
  import { browser } from '$app/environment'

  if (browser) {
    const { route, params, url } = $page
    Catalyst.getReporter().recordPageView({
      rawPath: url.pathname,
      pathPattern: route.id ?? 'Unknown',
      args: params != null ? getRouteParams(params) : {},
    })
  }

  $: if ($navigating?.to != null) {
    const { route, params, url } = $navigating.to
    Catalyst.getReporter().recordPageView({
      rawPath: url.pathname,
      pathPattern: route.id ?? 'Unknown',
      args: params != null ? getRouteParams(params) : {},
    })
  }
</script>
