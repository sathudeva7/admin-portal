'use client'

/**
 * Donations & Revenue page
 *
 * Firestore collections read:
 *  • donations  — individual one-time donations (prayer requests, candle
 *                 lightings, blessings, general)
 *  • users      — queried where membershipTier == 'premium' to count active
 *                 subscribers and derive recurring revenue
 *
 * Donation document shape:
 *  {
 *    userId:        string
 *    userName:      string
 *    userEmail:     string
 *    type:          'prayer_request' | 'candle_lighting' | 'blessing' | 'general' | 'subscription'
 *    amount:        number          (USD)
 *    note?:         string
 *    status:        'completed' | 'pending' | 'refunded'
 *    paymentMethod: 'stripe' | 'manual'
 *    createdAt:     Timestamp
 *  }
 */

import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, limit,
  getDocs, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAdminAuth } from '../lib/useAdminAuth'
import styles from './page.module.css'

// ── Constants ─────────────────────────────────────────────────────
const SUBSCRIPTION_PRICE_USD = 29.99
const STATS_LIMIT            = 500   // max donations loaded for analytics

// ── Types ─────────────────────────────────────────────────────────
type DonationType = 'prayer_request' | 'candle_lighting' | 'blessing' | 'general' | 'subscription'
type FilterType   = DonationType | 'all'

interface Donation {
  id:            string
  userId:        string
  userName:      string
  userEmail:     string
  type:          DonationType
  amount:        number
  note?:         string
  status:        'completed' | 'pending' | 'refunded'
  paymentMethod: 'stripe' | 'manual'
  createdAt:     { seconds: number; nanoseconds: number } | null
}

