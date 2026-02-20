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
    this.timeout = config.timeout || 30000;
  }

  async complete({ system, messages, tools, temperature = 0.7, max_tokens = 4096 }) {
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
          throw new Error(`Unknown provider: ${this.provider}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async callOpenAI({ system, messages, tools, temperature, max_tokens, signal }) {
    const formattedMessages = [
      { role: 'system', content: system },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id
      }))
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
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }))
    };
  }

  async callAnthropic({ system, messages, tools, temperature, max_tokens, signal }) {
    const formattedMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'user' : m.role,
      content: m.content
    }));

    const body = {
      model: this.model || 'claude-3-opus-20240229',
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
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    const textContent = data.content.find(c => c.type === 'text')?.text;
    const toolUses = data.content.filter(c => c.type === 'tool_use');

    return {
      content: textContent,
      tool_calls: toolUses.map(tu => ({
        id: tu.id,
        function: {
          name: tu.name,
          arguments: JSON.stringify(tu.input)
        }
      }))
    };
  }

  async callLocal({ system, messages, tools, temperature, max_tokens, signal }) {
    // Ollama or other local LLM support
    const url = this.baseUrl || 'http://localhost:11434';
    
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          ...messages
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
      throw new Error(`Local LLM error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content,
      tool_calls: null // Local models typically don't support tool calling
    };
  }
}