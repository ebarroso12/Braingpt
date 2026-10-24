export interface ModelSettings { apiKey: string; model: string; timeoutMs: number }
export interface ModelOutput { output: any[] }

export class ResponsesModel {
  private settings: ModelSettings;
  private fetcher: typeof fetch;
  constructor(settings: ModelSettings, fetcher: typeof fetch = fetch) { this.settings = settings; this.fetcher = fetcher; }

  async complete(instructions: string, input: any[], tools: object[], signal: AbortSignal): Promise<ModelOutput> {
    try {
      const response = await this.fetcher('https://api.openai.com/v1/responses', {
        method: 'POST', redirect: 'error', signal,
        headers: { authorization: `Bearer ${this.settings.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.settings.model, instructions, input, tools, store: false,
          parallel_tool_calls: false, max_output_tokens: 800, include: ['reasoning.encrypted_content'] }),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error('Model unavailable'); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty model response');
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 262144) { await reader.cancel(); throw new Error('Model response limit'); }
        chunks.push(part.value);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (body.status !== 'completed' || !Array.isArray(body.output) || body.output.length > 20) throw new Error('Incomplete response');
      return { output: body.output };
    } catch { throw new Error('Model unavailable'); }
  }

  deadline() { return AbortSignal.timeout(this.settings.timeoutMs); }
}
