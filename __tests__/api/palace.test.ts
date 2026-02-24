/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/palace/route'
import { NextRequest } from 'next/server'

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

import { readFile, writeFile } from 'fs/promises'
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>

const mockPalace = { topic: 'Ancient Rome', rooms: [] }

describe('GET /api/palace', () => {
  test('returns {} when file does not exist', async () => {
    mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
  })
  test('returns palace data when file exists', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify(mockPalace) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(mockPalace)
  })
})

describe('POST /api/palace', () => {
  test('writes palace to file and returns ok', async () => {
    mockWriteFile.mockResolvedValueOnce(undefined)
    const req = new NextRequest('http://localhost/api/palace', {
      method: 'POST',
      body: JSON.stringify(mockPalace),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('palace.json'),
      JSON.stringify(mockPalace, null, 2),
      'utf-8'
    )
  })
})
