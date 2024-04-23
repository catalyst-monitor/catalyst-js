<script>
  export let form
</script>

<p>Click one of the links!</p>

<div>Or, login. Look at the source code for possible values:</div>

<form method="POST" action="?/login">
  <input placeholder="Token" name="authToken" />
  <button>Submit</button>
</form>
{#if form?.error != null}
  <div>Login failed! {form.error}</div>
{/if}
