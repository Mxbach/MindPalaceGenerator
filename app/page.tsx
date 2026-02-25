'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import NewPalaceModal from './components/NewPalaceModal'
import PalaceSVG from './components/PalaceSVG'
import { Palace, Room } from '@/lib/types'

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
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude')

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
        body: JSON.stringify({ topic: palace.topic, rooms: palace.rooms, provider }),
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
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: '56px',
        background: 'var(--ink)',
        borderBottom: '1px solid var(--gold-dim)',
        flexShrink: 0,
      }}>
        {/* Left: sigil + palace name + topic */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: '15px',
            fontWeight: '600',
            letterSpacing: '0.12em',
            color: 'var(--gold)',
          }}>
            ⬡ MIND PALACE
          </span>
          {palace && (
            <>
              <span style={{ color: 'var(--gold-dim)', margin: '0 0.25rem' }}>—</span>
              <span style={{
                fontFamily: 'var(--font-courier), monospace',
                fontSize: '13px',
                fontStyle: 'italic',
                color: 'var(--smoke)',
              }}>
                {palace.topic}
              </span>
            </>
          )}
        </div>

        {/* Right: provider select + error + generate button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as 'claude' | 'openai')}
            style={{
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '12px',
              color: 'var(--smoke)',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--gold-dim)',
              outline: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            <option value="claude" style={{ background: 'var(--ink)' }}>Claude</option>
            <option value="openai" style={{ background: 'var(--ink)' }}>OpenAI</option>
          </select>

          {error && (
            <span style={{
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '12px',
              color: '#f87171',
            }}>
              {error}
            </span>
          )}

          {palace && (
            <button
              onClick={handleGenerateRoom}
              disabled={generating}
              className={generating ? 'animate-breathe' : ''}
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.1em',
                color: 'var(--parchment)',
                background: generating ? 'var(--gold-dim)' : 'var(--ember)',
                border: 'none',
                padding: '6px 16px',
                cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'background 200ms ease',
              }}
            >
              {generating ? 'CONJURING...' : '+ ROOM'}
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
            <PalaceSVG
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
