import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ErrorState } from '../components/ErrorState'

export function NotFound() {
  return (
    <div className="site">
      <Header />
      <main>
        <ErrorState message="你访问的路径不存在，也可能是一段还没写完的航线。" />
      </main>
      <Footer />
    </div>
  )
}
