'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from './components/Sidebar'
import NewPalaceModal from './components/NewPalaceModal'
import { Palace, Room } from '@/lib/types'

// Canvas uses browser APIs — load client-side only
const Canvas = dynamic(() => import('./components/Canvas'), { ssr: false })

interface SelectedItem {
  roomId: string
  objectId: string
}

export default function Home() {
  const [palace, setPalace] = useState<Palace | null>(null)
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/palace')
      .then(r => r.json())
      .then(data => {
        setPalace(Object.keys(data).length > 0 ? data : null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const savePalace = useCallback(async (updated: Palace) => {
    setPalace(updated)
    await fetch('/api/palace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }, [])

  async function handleCreatePalace(topic: string) {
    await savePalace({ topic, rooms: [] })
  }

  async function handleGenerateRoom() {
    if (!palace) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: palace.topic, rooms: palace.rooms }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const newRoom: Room = await res.json()
      await savePalace({ ...palace, rooms: [...palace.rooms, newRoom] })
    } catch {
      setError('Failed to generate room. Check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveMemory(memory: string) {
    if (!palace || !selected) return
    const updated: Palace = {
      ...palace,
      rooms: palace.rooms.map(room =>
        room.id !== selected.roomId ? room : {
          ...room,
          objects: room.objects.map(obj =>
            obj.id !== selected.objectId ? obj : { ...obj, memory }
          ),
        }
      ),
    }
    savePalace(updated)
  }

  const selectedRoom = palace?.rooms.find(r => r.id === selected?.roomId) ?? null
  const selectedObject = selectedRoom?.objects.find(o => o.id === selected?.objectId) ?? null

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-gray-900">Mind Palace</h1>
          {palace && <span className="text-sm text-gray-500 italic">— {palace.topic}</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-500">{error}</span>}
          {palace && (
            <button
              onClick={handleGenerateRoom}
              disabled={generating}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              {generating ? 'Generating...' : '+ Room'}
            </button>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-4">
          {palace && palace.rooms.length === 0 && (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              Click &quot;+ Room&quot; to generate your first room
            </div>
          )}
          {palace && palace.rooms.length > 0 && (
            <Canvas
              palace={palace}
              selectedObjectId={selected?.objectId ?? null}
              onObjectClick={(roomId, objectId) => setSelected({ roomId, objectId })}
              onRoomClick={() => setSelected(null)}
              onDeselect={() => setSelected(null)}
            />
          )}
        </div>

        {/* Sidebar */}
        <Sidebar
          room={selectedRoom}
          object={selectedObject}
          onSave={handleSaveMemory}
          onClose={() => setSelected(null)}
        />
      </div>

      {/* New palace modal */}
      {!palace && <NewPalaceModal onConfirm={handleCreatePalace} />}
    </div>
  )
}
