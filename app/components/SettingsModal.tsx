'use client'

import { useState } from 'react'

interface SettingsModalProps {
  topic: string
  provider: 'claude' | 'openai'
  onSave: (topic: string, provider: 'claude' | 'openai') => void
  onClose: () => void
}

export default function SettingsModal({ topic, provider, onSave, onClose }: SettingsModalProps) {
  const [localTopic, setLocalTopic] = useState(topic)
  const [localProvider, setLocalProvider] = useState(provider)

  return (
    <div
      data-testid="settings-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8, 6, 4, 0.85)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        animation: 'modalFadeIn 250ms ease-out',
      }}
    >
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

      <div
        data-testid="settings-card"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--page)',
          padding: '3rem 2.5rem',
          width: '100%',
          maxWidth: '480px',
          animation: 'modalCardIn 250ms ease-out',
          position: 'relative',
        }}
      >
        {/* Decorative top rule */}
        <div style={{
          borderTop: '2px solid var(--gold)',
          borderBottom: '1px solid var(--border)',
          height: '5px',
          marginBottom: '2rem',
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: 'var(--smoke)',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
            transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ash)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--smoke)')}
        >
          ×
        </button>

        <h1 style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '28px',
          fontWeight: '700',
          color: 'var(--ash)',
          marginBottom: '2rem',
          lineHeight: 1.2,
        }}>
          Settings
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Palace Theme */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.15em',
              color: 'var(--smoke)',
              textTransform: 'uppercase',
            }}>
              Palace Theme
            </label>
            <input
              type="text"
              value={localTopic}
              onChange={e => setLocalTopic(e.target.value)}
              style={{
                fontFamily: 'var(--font-lora), Georgia, serif',
                fontSize: '15px',
                color: 'var(--ash)',
                background: 'var(--page-deep)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                outline: 'none',
                padding: '10px 4px',
                width: '100%',
                transition: 'border-color 150ms ease',
              }}
              onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderBottomColor = 'var(--border)')}
            />
          </div>

          {/* API Provider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.15em',
              color: 'var(--smoke)',
              textTransform: 'uppercase',
            }}>
              API Provider
            </label>
            <select
              value={localProvider}
              onChange={e => setLocalProvider(e.target.value as 'claude' | 'openai')}
              style={{
                fontFamily: 'var(--font-courier), monospace',
                fontSize: '14px',
                color: 'var(--ash)',
                background: 'var(--page-deep)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                outline: 'none',
                padding: '10px 4px',
                cursor: 'pointer',
                width: '100%',
                transition: 'border-color 150ms ease',
              }}
              onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderBottomColor = 'var(--border)')}
            >
              <option value="claude" style={{ background: 'var(--page-mid)' }}>Claude</option>
              <option value="openai" style={{ background: 'var(--page-mid)' }}>OpenAI</option>
            </select>
          </div>

          {/* Save button */}
          <button
            onClick={() => onSave(localTopic.trim(), localProvider)}
            disabled={!localTopic.trim()}
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.12em',
              color: localTopic.trim() ? 'var(--page)' : 'var(--smoke)',
              background: localTopic.trim() ? 'var(--ember)' : 'var(--border)',
              border: 'none',
              padding: '12px',
              cursor: localTopic.trim() ? 'pointer' : 'not-allowed',
              width: '100%',
              transition: 'background 200ms ease, color 200ms ease',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
