'use client'

import { useState } from 'react'
import { DEFAULT_SYSTEM_PROMPT } from '../data'
import styles from './SystemPromptTab.module.css'

interface SystemPromptTabProps {
  showToast: (msg: string) => void
}

export default function SystemPromptTab({ showToast }: SystemPromptTabProps) {
  const [prompt, setPrompt] = useState(DEFAULT_SYSTEM_PROMPT)

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>Master System Prompt</div>
            <div className={styles.panelSub}>This is the core instruction set that shapes every AI Coach response. Edit with care.</div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnGhost} onClick={() => { setPrompt(DEFAULT_SYSTEM_PROMPT); showToast('↺ Reset to default prompt') }}>Reset to Default</button>
            <button className={styles.btnTeal} onClick={() => showToast('✓ System prompt saved')}>Save Changes</button>
          </div>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.hint}>
            Variables in <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{'{curly braces}'}</span> are auto-filled per user. The <span style={{ color: 'var(--teal)', fontWeight: 600 }}>[KNOWLEDGE BASE]</span> section is auto-populated from your entries above.
          </p>
          <textarea
            className={styles.promptTextarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className={styles.promptFooter}>
            <span className={styles.charCount}>{prompt.length} characters</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.btnGhost} onClick={() => showToast('👁 Preview — connect to your AI endpoint for live preview')}>Preview Full Prompt</button>
              <button className={styles.btnGold} onClick={() => showToast('✓ Prompt saved and applied to AI coach')}>💾 Save & Apply</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
