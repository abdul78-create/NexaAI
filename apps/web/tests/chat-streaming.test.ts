import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { streamChatCompletion } from '../lib/chat-api.ts'

describe('Frontend Chat Streaming Pipeline & SSE Reader Tests', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // Helper to create a ReadableStream from string chunks
  function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    return new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
    })
  }

  it('1. Correctly parses SSE events split across chunk boundaries', async () => {
    // Chunk 1 has event: message_end\n
    // Chunk 2 has data: {"message_id": "123", "finish_reason": "stop"}\n\n
    const chunks = [
      'event: message_start\ndata: {"conversation_id": "conv-1"}\n\n',
      'event: token\ndata: {"text": "Hello"}\n\n',
      'event: message_end\n',
      'data: {"message_id": "123", "finish_reason": "stop"}\n\n',
    ]

    globalThis.fetch = async () =>
      new Response(createMockStream(chunks), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })

    const events: Array<{ event: string; data: any }> = []
    await streamChatCompletion(
      'mock-token',
      { content: 'Hi' },
      (event, data) => {
        events.push({ event, data })
      }
    )

    assert.equal(events.length, 3)
    assert.equal(events[0].event, 'message_start')
    assert.equal(events[1].event, 'token')
    assert.equal(events[1].data.text, 'Hello')
    assert.equal(events[2].event, 'message_end')
    assert.equal(events[2].data.message_id, '123')
    assert.equal(events[2].data.finish_reason, 'stop')
  })

  it('2. Recognizes [DONE] sentinel as stream completion', async () => {
    const chunks = [
      'event: token\ndata: {"text": "Answer"}\n\n',
      'data: [DONE]\n\n',
    ]

    globalThis.fetch = async () =>
      new Response(createMockStream(chunks), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })

    const events: Array<{ event: string; data: any }> = []
    await streamChatCompletion(
      'mock-token',
      { content: 'Hi' },
      (event, data) => {
        events.push({ event, data })
      }
    )

    assert.equal(events.length, 2)
    assert.equal(events[0].event, 'token')
    assert.equal(events[1].event, 'message_end')
    assert.equal(events[1].data.finish_reason, 'stop')
  })

  it('3. Emits guaranteed synthetic message_end if stream closes without explicit completion', async () => {
    // Stream terminates abruptly after tokens without message_end
    const chunks = [
      'event: token\ndata: {"text": "Partial message"}\n\n',
    ]

    globalThis.fetch = async () =>
      new Response(createMockStream(chunks), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })

    const events: Array<{ event: string; data: any }> = []
    await streamChatCompletion(
      'mock-token',
      { content: 'Hi' },
      (event, data) => {
        events.push({ event, data })
      }
    )

    assert.equal(events.length, 2)
    assert.equal(events[0].event, 'token')
    assert.equal(events[1].event, 'message_end')
    assert.equal(events[1].data.synthetic, true)
    assert.equal(events[1].data.finish_reason, 'stop')
  })

  it('4. Handles AbortController cancellation gracefully', async () => {
    const controller = new AbortController()

    globalThis.fetch = async (_url, init) => {
      init?.signal?.addEventListener('abort', () => {
        // aborted
      })
      controller.abort()
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      throw error
    }

    await assert.rejects(
      async () => {
        await streamChatCompletion(
          'mock-token',
          { content: 'Hi' },
          () => {},
          controller.signal
        )
      },
      (err: any) => err.name === 'AbortError'
    )
  })

  it('5. Flushes trailing partial buffer before completion', async () => {
    // Final data chunk without trailing newline before stream close
    const chunks = [
      'event: token\ndata: {"text": "Final chunk"}',
    ]

    globalThis.fetch = async () =>
      new Response(createMockStream(chunks), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })

    const events: Array<{ event: string; data: any }> = []
    await streamChatCompletion(
      'mock-token',
      { content: 'Hi' },
      (event, data) => {
        events.push({ event, data })
      }
    )

    assert.equal(events.length, 2)
    assert.equal(events[0].event, 'token')
    assert.equal(events[0].data.text, 'Final chunk')
    assert.equal(events[1].event, 'message_end')
  })
})
