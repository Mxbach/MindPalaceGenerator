'use client'

import { useState } from 'react'

interface NewPalaceModalProps {
  onConfirm: (topic: string) => void
}

export default function NewPalaceModal({ onConfirm }: NewPalaceModalProps) {
  const [topic, setTopic] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (topic.trim()) onConfirm(topic.trim())
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(8, 6, 4, 0.85)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      animation: 'modalFadeIn 250ms ease-out',
    }}>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalCardIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        background: 'var(--parchment)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '480px',
        animation: 'modalCardIn 250ms ease-out',
      }}>
        {/* Decorative top rule */}
        <div style={{
          borderTop: '2px solid var(--gold)',
          borderBottom: '1px solid var(--gold-dim)',
          height: '5px',
          marginBottom: '2rem',
        }} />

        <h1 style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '28px',
          fontWeight: '700',
          color: 'var(--ash)',
          marginBottom: '0.5rem',
          lineHeight: 1.2,
        }}>
          Begin Your Palace
        </h1>

        <p style={{
          fontFamily: 'var(--font-lora), Georgia, serif',
          fontSize: '14px',
          fontStyle: 'italic',
          color: 'var(--smoke)',
          marginBottom: '2rem',
          lineHeight: 1.6,
        }}>
          Choose a theme. Rooms will be conjured one by one, each filled with vivid
          objects to anchor your memories.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Ancient Rome, Deep Ocean, Haunted Mansion..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontSize: '15px',
              color: 'var(--ash)',
              background: 'var(--parchment-dark)',
              border: 'none',
              borderBottom: '1px solid var(--gold-dim)',
              outline: 'none',
              padding: '10px 4px',
              width: '100%',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--gold)')}
            onBlur={e => (e.currentTarget.style.borderBottomColor = 'var(--gold-dim)')}
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.12em',
              color: topic.trim() ? 'var(--parchment)' : 'var(--smoke)',
              background: topic.trim() ? 'var(--ember)' : 'var(--gold-dim)',
              border: 'none',
              padding: '12px',
              cursor: topic.trim() ? 'pointer' : 'not-allowed',
              width: '100%',
              transition: 'background 200ms ease, color 200ms ease',
            }}
          >
            BEGIN
          </button>
        </form>
      </div>
    </div>
  )
}
