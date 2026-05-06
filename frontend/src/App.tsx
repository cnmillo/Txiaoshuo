import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'

const Generate = lazy(() => import('./pages/Generate'))
const Novels = lazy(() => import('./pages/Novels'))
const NovelDetail = lazy(() => import('./pages/NovelDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const StyleSettings = lazy(() => import('./pages/StyleSettings'))
const StoryPlan = lazy(() => import('./pages/StoryPlan'))
const ConsistencyManagement = lazy(() => import('./pages/ConsistencyManagement'))
const AIDirectorPage = lazy(() => import('./pages/AIDirectorPage'))
const ChapterExecutionPage = lazy(() => import('./pages/ChapterExecutionPage'))
const TaskCenterPage = lazy(() => import('./pages/TaskCenterPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )
}

function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/ai-director" element={<AIDirectorPage />} />
          <Route path="/story-plan" element={<StoryPlan />} />
          <Route path="/chapter-execution" element={<ChapterExecutionPage />} />
          <Route path="/chapter-execution/:workflowId" element={<ChapterExecutionPage />} />
          <Route path="/novels" element={<Novels />} />
          <Route path="/novels/:id" element={<NovelDetail />} />
          <Route path="/consistency/:novelId" element={<ConsistencyManagement />} />
          <Route path="/consistency/:novelId/:chapterId" element={<ConsistencyManagement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/styles" element={<StyleSettings />} />
          <Route path="/tasks" element={<TaskCenterPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
