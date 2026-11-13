import { del, put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD = 64 * 1024

async function detectFileType(file: File): Promise<string | null> {
  const sample = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
  const matches = (signature: number[]) => signature.every((byte, index) => sample[index] === byte)

  if (sample.length >= 5 && new TextDecoder().decode(sample.slice(0, 5)) === '%PDF-') return 'application/pdf'
  if (matches([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png'
  if (matches([255, 216, 255])) return 'image/jpeg'

  const isTextFile = file.type === 'text/plain' || /\.txt$/i.test(file.name)
  if (isTextFile && sample.length > 0 && !sample.includes(0)) return 'text/plain'
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in before uploading a document.' }, { status: 401 })

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD) {
    return NextResponse.json({ error: 'Files must be no larger than 10 MB.' }, { status: 413 })
  }

  let blobUrl: string | null = null
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a document to upload.' }, { status: 400 })
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Files must be between 1 byte and 10 MB.' }, { status: 413 })

    const mimeType = await detectFileType(file)
    if (!mimeType) return NextResponse.json({ error: 'Choose a valid PDF, plain text, PNG, or JPEG file.' }, { status: 415 })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'health-document'
    const blob = await put(`users/${user.id}/${crypto.randomUUID()}-${safeName}`, file, {
      access: 'private',
      addRandomSuffix: false,
      contentType: mimeType,
    })
    blobUrl = blob.url

    const { data: record, error } = await supabase.from('health_records').insert({
      user_id: user.id,
      title: safeName,
      category: mimeType,
      storage_path: blob.pathname,
      mime_type: mimeType,
    }).select('id, title, category, notes, storage_path, mime_type, created_at').single()

    if (error || !record) {
      await del(blob.url)
      blobUrl = null
      console.error('[documents/upload] record insert failed', error?.code ?? 'empty result')
      return NextResponse.json({ error: 'The file could not be added to your health library. Please retry.' }, { status: 500 })
    }

    return NextResponse.json({ record }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (blobUrl) {
      try { await del(blobUrl) } catch (cleanupError) {
        console.error('[documents/upload] orphan cleanup failed', cleanupError instanceof Error ? cleanupError.name : 'unknown error')
      }
    }
    console.error('[documents/upload] failed', error instanceof Error ? error.name : 'unknown error')
    return NextResponse.json({ error: 'We could not upload that document. Please try again.' }, { status: 500 })
  }
}
