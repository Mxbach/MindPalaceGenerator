'use client'

import { useState, useEffect } from 'react'
import { PalaceObject, Room } from '@/lib/types'

interface SidebarProps {
  room: Room | null
  object: PalaceObject | null
  onSave: (memory: string) => void
  onClose: () => void
}

export default function Sidebar({ room, object, onSave, onClose }: SidebarProps) {
  const [memory, setMemory] = useState('')

  useEffect(() => {
    setMemory(object?.memory ?? '')
  }, [object])

  if (!room || !object) return null

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col p-4 gap-3 shrink-0">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{room.name}</p>
          <h2 className="font-semibold text-gray-900">{object.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <p className="text-sm text-gray-600 italic">{object.description}</p>

      <div className="flex flex-col gap-2 flex-1">
        <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Memory note
        </label>
        <textarea
          className="flex-1 min-h-[120px] border border-gray-200 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="What do you want to remember here? Visualize it vividly..."
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
        />
      </div>

      <button
        onClick={() => onSave(memory)}
        className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 rounded transition-colors"
      >
        Save
      </button>
    </div>
  )
}
