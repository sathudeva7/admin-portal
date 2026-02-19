'use client'

import { useState } from 'react'
import { QUICK_TEST_PROMPTS } from '../data'
import styles from './TestTab.module.css'

interface TestTabProps {
  showToast: (msg: string) => void
}

function generateMockResponse(q: string, type: string): string {
  const isSeeker = type.includes('Seeker')
  const isBuilder = type.includes('Builder')

  if (q.toLowerCase().includes('wife') || q.toLowerCase().includes('marriage') || q.toLowerCase().includes('husband')) {
    if (isSeeker)
      return `What you're describing touches something very deep. The desire to grow while feeling alone in that growth — that's one of the most tender pains in a marriage.\n\nRabbi Landau teaches that when we're frustrated that our spouse "won't change," we're often looking at ourselves in a mirror. The question isn't how to bring your wife on board — it's what the gap between you is reflecting about your own inner work.\n\nStart there. Not with her. With the part of you that needs her to change in order to feel at peace. That's where the teshuva actually lives.\n\nWhat does that stir in you?`
    if (isBuilder)
      return `Here's the honest truth: you cannot change your wife. You can only change yourself, and create the conditions where change becomes possible for her too.\n\nRabbi Landau's teaching on shalom bayis is direct: lead by example. Your teshuva should be visible — not preached. When she sees a real shift in you, a softening, a listening — that's when the door opens for her.\n\nOne concrete step: instead of telling her what you want to work on, ask her this week what she needs from you. Just listen. Don't defend. See what opens.`
    return `The pain of wanting to grow together and feeling unseen in that — that's very real, and it's worth honoring before anything else.\n\nIn the Rivnitz path, we believe that every relationship is given to us as an instrument for our own refinement. The friction you feel isn't a sign that something is wrong — it's the very place where your growth is happening.\n\nFor now: what would it look like to focus entirely on your own teshuva, without needing her participation? What changes when the goal becomes your growth, not your shared growth?`
  }

  return `Thank you for bringing this to me. What you're carrying is real and it matters.\n\nRabbi Landau teaches that every challenge we face is precisely calibrated for our growth — not as punishment, but as invitation. The fact that this is weighing on you is itself a sign of your neshama's sensitivity.\n\nLet me ask you this: beneath the struggle you described, what do you feel is the deeper thing you're really longing for? Often the question we ask isn't quite the question underneath the question.\n\nI'm here to go deeper with you.`
}

export default function TestTab({ showToast }: TestTabProps) {
  const [userType, setUserType] = useState('The Seeker (INFJ · Type 4)')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState<'ready' | 'loading' | 'done'>('ready')
  const [meta, setMeta] = useState<{ type: string; words: number; entries: number } | null>(null)

  const runTest = () => {
    if (!question.trim()) { showToast('⚠️ Please enter a test question.'); return }
    setStatus('loading')
    setResult('')
    setMeta(null)
    setTimeout(() => {
      const response = generateMockResponse(question, userType)
      setResult(response)
      setStatus('done')
      const typeLabel = userType.split(' ')[1].replace('(', '').replace(')', '')
      setMeta({ type: typeLabel, words: response.split(' ').length, entries: Math.floor(Math.random() * 3) + 1 })
    }, 1800)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {/* Config */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}><div className={styles.panelTitle}>Test Configuration</div></div>
          <div className={styles.panelBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Simulate User Type</label>
              <select className={styles.select} value={userType} onChange={(e) => setUserType(e.target.value)}>
                <option>The Seeker (INFJ · Type 4)</option>
                <option>The Nurturer (ENFJ · Type 2)</option>
                <option>The Builder (ENTJ · Type 3)</option>
                <option>The Peacemaker (ISFP · Type 9)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Test Question</label>
              <textarea
                className={styles.textarea}
                placeholder="Type a question as if you were a user..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <button className={styles.btnTeal} style={{ width: '100%' }} onClick={runTest}>
              {status === 'loading' ? '⏳ Thinking...' : 'Run Test →'}
            </button>
            <p className={styles.hint}>This calls the real AI using the current knowledge base and settings. Responses cost a small amount (~$0.01).</p>
          </div>
        </div>

        {/* Result */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>AI Response</div>
            <span className={`${styles.badge} ${status === 'done' ? styles.badgeGreen : status === 'loading' ? styles.badgeGold : styles.badgeMuted}`}>
              {status === 'ready' ? 'Ready' : status === 'loading' ? '⏳ Thinking...' : '✓ Response received'}
            </span>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.resultBox}>
              {result ? (
                <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{result}</span>
              ) : (
                <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Run a test to see how the AI responds using your current knowledge base and settings.</span>
              )}
            </div>
            {meta && (
              <div className={styles.metaRow}>
                <span className={`${styles.badge} ${styles.badgeTeal}`}>Type: {meta.type}</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>~{meta.words} words</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>Knowledge entries used: {meta.entries}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick prompts */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}><div className={styles.panelTitle}>Quick Test Prompts</div></div>
        <div className={styles.quickGrid}>
          {QUICK_TEST_PROMPTS.map((p, i) => (
            <div key={i} className={styles.quickCard} onClick={() => setQuestion(p.text)}>
              <div className={styles.quickIcon}>{p.icon}</div>
              <div className={styles.quickText}>{p.text.substring(0, 80)}...</div>
              <div className={styles.quickType}>{p.type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