// ── UI metadata per type ──────────────────────────────────────────
const TYPE_META: Record<DonationType, { label: string; icon: string; color: string }> = {
  prayer_request:  { label: 'Prayer Request',  icon: '🙏', color: '#1B6B6B' },
  candle_lighting: { label: 'Candle Lighting', icon: '🕯️', color: '#D4933A' },
  blessing:        { label: 'Blessing',        icon: '✨', color: '#8B6BAE' },
  general:         { label: 'General',         icon: '💝', color: '#4CAF82' },
  subscription:    { label: 'Subscription',    icon: '💳', color: '#3D7CC9' },
}

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',             label: 'All' },
  { key: 'prayer_request',  label: '🙏 Prayer' },
  { key: 'candle_lighting', label: '🕯️ Candle' },
  { key: 'blessing',        label: '✨ Blessing' },
  { key: 'general',         label: '💝 General' },
  { key: 'subscription',    label: '💳 Subscriptions' },
]

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(ts: { seconds: number } | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function isThisMonth(ts: { seconds: number } | null | undefined): boolean {
  if (!ts) return false
  const d = new Date(ts.seconds * 1000)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function monthKey(ts: { seconds: number } | null): string {
  if (!ts) return ''
  const d = new Date(ts.seconds * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function exportCSV(donations: Donation[]) {
  const headers = ['Date', 'Member', 'Email', 'Type', 'Amount (USD)', 'Status', 'Payment Method', 'Note']
  const rows = donations.map(d => [
    formatDate(d.createdAt),
    d.userName,
    d.userEmail,
    TYPE_META[d.type]?.label ?? d.type,
    d.amount.toFixed(2),
    d.status,
    d.paymentMethod,
    d.note ?? '',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `rivnitz-donations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page component ────────────────────────────────────────────────
const PAGE_SIZE = 25

export default function DonationsPage() {
  const { ready } = useAdminAuth()

  const [allDonations, setAllDonations] = useState<Donation[]>([])
  const [premiumCount, setPremiumCount] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<FilterType>('all')
  const [page, setPage]                 = useState(1)

  // ── Load data from Firestore ──────────────────────────────────
  useEffect(() => {
    if (!ready) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        // 1. Count premium subscribers
        const premSnap = await getDocs(
          query(collection(db, 'users'), where('membershipTier', '==', 'premium'))
        )
        if (!cancelled) setPremiumCount(premSnap.size)

        // 2. Load latest donations for analytics + table
        const donSnap = await getDocs(
          query(collection(db, 'donations'), orderBy('createdAt', 'desc'), limit(STATS_LIMIT))
        )
        if (!cancelled) {
          setAllDonations(donSnap.docs.map(d => ({ id: d.id, ...d.data() } as Donation)))
        }
      } catch (e) {
        console.error('[donations] load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [ready])

  // Reset pagination when filter changes
  useEffect(() => { setPage(1) }, [filter])

  if (!ready) return null

  // ── Derived stats ─────────────────────────────────────────────
  const completed = allDonations.filter(d => d.status === 'completed')

  const totalDonationRevenue   = completed.reduce((s, d) => s + d.amount, 0)
  const subscriptionRevenue    = premiumCount * SUBSCRIPTION_PRICE_USD
  const totalRevenue           = totalDonationRevenue + subscriptionRevenue

  const thisMonthDonations     = completed.filter(d => isThisMonth(d.createdAt))
  const thisMonthDonRev        = thisMonthDonations.reduce((s, d) => s + d.amount, 0)
  const thisMonthRevenue       = thisMonthDonRev + subscriptionRevenue

  const nonSubCompleted        = completed.filter(d => d.type !== 'subscription')
  const avgDonation            = nonSubCompleted.length > 0
    ? nonSubCompleted.reduce((s, d) => s + d.amount, 0) / nonSubCompleted.length
    : 0

  // ── Type breakdown ────────────────────────────────────────────
  const typeBreakdown = (Object.keys(TYPE_META) as DonationType[]).map(type => {
    const items = completed.filter(d => d.type === type)
    return { type, count: items.length, total: items.reduce((s, d) => s + d.amount, 0) }
  })
  const maxTypeTotal = Math.max(...typeBreakdown.map(t => t.total), 1)

  // ── Monthly revenue (last 6 months) ──────────────────────────
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d     = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    const key   = monthKey({ seconds: Math.floor(d.getTime() / 1000) })
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const donTotal = completed
      .filter(d2 => monthKey(d2.createdAt) === key)
      .reduce((s, d2) => s + d2.amount, 0)
    // Add subscription revenue only to the current month
    const total = i === 5 ? donTotal + subscriptionRevenue : donTotal
    return { key, label, total }
  })
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1)

  // ── Filtered + paginated table data ──────────────────────────
  const filtered  = filter === 'all' ? allDonations : allDonations.filter(d => d.type === filter)
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const tableRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Render ────────────────────────────────────────────────────
  return (
    <main className={styles.main}>

      {/* Topbar */}
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.pageTitle}>💳 Donations & Revenue</h1>
          <p className={styles.pageSub}>Track donations, subscriptions, and financial history</p>
        </div>
        <button className={styles.btnExport} onClick={() => exportCSV(allDonations)}>
          ↓ Export CSV
        </button>
      </div>

      <div className={styles.content}>

        {/* ── Stats row ─────────────────────────────────────── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statValue}>{formatMoney(totalRevenue)}</div>
            <div className={styles.statLabel}>Total Revenue</div>
            <div className={styles.statSub}>all time</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📅</div>
            <div className={styles.statValue}>{formatMoney(thisMonthRevenue)}</div>
            <div className={styles.statLabel}>This Month</div>
            <div className={styles.statSub}>{formatMoney(thisMonthDonRev)} donations + {formatMoney(subscriptionRevenue)} subs</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardPremium}`}>
            <div className={styles.statIcon}>⭐</div>
            <div className={styles.statValue}>{premiumCount.toLocaleString()}</div>
            <div className={styles.statLabel}>Active Subscribers</div>
            <div className={styles.statSub}>{formatMoney(subscriptionRevenue)}/mo recurring</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💝</div>
            <div className={styles.statValue}>{avgDonation > 0 ? `$${avgDonation.toFixed(2)}` : '—'}</div>
            <div className={styles.statLabel}>Avg Donation</div>
            <div className={styles.statSub}>{nonSubCompleted.length} total donations</div>
          </div>
        </div>

        {/* ── Charts row ─────────────────────────────────────── */}
        <div className={styles.chartsRow}>

          {/* Monthly bar chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>Revenue — Last 6 Months</span>
              <span className={styles.chartSub}>donations + subscriptions</span>
            </div>
            {loading ? (
              <div className={styles.chartSkeleton} />
            ) : (
              <div className={styles.barChart}>
                {monthlyData.map(m => (
                  <div key={m.key} className={styles.barCol}>
                    <div className={styles.barAmtLabel}>
                      {m.total > 0 ? formatMoney(m.total) : ''}
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.bar}
                        style={{ height: `${Math.max((m.total / maxMonthly) * 100, m.total > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <div className={styles.barMonthLabel}>{m.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Donation type breakdown */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>Breakdown by Type</span>
              <span className={styles.chartSub}>completed donations</span>
            </div>
            {loading ? (
              <div className={styles.breakdownSkeleton}>
                {[...Array(5)].map((_, i) => <div key={i} className={styles.skeletonLine} />)}
              </div>
            ) : (
              <div className={styles.breakdownList}>
                {typeBreakdown.map(({ type, count, total }) => {
                  const meta = TYPE_META[type]
                  const pct  = maxTypeTotal > 0 ? (total / maxTypeTotal) * 100 : 0
                  return (
                    <div key={type} className={styles.breakdownRow}>
                      <div className={styles.breakdownLeft}>
                        <span className={styles.breakdownIcon}>{meta.icon}</span>
                        <div>
                          <div className={styles.breakdownLabel}>{meta.label}</div>
                          <div className={styles.breakdownCount}>
                            {count} {count === 1 ? 'donation' : 'donations'}
                          </div>
                        </div>
                      </div>
                      <div className={styles.breakdownRight}>
                        <div className={styles.breakdownAmount}>
                          {total > 0 ? formatMoney(total) : '—'}
                        </div>
                        <div className={styles.breakdownBarTrack}>
                          <div
                            className={styles.breakdownBar}
                            style={{ width: `${pct}%`, background: meta.color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Subscription callout ──────────────────────────── */}
        <div className={styles.subCallout}>
          <div className={styles.subCalloutLeft}>
            <span className={styles.subCalloutIcon}>⭐</span>
            <div>
              <div className={styles.subCalloutTitle}>Premium Subscriptions</div>
              <div className={styles.subCalloutSub}>
                {premiumCount} active member{premiumCount !== 1 ? 's' : ''} · ${SUBSCRIPTION_PRICE_USD}/month each
              </div>
            </div>
          </div>
          <div className={styles.subCalloutStats}>
            <div className={styles.subStat}>
              <div className={styles.subStatValue}>{formatMoney(subscriptionRevenue)}</div>
              <div className={styles.subStatLabel}>Monthly MRR</div>
            </div>
            <div className={styles.subStat}>
              <div className={styles.subStatValue}>{formatMoney(subscriptionRevenue * 12)}</div>
              <div className={styles.subStatLabel}>Annualised ARR</div>
            </div>
          </div>
        </div>

        {/* ── Donations table ─────────────────────────────────── */}
        <div className={styles.tableCard}>
          <div className={styles.tableTopbar}>
            <div className={styles.tableTitle}>
              Donation History
              {!loading && (
                <span className={styles.tableCount}>{filtered.length} records</span>
              )}
            </div>
            <div className={styles.filterTabs}>
              {FILTER_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`${styles.filterTab} ${filter === key ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className={styles.skeletonList}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={styles.skeletonRow}>
                  {[14, 20, 16, 8, 10, 25].map((w, j) => (
                    <div key={j} className={styles.skeletonCell} style={{ width: `${w}%` }} />
                  ))}
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💳</div>
              <div className={styles.emptyTitle}>No donations yet</div>
              <div className={styles.emptySub}>
                Donations will appear here as members contribute via the app.
              </div>
            </div>
          ) : (
            <>
              {/* Table head */}
              <div className={styles.tableHead}>
                <div className={styles.thDate}>Date</div>
                <div className={styles.thUser}>Member</div>
                <div className={styles.thType}>Type</div>
                <div className={styles.thAmount}>Amount</div>
                <div className={styles.thStatus}>Status</div>
                <div className={styles.thNote}>Note / Intention</div>
              </div>

              {/* Table rows */}
              <div className={styles.tableBody}>
                {tableRows.map(d => {
                  const meta = TYPE_META[d.type] ?? TYPE_META.general
                  return (
                    <div key={d.id} className={styles.tableRow}>
                      <div className={styles.tdDate}>{formatDate(d.createdAt)}</div>
                      <div className={styles.tdUser}>
                        <div className={styles.tdUserName}>{d.userName || '—'}</div>
                        <div className={styles.tdUserEmail}>{d.userEmail || ''}</div>
                      </div>
                      <div className={styles.tdType}>
                        <span
                          className={styles.typeBadge}
                          style={{ background: `${meta.color}18`, color: meta.color }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <div className={styles.tdAmount}>${d.amount.toFixed(2)}</div>
                      <div className={styles.tdStatus}>
                        <span className={`${styles.statusBadge} ${styles[`status_${d.status}`]}`}>
                          {d.status}
                        </span>
                      </div>
                      <div className={styles.tdNote}>{d.note || '—'}</div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    ← Prev
                  </button>
                  <span className={styles.pageInfo}>
                    Page {page} of {pageCount}
                  </span>
                  <button
                    className={styles.pageBtn}
                    disabled={page === pageCount}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </main>
  )
}
