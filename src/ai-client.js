/**
 * AI Client
 * Unified interface for OpenAI, Anthropic, and local LLMs
 */

export class AIClient {
  constructor(config = {}) {
    this.provider = config.provider || 'openai';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model || 'gpt-4-turbo-preview';
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries || 2;
  }

  async complete({ system, messages, tools, temperature = 0.7, max_tokens = 4096 }) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        let response;

        switch (this.provider) {
          case 'openai':
            response = await this.callOpenAI({ system, messages, tools, temperature, max_tokens, signal: controller.signal });
            break;
          case 'anthropic':
            response = await this.callAnthropic({ system, messages, tools, temperature, max_tokens, signal: controller.signal });
            break;
          case 'local':
            response = await this.callLocal({ system, messages, tools, temperature, max_tokens, signal: controller.signal });
            break;
          default:
            throw new Error(`Unknown provider: ${this.provider}. Supported: openai, anthropic, local`);
        }

        return response;
      } catch (error) {
        lastError = error;

        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${this.timeout / 1000}s. Try a shorter message or check your connection.`);
        }

        // Don't retry on auth errors or client errors
        if (error.status === 401 || error.status === 403) {
          throw new Error(`Authentication failed. Please check your ${this.provider} API key.`);
        }
        if (error.status === 400) {
          throw error;
        }

        // Retry on 429 (rate limit) or 5xx
        if (attempt < this.maxRetries && (error.status === 429 || error.status >= 500)) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError;
  }

  async callOpenAI({ system, messages, tools, temperature, max_tokens, signal }) {
    const formattedMessages = [
      { role: 'system', content: system },
      ...messages.map(m => {
        const msg = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      })
    ];

    const body = {
      model: this.model,
      messages: formattedMessages,
      temperature,
      max_tokens
    };

    if (tools?.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      let errorMsg;
      try {
        const error = await response.json();
        errorMsg = error.error?.message || `OpenAI API error: HTTP ${response.status}`;
      } catch {
        errorMsg = `OpenAI API error: HTTP ${response.status}`;
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No response from OpenAI. The model may be unavailable.');
    }

    return {
      content: choice.message.content || '',
      tool_calls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      })) || null,
      usage: data.usage
    };
  }

  async callAnthropic({ system, messages, tools, temperature, max_tokens, signal }) {
    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }]
          : m.content
      }));

    const body = {
      model: this.model || 'claude-3-sonnet-20240229',
      max_tokens,
      temperature,
      system,
      messages: formattedMessages
    };

    if (tools?.length > 0) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      let errorMsg;
      try {
        const error = await response.json();
        errorMsg = error.error?.message || `Anthropic API error: HTTP ${response.status}`;
      } catch {
        errorMsg = `Anthropic API error: HTTP ${response.status}`;
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();

    const textContent = data.content?.find(c => c.type === 'text')?.text || '';
    const toolUses = data.content?.filter(c => c.type === 'tool_use') || [];

    return {
      content: textContent,
      tool_calls: toolUses.length > 0
        ? toolUses.map(tu => ({
            id: tu.id,
            function: {
              name: tu.name,
              arguments: JSON.stringify(tu.input)
            }
          }))
        : null,
      usage: data.usage
    };
  }

  async callLocal({ system, messages, temperature, max_tokens, signal }) {
    const url = this.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model || 'llama3',
        messages: [
          { role: 'system', content: system },
          ...messages.filter(m => m.role !== 'tool').map(m => ({
            role: m.role,
            content: m.content
          }))
        ],
        stream: false,
        options: {
          temperature,
          num_predict: max_tokens
        }
      }),
      signal
    });

    if (!response.ok) {
      const err = new Error(`Local LLM error: HTTP ${response.status}. Is Ollama running?`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      tool_calls: null
    };
  }
}
