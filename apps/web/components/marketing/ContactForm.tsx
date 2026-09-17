'use client'

import React, { useState } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Message Received!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Thank you for reaching out. A member of our engineering team will respond within 24 hours.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSubmitted(false)}
          className="mt-2 text-xs"
        >
          Send Another Message
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Full Name</label>
          <Input required placeholder="Jane Doe" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Work Email</label>
          <Input required type="email" placeholder="jane@company.com" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Subject</label>
        <Input required placeholder="General Inquiry or Enterprise Trial" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Message</label>
        <Textarea required rows={5} placeholder="Tell us how we can help..." />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full gradient-brand text-white gap-2 font-medium shadow-md"
      >
        <Send className="size-4" />
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}
