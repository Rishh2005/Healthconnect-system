import { del, get, list } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const { id } = await context.params
  const { data: record } = await supabase.from('health_records').select('title, storage_path, mime_type').eq('id', id).maybeSingle()
  if (!record?.storage_path) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })

  try {
    const file = await get(record.storage_path, { access: 'private' })
    if (!file || file.statusCode === 304) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    const safeName = record.title.replace(/[\r\n"\\]/g, '_')
    return new NextResponse(file.stream, {
      headers: {
        'Content-Type': record.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'We could not retrieve that document.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  const { id } = await context.params
  const { data: record } = await supabase.from('health_records').select('storage_path').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!record) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })

  try {
    if (record.storage_path) {
      const { blobs } = await list({ prefix: record.storage_path, limit: 10 })
      const exactBlob = blobs.find(blob => blob.pathname === record.storage_path)
      if (exactBlob) await del(exactBlob.url)
    }
    const { error } = await supabase.from('health_records').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'We could not delete that document.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'We could not delete that document.' }, { status: 500 })
  }
}
