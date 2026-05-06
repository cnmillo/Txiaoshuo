import { Link } from 'react-router-dom'
import { Sparkles, FileText, Zap, Shield, BookOpen, Wand2 } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI智能生成',
    description: '基于先进的AI技术，一键生成高质量小说内容，支持多种风格和题材。'
  },
  {
    icon: FileText,
    title: '多种格式导出',
    description: '支持TXT、PDF、EPUB等多种格式导出，方便您在不同设备上阅读。'
  },
  {
    icon: Zap,
    title: '快速创作',
    description: '只需输入一句话或大纲，即可快速生成长篇小说，大大提升创作效率。'
  },
  {
    icon: Shield,
    title: '去除AI痕迹',
    description: '智能优化算法，去除AI生成痕迹，让内容更加自然流畅。'
  }
]

const steps = [
  {
    number: '01',
    title: '输入创意',
    description: '输入一句话或小说大纲，描述您的创作想法。'
  },
  {
    number: '02',
    title: '选择风格',
    description: '选择小说风格、类型和字数要求。'
  },
  {
    number: '03',
    title: '生成小说',
    description: '点击生成按钮，等待AI为您创作完整小说。'
  }
]

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <Wand2 className="w-5 h-5" />
              <span className="text-sm font-medium">基于AI的小说创作工具</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              让AI为您创作
              <span className="block text-secondary-300">精彩小说</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-10 leading-relaxed">
              全自动小说生成器，帮您快速创作高质量小说内容。
              <br className="hidden md:block" />
              支持长篇创作，去除AI痕迹，让故事更加生动自然。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/generate"
                className="w-full sm:w-auto px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                开始创作
              </Link>
              <Link
                to="/novels"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-colors duration-200 border border-white/20"
              >
                查看我的小说
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              强大功能，助力创作
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              我们提供全方位的AI小说创作工具，让您的创作之旅更加顺畅
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="card p-8 hover:-translate-y-1 transition-transform duration-200"
                >
                  <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              简单三步，开始创作
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              无需复杂操作，只需简单三步即可完成小说创作
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="card p-8 text-center">
                  <span className="text-5xl font-bold text-primary-100 block mb-4">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            准备好开始您的小说创作之旅了吗？
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            立即体验全自动小说生成器，让AI成为您的创作助手
          </p>
          <Link
            to="/generate"
            className="inline-block px-10 py-4 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            免费开始创作
          </Link>
        </div>
      </section>
    </div>
  )
}
