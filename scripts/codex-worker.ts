// scripts/codex-worker.ts
// Standalone OpenAI Codex CLI worker process. Spawned by the app server as a
// detached child so it survives server restarts.

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { appendSessionEvent, getSessionNdjsonPath } from '../lib/session-events';

const OPENAI_GATEWAY_BASE_URL = 'http://169.254.169.254/gateway/llm/openai/v1';

const _userApiKey = process.env.PRIMORDIA_USER_API_KEY;
delete process.env.PRIMORDIA_USER_API_KEY;
const _chatGptOAuth = process.env.PRIMORDIA_CHATGPT_OAUTH;
delete process.env.PRIMORDIA_CHATGPT_OAUTH;

interface WorkerConfig {
  sessionId: string;
  worktreePath: string;
  repoRoot: string;
  prompt: string;
  timeoutMs?: number;
  model?: string;
  useContinue?: boolean;
}

function normalizeModelId(model: string | undefined): string | undefined {
  if (!model) return undefined;
  return model.startsWith('openai-codex:') ? model.slice('openai-codex:'.length) : model;
}

function writeCodexConfig(codexHome: string, authMode: 'gateway' | 'api-key' | 'chatgpt'): void {
  fs.mkdirSync(codexHome, { recursive: true });
  try { fs.rmSync(path.join(codexHome, 'auth.json'), { force: true }); } catch { /* best-effort */ }
  const common = 'cli_auth_credentials_store = "file"\n';
  if (authMode === 'gateway') {
    fs.writeFileSync(
      path.join(codexHome, 'config.toml'),
      common +
        'model_provider = "exe-openai"\n\n' +
        '[model_providers.exe-openai]\n' +
        'name = "exe.dev LLM Gateway"\n' +
        `base_url = "${OPENAI_GATEWAY_BASE_URL}"\n` +
        'requires_openai_auth = false\n',
      'utf8',
    );
    return;
  }

  fs.writeFileSync(path.join(codexHome, 'config.toml'), common, 'utf8');

  if (authMode === 'api-key') {
    fs.writeFileSync(
      path.join(codexHome, 'auth.json'),
      JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: _userApiKey }, null, 2),
      'utf8',
    );
    return;
  }

  if (!_chatGptOAuth) throw new Error('ChatGPT subscription credentials were not provided.');
  const stored = JSON.parse(_chatGptOAuth) as {
    tokens?: {
      idToken?: string;
      accessToken?: string;
      refreshToken?: string;
      accountId?: string | null;
    };
    lastRefresh?: string;
  };
  const idToken = stored.tokens?.idToken;
  const accessToken = stored.tokens?.accessToken;
  const refreshToken = stored.tokens?.refreshToken;
  if (!idToken || !accessToken || !refreshToken) {
    throw new Error('Stored ChatGPT subscription credentials are missing tokens. Reconnect ChatGPT in Settings → Subscriptions.');
  }
  fs.writeFileSync(
    path.join(codexHome, 'auth.json'),
    JSON.stringify({
      auth_mode: 'chatgpt',
      tokens: {
        id_token: idToken,
        access_token: accessToken,
        refresh_token: refreshToken,
        account_id: stored.tokens?.accountId ?? undefined,
      },
      last_refresh: stored.lastRefresh ?? new Date().toISOString(),
    }, null, 2),
    'utf8',
  );
}

function eventToText(event: Record<string, unknown>): string | null {
  const type = event.type;
  if (type === 'item.started') {
    const item = event.item as Record<string, unknown> | undefined;
    if (item?.type === 'command_execution') return `\n\n$ ${String(item.command ?? '').trim()}\n`;
  }
  if (type === 'item.completed') {
    const item = event.item as Record<string, unknown> | undefined;
    if (item?.type === 'agent_message' && typeof item.text === 'string') return `\n${item.text}\n`;
    if (item?.type === 'command_execution') {
      const stdout = typeof item.stdout === 'string' ? item.stdout : '';
      const stderr = typeof item.stderr === 'string' ? item.stderr : '';
      const output = [stdout, stderr].filter(Boolean).join('\n');
      return output ? `${output}\n` : null;
    }
  }
  if (type === 'agent_message' && typeof event.message === 'string') return `\n${event.message}\n`;
  if (type === 'turn.completed') {
    const usage = event.usage as Record<string, unknown> | undefined;
    if (usage) {
      const input = usage.input_tokens ?? usage.total_input_tokens;
      const output = usage.output_tokens ?? usage.total_output_tokens;
      if (input || output) return `\nTokens: ${input ?? '?'} in, ${output ?? '?'} out\n`;
    }
  }
  if (type === 'error' || type === 'stream_error') {
    return `\nError: ${String(event.message ?? event.error ?? 'Unknown Codex error')}\n`;
  }
  return null;
}

