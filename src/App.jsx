import { NavLink, Route, Routes } from 'react-router-dom'
import styles from './App.module.css'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { VocabularyPage } from './pages/Vocabulary/VocabularyPage'
import { GrammarPage } from './pages/Grammar/GrammarPage'
import { ListeningPage } from './pages/Listening/ListeningPage'
import { ReadingPage } from './pages/Reading/ReadingPage'
import { WritingPage } from './pages/Writing/WritingPage'
import { MockExamPage } from './pages/MockExam/MockExamPage'
import { ProgressPage } from './pages/Progress/ProgressPage'
import { OfficialTestsPage } from './pages/OfficialTests/OfficialTestsPage'
import { HSKKPage } from './pages/HSKK/HSKKPage'

const nav = [
  { to: '/', label: 'Главная', end: true },
  { to: '/words', label: 'Слова' },
  { to: '/grammar', label: 'Грамматика' },
  { to: '/listening', label: 'Аудирование' },
  { to: '/reading', label: 'Чтение' },
  { to: '/writing', label: 'Письмо' },
  { to: '/mock', label: 'Полный тест' },
  { to: '/progress', label: 'Прогресс' },
]

const mobileNav = [
  { to: '/', label: 'Главная', emoji: '🏠', end: true },
  { to: '/words', label: 'Слова', emoji: '🀄' },
  { to: '/mock', label: 'Тест', emoji: '📝' },
  { to: '/progress', label: 'Прогресс', emoji: '📈' },
]

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.title}>HSK 3 — тренажёр</div>
          <div className={styles.subtitle}>只要功夫深，铁杵磨成针</div>
        </div>
        <nav className={styles.nav} aria-label="Навигация">
          {nav.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/words" element={<VocabularyPage />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/mock" element={<MockExamPage />} />
          <Route path="/official" element={<OfficialTestsPage />} />
          <Route path="/hskk" element={<HSKKPage />} />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </main>

      <footer className={styles.footer}>
        <span>Данные и прогресс хранятся локально (localStorage).</span>
      </footer>

      <nav className={styles.mobileBar} aria-label="Быстрая мобильная навигация">
        {mobileNav.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) => [styles.mobileLink, isActive ? styles.mobileLinkActive : ''].filter(Boolean).join(' ')}
          >
            <span className={styles.mobileEmoji} aria-hidden="true">
              {i.emoji}
            </span>
            <span>{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
