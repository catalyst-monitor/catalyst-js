<script>
  export let data
  export let form
  console.log('Log from component')
</script>

<form method="POST" action="?/error">
  <button>Cause an error</button>
</form>

<form method="POST" action="?/log">
  <button>Cause a log</button>
</form>
