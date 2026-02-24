import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

const PALACE_PATH = path.join(process.cwd(), 'data', 'palace.json')

export async function GET() {
  try {
    const content = await readFile(PALACE_PATH, 'utf-8')
    return NextResponse.json(JSON.parse(content))
  } catch (err: any) {
    if (err.code === 'ENOENT') return NextResponse.json({})
    return NextResponse.json({ error: 'Failed to read palace' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const palace = await req.json()
    await mkdir(path.dirname(PALACE_PATH), { recursive: true })
    await writeFile(PALACE_PATH, JSON.stringify(palace, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to write palace' }, { status: 500 })
  }
}
