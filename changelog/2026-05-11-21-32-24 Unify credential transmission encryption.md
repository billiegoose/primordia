# Unify credential transmission encryption

All credential types now use the same hybrid transmission envelope: an ephemeral AES-256-GCM key encrypts the secret payload, and the server's ephemeral RSA-OAEP public key wraps that AES key.

This removes the old API-key-specific direct RSA-OAEP path and makes API keys, Claude Code credentials, and ChatGPT subscription credentials follow one shared encryption flow on both client and server.
