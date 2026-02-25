'use client'

import { useState, useEffect, useRef } from 'react'
import { PalaceObject, Room } from '@/lib/types'

interface SidebarProps {
  room: Room | null
  object: PalaceObject | null
  onSave: (memory: string) => void
  onClose: () => void
}

export default function Sidebar({ room, object, onSave, onClose }: SidebarProps) {
  const [memory, setMemory] = useState('')
  const prevObject = useRef<PalaceObject | null>(null)

  useEffect(() => {
    setMemory(object?.memory ?? '')
    prevObject.current = object
  }, [object])

  if (!room || !object) return null

  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      background: 'var(--page-deep)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1.25rem',
      gap: '1rem',
      animation: 'slideIn 250ms ease-out',
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Header: room label + object name + close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '0.15em',
            color: 'var(--smoke)',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            {room.name}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--ash)',
            lineHeight: 1.2,
          }}>
            {object.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: 'var(--smoke)',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '0 0 0 8px',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ash)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--smoke)')}
        >
          ×
        </button>
      </div>

      {/* Object description */}
      <p style={{
        fontFamily: 'var(--font-lora), Georgia, serif',
        fontSize: '14px',
        fontStyle: 'italic',
        color: 'var(--ash)',
        lineHeight: 1.6,
      }}>
        {object.description}
      </p>

      {/* Memory textarea */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <label style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: '10px',
          fontWeight: '600',
          letterSpacing: '0.15em',
          color: 'var(--smoke)',
          textTransform: 'uppercase',
        }}>
          Memory Note
        </label>
        <textarea
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
          placeholder="What do you want to remember here? Visualize it vividly..."
          style={{
            flex: 1,
            minHeight: '120px',
            background: 'var(--page)',
            border: '1px solid transparent',
            outline: 'none',
            padding: '10px 12px',
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: '14px',
            color: 'var(--ash)',
            lineHeight: 1.6,
            resize: 'none',
            borderRadius: 0,
            transition: 'border-color 150ms ease',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
        />
      </div>

      {/* Save button */}
      <button
        onClick={() => onSave(memory)}
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '16px',
          fontWeight: '700',
          letterSpacing: '0.05em',
          color: 'var(--ink)',
          background: 'var(--gold)',
          border: 'none',
          padding: '10px',
          cursor: 'pointer',
          width: '100%',
          transition: 'background 200ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold)')}
      >
        Save
      </button>
    </div>
  )
}
