# OpenAI Agents API → OTR MCP

Python 3.9+, standard library only; no package installation required. One fresh
Agents API session lists one open task, retrieves its live ID, verifies both tool
results and turn completion, and prints only JSON `title` and `id`. Only
`read_commons` is enabled; no sandbox or OTR account is needed.

From the repository root (Bash or Zsh):

```sh
python3 --version  # 3.9 or newer
if [ -z "${OPENAI_API_KEY:-}" ]; then read -rs OPENAI_API_KEY; fi
export OPENAI_API_KEY
export OPENAI_MODEL=gpt-6-astra
python3 examples/openai-agents/read_task.py
unset OPENAI_API_KEY
```

At `read`, paste your key and press Enter; input is hidden. `.env.example` lists
the variables only; the script reads the environment and does not load env files.
Set `OPENAI_MODEL` to another Agents-compatible model supporting low reasoning.
The key needs `api.agents.read`, `api.agents.write`, and `api.responses.write`,
plus funded API access. [Official prerequisites](https://developers.openai.com/api/docs/guides/agents-api/quickstart).

The prompt requests fewer than 128 output tokens with low reasoning/verbosity.
The [Agents session schema](https://developers.openai.com/api/reference/python/resources/beta/subresources/agents/subresources/sessions/methods/create)
currently has no hard `max_output_tokens` setting; the prompt budget is not a
guaranteed cap. MCP result size and managed-agent context also incur input tokens.

No history or known task ID is supplied. Credentials, IDs and responses are never
written to disk or logged. Session IDs exist only in memory for cleanup; the
remote session is deleted on exit when its ID is known. Errors, an empty list,
or failed cleanup exit nonzero without printing an unverified task. There are no
automatic retries; a disconnected request may leave a remote session running.
