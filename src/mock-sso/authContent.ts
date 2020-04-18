function htmlSafe(value?: unknown): string {
  // Thanks, https://stackoverflow.com/a/6234804/1180785
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default (query: Record<string, unknown>): string => `
<html>
  <head>
    <title>Mock OAuth service</title>
    <style>
      body {
        background: #EEEEEE;
        font: 1em sans-serif;
        margin: 0;
        padding: 0;
      }
      form {
        width: 400px;
        max-width: calc(100% - 20px);
        box-sizing: border-box;
        margin: 50px auto;
        padding: 15px;
        background: #FFFFFF;
      }
      h1 {
        margin: 0 0 20px;
        text-align: center;
      }
      p {
        font-size: 0.8em;
        margin: 20px 0;
      }
      input[type=text] {
        width: 200px;
        font-size: 0.9em;
        padding: 4px;
        margin: 0 10px;
      }
      button {
        font-size: 0.9em;
        padding: 6px 12px;
        border: none;
        background: #008800;
        color: #FFFFFF;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <form method="POST">
      <h1>Mock OAuth service</h1>
      <p>
        This is a mock implementation of an OAuth server for testing purposes.
      </p>
      <input type="hidden" name="redirect_uri" value="${htmlSafe(query.redirect_uri)}" />
      <input type="hidden" name="nonce" value="${htmlSafe(query.nonce)}" />
      <input type="hidden" name="state" value="${htmlSafe(query.state)}" />
      <input type="hidden" name="client_id" value="${htmlSafe(query.client_id)}" />
      <label>Sign in as <input type="text" name="identifier" required autofocus /></label><button>Sign in</button>
    </form>
  </body>
</html>
`;
