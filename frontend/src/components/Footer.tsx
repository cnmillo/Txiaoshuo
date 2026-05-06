import { Github, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white border-t shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-1 md:space-y-0">
          <div className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} 全自动小说生成器. 保留所有权利.
          </div>
          <div className="flex items-center space-x-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <span className="flex items-center text-sm text-gray-500">
              用 <Heart className="w-4 h-4 mx-1 text-red-500" /> 打造
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
