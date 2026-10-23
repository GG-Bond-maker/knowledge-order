import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { CoursePage } from './pages/CoursePage';
import { ChapterPage } from './pages/ChapterPage';
import { PracticePage } from './pages/PracticePage';
import { StatsPage } from './pages/StatsPage';
import { ReviewPage } from './pages/ReviewPage';
import { SpacedReviewPage } from './pages/SpacedReviewPage';
import { PlanPage } from './pages/PlanPage';
import { AdminPage } from './pages/AdminPage';
import { LearningMapPage } from './pages/LearningMapPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/course/:courseId/chapter/:chapterId" element={<ChapterPage />} />
        <Route path="/practice/:courseId/:chapterId" element={<PracticePage />} />
        <Route path="/spaced-review" element={<SpacedReviewPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/learning-map" element={<LearningMapPage />} />`n        <Route path="/learning-map/:domain" element={<LearningMapPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
