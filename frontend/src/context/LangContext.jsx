import { createContext, useContext, useState, useEffect } from 'react'
import { translations, LEVEL_NAMES } from '../i18n'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ru')

  const changeLang = (l) => {
    setLang(l)
    localStorage.setItem('lang', l)
  }

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key
  const levelName = (lvl) => LEVEL_NAMES[lang]?.[lvl] || LEVEL_NAMES.en[lvl] || lvl
  const translation = (word, lang2 = lang) =>
    lang2 === 'kz' ? word.translation_kz : word.translation_ru

  return (
    <LangContext.Provider value={{ lang, changeLang, t, levelName, translation }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
