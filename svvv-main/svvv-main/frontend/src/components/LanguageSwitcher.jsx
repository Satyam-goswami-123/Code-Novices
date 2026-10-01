import React from 'react'
import { useLang, LANGUAGES } from '../i18n.jsx'

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, t } = useLang()

  return (
    <div className={`lang-switcher ${compact ? 'compact' : ''}`} title={t.selectLang}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          className={`lang-btn ${lang === l.code ? 'active' : ''}`}
          onClick={() => setLang(l.code)}
          title={l.name}
          aria-label={`Switch to ${l.name}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
