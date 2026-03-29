<template>
  <Card
    v-if="expectedHash"
    as="div"
    class="fn-sha256-prover"
  >
    <div class="fn-sha256-prover-header">
      <div>
        <div class="fn-sha256-prover-eyebrow">Content Proof</div>
        <div class="fn-sha256-prover-title">
          {{ contentLabel }}
        </div>
      </div>
      <div
        class="fn-sha256-prover-badge"
        :class="badgeClass"
      >
        {{ statusLabel }}
      </div>
    </div>

    <div class="fn-sha256-prover-copy">
      The contract stores a SHA-256 fingerprint of the canonical image file. This
      panel fetches that file from GitHub in your browser, hashes the exact bytes
      with JavaScript, and checks whether the computed digest matches the onchain
      value.
    </div>

    <div class="fn-sha256-prover-preview">
      <img
        :src="sourceUrl"
        :alt="contentLabel"
        loading="lazy"
      />
    </div>

    <div class="fn-sha256-prover-links">
      <a
        :href="sourcePageUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        View source on GitHub
      </a>
      <a
        v-if="explanationUrl"
        :href="explanationUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn why this hash matters
      </a>
    </div>

    <div class="fn-sha256-prover-grid">
      <div class="fn-sha256-prover-field">
        <span class="fn-sha256-prover-label">Onchain hash</span>
        <code>{{ expectedHash }}</code>
      </div>
      <div class="fn-sha256-prover-field">
        <span class="fn-sha256-prover-label">Computed hash</span>
        <code>{{ actualHash || 'Computing...' }}</code>
      </div>
      <div class="fn-sha256-prover-field">
        <span class="fn-sha256-prover-label">Bytes hashed</span>
        <code>{{ byteCountLabel }}</code>
      </div>
    </div>

    <div
      v-if="error"
      class="fn-sha256-prover-error"
    >
      {{ error }}
    </div>

    <div class="fn-sha256-prover-explainer">
      SHA-256 always turns the same file bytes into the same 64-character hex digest.
      If even one byte changes, the digest changes completely. A match therefore proves
      the GitHub file and the contract’s stored fingerprint describe the same image.
    </div>
  </Card>
</template>

<script setup lang="ts">
import { Card } from '@1001-digital/components'
import type { FunctionCustomComponentConfig } from '~/types/metadata'

const props = defineProps<{
  value: string
  config: FunctionCustomComponentConfig
}>()

const actualHash = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const byteCount = ref<number | null>(null)

const defaultSourceUrl =
  'https://raw.githubusercontent.com/larvalabs/cryptopunks/master/punks.png'
const defaultSourcePageUrl =
  'https://github.com/larvalabs/cryptopunks/blob/master/punks.png'
const defaultExplanationUrl = 'https://punks.vv.xyz/the-art/the-punk-image'

const expectedHash = computed(() => normalizeHash(props.value))
const sourceUrl = computed(
  () => String(props.config.props?.sourceUrl || defaultSourceUrl),
)
const sourcePageUrl = computed(
  () => String(props.config.props?.sourcePageUrl || defaultSourcePageUrl),
)
const explanationUrl = computed(() => {
  const value = props.config.props?.explanationUrl
  return value ? String(value) : defaultExplanationUrl
})
const contentLabel = computed(
  () => String(props.config.props?.contentLabel || 'Canonical image file'),
)

const isMatch = computed(
  () =>
    !!expectedHash.value &&
    !!actualHash.value &&
    expectedHash.value === actualHash.value,
)

const statusLabel = computed(() => {
  if (loading.value) return 'Verifying'
  if (error.value) return 'Unavailable'
  if (!actualHash.value) return 'Waiting'
  return isMatch.value ? 'Verified' : 'Mismatch'
})

const badgeClass = computed(() => {
  if (loading.value) return 'is-loading'
  if (error.value) return 'is-error'
  if (!actualHash.value) return 'is-muted'
  return isMatch.value ? 'is-success' : 'is-error'
})

const byteCountLabel = computed(() => {
  if (byteCount.value === null) return '-'
  return new Intl.NumberFormat().format(byteCount.value)
})

watch(
  [expectedHash, sourceUrl],
  () => {
    verify()
  },
  { immediate: true },
)

async function verify() {
  actualHash.value = null
  error.value = null
  byteCount.value = null

  if (!import.meta.client) return
  if (!expectedHash.value) return
  if (!window.crypto?.subtle) {
    error.value = 'This browser does not expose the Web Crypto API needed for SHA-256 verification.'
    return
  }

  loading.value = true

  try {
    const response = await fetch(sourceUrl.value, { cache: 'force-cache' })
    if (!response.ok) {
      throw new Error(`Could not fetch source file (${response.status}).`)
    }

    const buffer = await response.arrayBuffer()
    byteCount.value = buffer.byteLength
    const digest = await window.crypto.subtle.digest('SHA-256', buffer)
    actualHash.value = toHex(digest)
  } catch (err: any) {
    error.value =
      err?.message ||
      'Could not fetch and hash the source image in the browser.'
  } finally {
    loading.value = false
  }
}

function normalizeHash(value: unknown): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^0x/, '')

  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : ''
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
</script>

<style>
.fn-sha256-prover.card {
  margin-top: var(--size-4);
  --card-background: var(--surface-4);
  gap: 0;
}

.fn-sha256-prover-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--size-4);
  margin-bottom: var(--size-3);
}

.fn-sha256-prover-eyebrow {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fn-sha256-prover-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--color);
  line-height: 1.2;
  margin-top: var(--size-1);
}

.fn-sha256-prover-badge {
  padding: var(--size-1) var(--size-2);
  border-radius: 999px;
  font-size: var(--font-xs);
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: var(--surface-3);
  color: var(--muted);
}

.fn-sha256-prover-badge.is-loading,
.fn-sha256-prover-badge.is-muted {
  color: var(--muted);
}

.fn-sha256-prover-badge.is-success {
  color: #0a7a45;
  border-color: rgba(10, 122, 69, 0.25);
  background: rgba(10, 122, 69, 0.08);
}

.fn-sha256-prover-badge.is-error {
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 24%, transparent);
  background: color-mix(in srgb, var(--error) 10%, transparent);
}

.fn-sha256-prover-copy,
.fn-sha256-prover-explainer {
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--muted);
}

.fn-sha256-prover-preview {
  margin: var(--size-4) 0;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  background: #000;
  aspect-ratio: 1 / 1;
}

.fn-sha256-prover-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fn-sha256-prover-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  margin-bottom: var(--size-4);
}

.fn-sha256-prover-links a {
  color: var(--primary);
  font-size: var(--font-sm);
  text-decoration: none;
}

.fn-sha256-prover-grid {
  display: grid;
  gap: var(--size-3);
  margin-bottom: var(--size-4);
}

.fn-sha256-prover-field {
  display: grid;
  gap: var(--size-1);
}

.fn-sha256-prover-label {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fn-sha256-prover-field code {
  display: block;
  padding: var(--size-2) var(--size-3);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background: var(--surface-3);
  color: var(--color);
  font-size: var(--font-xs);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.fn-sha256-prover-error {
  margin-bottom: var(--size-4);
  font-size: var(--font-sm);
  color: var(--error);
}
</style>