async function main(): Promise<void> {
  const configFile = process.argv[2];
  if (!configFile) {
    process.stderr.write('Usage: bun scripts/codex-worker.ts <config-file>\n');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as WorkerConfig;
  const { sessionId, worktreePath, prompt, useContinue } = config;
  const timeoutMs = config.timeoutMs ?? 20 * 60 * 1000;
  const ndjsonPath = getSessionNdjsonPath(worktreePath);
  const pidFile = path.join(worktreePath, '.primordia-worker.pid');
  const homeDir = process.env.HOME ?? '/home/exedev';
  const codexHome = path.join(homeDir, '.primordia-codex', sessionId);

  fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  const cleanup = () => { try { fs.rmSync(pidFile, { force: true }); } catch {} };

  let child: ReturnType<typeof spawn> | null = null;
  let timedOut = false;
  process.on('SIGTERM', () => { child?.kill('SIGTERM'); });
  const timeoutId = setTimeout(() => { timedOut = true; child?.kill('SIGTERM'); }, timeoutMs);

  try {
    const authMode = _chatGptOAuth ? 'chatgpt' : (_userApiKey ? 'api-key' : 'gateway');
    writeCodexConfig(codexHome, authMode);
    process.stderr.write(`Using Codex with ${authMode === 'gateway' ? 'exe.dev LLM gateway' : authMode === 'api-key' ? 'user-supplied OpenAI API key' : 'ChatGPT subscription OAuth'}\n`);

    const args = useContinue
      ? ['exec', 'resume', '--last', '--json', '--dangerously-bypass-approvals-and-sandbox']
      : ['exec', '--json', '--dangerously-bypass-approvals-and-sandbox'];
    const model = normalizeModelId(config.model);
    if (model) args.push('--model', model);
    args.push('-');

    await new Promise<void>((resolve, reject) => {
      const localCodexBin = path.join(config.repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'codex.cmd' : 'codex');
      const codexCommand = fs.existsSync(localCodexBin) ? localCodexBin : 'codex';
      child = spawn(codexCommand, args, {
        cwd: worktreePath,
        env: { ...process.env, CODEX_HOME: codexHome },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.stdin?.end(prompt);
      let stdoutBuf = '';
      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        process.stdout.write(text);
        stdoutBuf += text;
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as Record<string, unknown>;
            const content = eventToText(event);
            if (content) appendSessionEvent(ndjsonPath, { type: 'text', content, ts: Date.now() });
          } catch {
            appendSessionEvent(ndjsonPath, { type: 'text', content: `${line}\n`, ts: Date.now() });
          }
        }
      });
      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        process.stderr.write(text);
        if (text.trim()) appendSessionEvent(ndjsonPath, { type: 'text', content: text, ts: Date.now() });
      });
      child.on('error', reject);
      child.on('exit', (code, signal) => {
        if (timedOut) reject(new Error(`Codex timed out after ${Math.round(timeoutMs / 1000)}s`));
        else if (signal === 'SIGTERM') reject(new Error('Codex run was aborted'));
        else if (code !== 0) reject(new Error(`Codex exited with code ${code}`));
        else resolve();
      });
    });

    appendSessionEvent(ndjsonPath, { type: 'result', subtype: 'success', ts: Date.now() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    appendSessionEvent(ndjsonPath, { type: 'result', subtype: timedOut ? 'timeout' : 'error', message: msg, ts: Date.now() });
  } finally {
    clearTimeout(timeoutId);
    cleanup();
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
