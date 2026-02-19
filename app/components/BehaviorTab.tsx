'use client'

import { useState } from 'react'
import { ESCALATION_TOPICS, TOPICS } from '../data'
import styles from './BehaviorTab.module.css'

interface BehaviorTabProps {
  showToast: (msg: string) => void
}

const RESPONSE_TOGGLES = [
  { label: 'Always personalize to user\'s type', sub: 'AI uses MBTI, Enneagram, and Rivnitz type in every response' },
  { label: 'Reference Rabbi\'s teachings by name', sub: 'AI can say "Rabbi Landau teaches..." when relevant' },
  { label: 'Include Hebrew/Torah terms', sub: 'Use terms like teshuva, middos, emunah naturally' },
  { label: 'Ask follow-up questions', sub: 'AI can respond with a clarifying question when helpful' },
  { label: 'Recommend videos from the library', sub: 'AI suggests relevant teachings from the video archive' },
  { label: 'Always encourage direct access to Rabbi', sub: 'AI reminds users they can request a live session' },
]

export default function BehaviorTab({ showToast }: BehaviorTabProps) {
  const [responseToggles, setResponseToggles] = useState(RESPONSE_TOGGLES.map(() => true))
  const [topicToggles, setTopicToggles] = useState(TOPICS.map((t) => t.on))
  const [escalationTopics, setEscalationTopics] = useState(ESCALATION_TOPICS)
  const [newTopic, setNewTopic] = useState('')
  const [sensitivity, setSensitivity] = useState(3)

  const sensitivityLabels: Record<number, string> = { 1: 'Only Critical', 2: 'Conservative', 3: 'Balanced', 4: 'Cautious', 5: 'Very Cautious' }

  const flipResponse = (i: number) => {
    const next = [...responseToggles]; next[i] = !next[i]; setResponseToggles(next)
  }
  const flipTopic = (i: number) => {
    const next = [...topicToggles]; next[i] = !next[i]; setTopicToggles(next)
  }
  const addEscalation = () => {
    if (newTopic.trim()) {
      setEscalationTopics([...escalationTopics, newTopic.trim()])
      setNewTopic('')
    }
  }
  const removeEscalation = (i: number) => {
    setEscalationTopics(escalationTopics.filter((_, idx) => idx !== i))
  }

  return (
    <div className={styles.grid}>
      {/* Response Style */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}><div className={styles.panelTitle}>Response Style</div></div>
        <div className={styles.panelBody}>
          {RESPONSE_TOGGLES.map((t, i) => (
            <div key={i} className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.toggleLabel}>{t.label}</div>
                <div className={styles.toggleSub}>{t.sub}</div>
              </div>
              <div className={`${styles.toggle} ${responseToggles[i] ? styles.on : ''}`} onClick={() => flipResponse(i)} />
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Rules */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}><div className={styles.panelTitle}>Escalation Rules</div></div>
        <div className={styles.panelBody}>
          <p className={styles.hint}>When these topics come up, AI flags the question for Rabbi review instead of answering alone.</p>
          <div className={styles.escalationList}>
            {escalationTopics.map((topic, i) => (
              <div key={i} className={styles.escalationItem}>
                <span>⚠️</span>
                <span className={styles.escalationText}>{topic}</span>
                <button className={styles.removeBtn} onClick={() => removeEscalation(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              placeholder="Add topic to escalate..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEscalation()}
            />
            <button className={styles.btnTeal} onClick={addEscalation}>Add</button>
          </div>
          <div className={styles.divider} />
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Escalation Sensitivity <span className={styles.labelSub}>How cautious should AI be?</span>
            </label>
            <input
              type="range" min={1} max={5}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--teal)' }}
            />
            <div className={styles.sensitivityRow}>
              <span>Only critical</span>
              <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{sensitivityLabels[sensitivity]}</span>
              <span>Very cautious</span>
            </div>
          </div>
        </div>
      </div>

      {/* Topics AI handles */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}><div className={styles.panelTitle}>Topics AI Can Help With</div></div>
        <div className={styles.panelBody}>
          {TOPICS.map((t, i) => (
            <div key={i} className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.toggleLabel}>{t.label}</div>
                <div className={styles.toggleSub}>{t.sub}</div>
              </div>
              <div className={`${styles.toggle} ${topicToggles[i] ? styles.on : ''}`} onClick={() => flipTopic(i)} />
            </div>
          ))}
        </div>
      </div>

      {/* Response Format */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}><div className={styles.panelTitle}>Response Format</div></div>
        <div className={styles.panelBody} style={{ gap: 14 }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Response Length</label>
            <select className={styles.select}>
              <option>Concise (1-3 sentences)</option>
              <option defaultValue="true">Balanced (1-2 paragraphs)</option>
              <option>Detailed (up to 4 paragraphs)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tone</label>
            <select className={styles.select}>
              <option>Very warm and gentle</option>
              <option>Warm but direct</option>
              <option>Direct and concise</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Opening Style</label>
            <select className={styles.select}>
              <option>Acknowledge feeling first, then guidance</option>
              <option>Jump straight to wisdom</option>
              <option>Ask a clarifying question first</option>
            </select>
          </div>
          <button className={styles.btnGold} style={{ width: '100%' }} onClick={() => showToast('✓ AI behavior settings saved')}>
            Save Behavior Settings
          </button>
        </div>
      </div>
    </div>
  )
}
