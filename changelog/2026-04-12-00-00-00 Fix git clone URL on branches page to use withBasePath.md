# Fix git clone URL on branches page to use withBasePath

The git clone URL displayed in the legend section of the branches page was constructed
as `{currentServerUrl}/api/git`, which omitted the configured base path.

Changed the URL to use `withBasePath("/api/git")` so that when the app is hosted at a
sub-path (e.g. `https://example.com/primordia`), the clone URL correctly reads
`https://example.com/primordia/api/git` instead of `https://example.com/api/git`.
