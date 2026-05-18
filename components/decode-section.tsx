// components/decode-section.tsx
'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { decodeMessage } from '@/lib/crypto'

export default function DecodeSection() {
  const [key, setKey] = useState('')
  const [decodedMessage, setDecodedMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDecode = async () => {
    const file = fileInputRef.current?.files?.[0]
    setError('')
    setDecodedMessage('')

    if (!file || !key) {
      setError('PNG image and key are required.')
      return
    }

    try {
      const message = await decodeMessage(file, key)
      setDecodedMessage(message)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Decode failed'
      setError(message)
    }
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="decode-image">Upload Grid Image</Label>
          <Input id="decode-image" type="file" accept="image/png" ref={fileInputRef} />
        </div>
        <div>
          <Label htmlFor="decode-key">Key</Label>
          <Input
            type="text"
            placeholder="Enter key..."
            value={key}
            onChange={e => setKey(e.target.value)}
          />
        </div>
        <Button onClick={handleDecode} className="w-full">Decode Message</Button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {decodedMessage && (
        <motion.div
          className="mt-8 p-4 bg-gray-50 rounded border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold mb-2">Decoded Message:</h3>
          <pre className="whitespace-pre-wrap break-words">
            {decodedMessage}
          </pre>
        </motion.div>
      )}
    </motion.div>
  )
}
