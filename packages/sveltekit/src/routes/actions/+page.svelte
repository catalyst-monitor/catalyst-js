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

<form method="POST" action="?/random">
  <button>Maybe cause an error?</button>
  <div>Random value: {form?.randomValue ?? 'Nothing yet'}</div>
</form>
