# Fix ChatGPT logo background

The ChatGPT/OpenAI brand icon asset had an opaque white square baked into the PNG, which looked wrong on Primordia's dark UI. The asset has been converted to a transparent white glyph so it renders cleanly on dark backgrounds.

The model picker also now uses the OpenAI/ChatGPT icon for ChatGPT subscription (`openai-codex`) model groups instead of the Codex favicon, avoiding the white rounded-square Codex mark when the UI is referring to ChatGPT billing/models.
