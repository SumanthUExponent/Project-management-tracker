import { useState, useRef, useEffect } from 'react'

export default function InlineEdit({ value, onSave, type = 'text', placeholder = '—', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (!editing) {
    return (
      <span
        className={`inline-edit px-1.5 py-0.5 text-sm font-body ${className}`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value || <span className="text-gray-500">{placeholder}</span>}
      </span>
    )
  }

  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
      className={`px-1.5 py-0.5 text-sm font-body bg-gray-100 dark:bg-surface-600 border border-brand/50 rounded outline-none ${className}`}
    />
  )
}
