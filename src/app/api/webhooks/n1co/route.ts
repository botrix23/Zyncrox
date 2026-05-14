// Implement event handling once n1co webhook format is documented.
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookSignature } from '@/lib/n1co'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-n1co-signature') ?? ''
  const payload = await req.text()

  if (!validateWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type?: string; data?: unknown }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  switch (event.type) {
    case 'payment.success':
      // TODO: Implement once n1co webhook payload is documented.
      console.log('[n1co webhook] payment.success', event.data)
      break

    case 'payment.failed':
      // TODO: Implement once n1co webhook payload is documented.
      console.log('[n1co webhook] payment.failed', event.data)
      break

    default:
      console.log('[n1co webhook] Unhandled event type:', event.type)
  }

  return NextResponse.json({ received: true })
}
