import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './lib/auth'

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const Post = lazy(() => import('./pages/Post').then((module) => ({ default: module.Post })))
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })))
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })))
const Login = lazy(() => import('./admin/Login').then((module) => ({ default: module.Login })))
const Dashboard = lazy(() => import('./admin/Dashboard').then((module) => ({ default: module.Dashboard })))
const Posts = lazy(() => import('./admin/Posts').then((module) => ({ default: module.Posts })))
const Editor = lazy(() => import('./admin/Editor').then((module) => ({ default: module.Editor })))
const Media = lazy(() => import('./admin/Media').then((module) => ({ default: module.Media })))
const AdminLayout = lazy(() => import('./admin/AdminLayout').then((module) => ({ default: module.AdminLayout })))

function RouteLoading() {
  return (
    <div className="route-loading">
      <span className="spinner" />
      <p>正在打开页面…</p>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/posts/:slug" element={<Post />} />
        <Route path="/about" element={<About />} />

        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/new" element={<Editor />} />
          <Route path="posts/:id/edit" element={<Editor />} />
          <Route path="media" element={<Media />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
