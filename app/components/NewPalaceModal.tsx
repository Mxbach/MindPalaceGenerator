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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Create Your Mind Palace</h1>
        <p className="text-sm text-gray-500 mb-6">
          Choose a theme. Claude will generate rooms one at a time, each filled with vivid
          objects you can anchor your memories to.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            autoFocus
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Ancient Rome, Deep Ocean, Haunted Mansion..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
          >
            Begin
          </button>
        </form>
      </div>
    </div>
  )
}
