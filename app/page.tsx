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
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--void)',
      }}>
        <span style={{
          fontFamily: 'var(--font-courier), monospace',
          fontSize: '14px',
          color: 'var(--smoke)',
          fontStyle: 'italic',
        }}>
          consulting the archive...
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--void)' }}>
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
        <div style={{ flex: 1, overflow: 'auto', padding: '2rem', background: 'var(--void)' }}>
          {palace && palace.rooms.length === 0 && (
            <div style={{
              display: 'flex',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-cormorant), Georgia, serif',
                fontSize: '20px',
                fontStyle: 'italic',
                color: 'var(--smoke)',
              }}>
                The palace awaits its first room.
              </span>
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
