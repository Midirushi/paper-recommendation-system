import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import PaperCard from '../components/PaperCard';
import { searchAPI } from '../services/api';
import { AlertCircle, CheckCircle, Clock, Filter, SortAsc, Sparkles } from 'lucide-react';

const Search = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'date' | 'citations'
  const [filterScore, setFilterScore] = useState(0); // minimum relevance score

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await searchAPI.search(query);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSortedPapers = () => {
    if (!results?.papers) return [];

    let papers = [...results.papers];

    // Apply score filter
    if (filterScore > 0) {
      papers = papers.filter(p => (p.relevance_score || 0) >= filterScore);
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        return papers.sort((a, b) => {
          const dateA = new Date(a.publish_date || 0);
          const dateB = new Date(b.publish_date || 0);
          return dateB - dateA;
        });
      case 'citations':
        return papers.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
      case 'relevance':
      default:
        return papers.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    }
  };

  const sortedPapers = getSortedPapers();
  const highRelevance = sortedPapers.filter(p => (p.relevance_score || 0) >= 8);
  const mediumRelevance = sortedPapers.filter(p => (p.relevance_score || 0) < 8);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Centered with Equal Margins */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white relative overflow-hidden"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-20"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
                y: Math.random() * 400,
              }}
              animate={{
                y: [null, Math.random() * 400 - 50],
                x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200)],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          ))}
        </div>

        {/* Centered Container */}
        <div className="max-w-6xl mx-auto px-8 py-20 relative z-10">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-12"
          >
            {/* Enhanced Title */}
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 flex items-center justify-center gap-4 leading-tight">
              <Sparkles className="w-12 h-12 flex-shrink-0" />
              <span>AI 驱动的论文检索</span>
              <Sparkles className="w-12 h-12 flex-shrink-0" />
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-blue-50 leading-relaxed font-light tracking-wide">
              使用 GPT-4 理解您的需求，从多个数据源智能筛选最相关的学术文献
            </p>
          </motion.div>

          {/* Search Bar */}
          <div className="mb-12">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>

          {/* Stats Grid - Centered */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { value: '10+', label: '数据源', desc: 'CNKI, Scholar' },
              { value: 'AI', label: '智能排序', desc: 'GPT-4 筛选' },
              { value: '<3s', label: '平均响应', desc: '毫秒级检索' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center cursor-pointer bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all"
              >
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm text-blue-100 font-medium mb-1">{stat.label}</div>
                <div className="text-xs text-blue-200 opacity-80">{stat.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content - Centered with Equal Margins */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-12 flex justify-center"
            >
              <div className="inline-flex flex-col items-center gap-6 bg-white rounded-2xl shadow-lg p-12 w-full max-w-md">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full"
                  />
                  <Clock className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <motion.p
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-xl font-semibold text-gray-900 mb-2"
                  >
                    正在智能检索...
                  </motion.p>
                  <p className="text-sm text-gray-600">
                    提取关键词 → 多源并行搜索 → LLM 筛选排序
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Error State - Unified Design */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 bg-white rounded-2xl shadow-lg border-2 border-red-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-red-900">检索出错</h3>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm font-medium text-red-800 mb-1">错误信息：</p>
                  <p className="text-sm text-red-700 font-mono">{error}</p>
                </div>
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setError(null)}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700
                             transition-colors font-medium shadow-md hover:shadow-lg"
                  >
                    重新尝试
                  </motion.button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200
                             transition-colors font-medium"
                  >
                    刷新页面
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results - Improved Spacing */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 space-y-8"
            >
              {/* Summary Card - Better Visual Hierarchy */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-green-200">
                  <div className="flex items-start gap-4">
                    <motion.div
                      animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6 }}
                      className="p-2 bg-green-500 rounded-lg"
                    >
                      <CheckCircle className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-green-900 mb-2">
                        检索完成！
                      </h2>
                      <p className="text-base text-green-700 leading-relaxed">
                        从 <strong className="text-green-900 text-lg">{results.total_found}</strong> 篇论文中筛选出{' '}
                        <strong className="text-green-900 text-lg">{results.returned}</strong> 篇高相关度文献
                        （耗时 <strong className="text-green-900">{results.response_time.toFixed(2)}秒</strong>）
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extracted Keywords - Enhanced Spacing */}
                {results.keywords && (
                  <div className="px-6 py-6">
                    <p className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🔑</span>
                      <span>提取的关键词</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {results.keywords.core_keywords_zh?.map((kw, idx) => (
                        <motion.span
                          key={`zh-${idx}`}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05, type: 'spring' }}
                          whileHover={{ scale: 1.1, y: -2 }}
                          className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold cursor-pointer
                                   hover:bg-green-200 transition-colors shadow-sm"
                        >
                          {kw}
                        </motion.span>
                      ))}
                      {results.keywords.core_keywords_en?.map((kw, idx) => (
                        <motion.span
                          key={`en-${idx}`}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5 + idx * 0.05, type: 'spring' }}
                          whileHover={{ scale: 1.1, y: -2 }}
                          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold cursor-pointer
                                   hover:bg-blue-200 transition-colors shadow-sm"
                        >
                          {kw}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Filters and Sorting - Better Spacing */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-6 items-center justify-between bg-white p-6 rounded-xl shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Sort Options */}
                  <div className="flex items-center gap-3">
                    <SortAsc className="w-5 h-5 text-gray-600" />
                    <label className="text-sm font-medium text-gray-700 mr-2">排序方式</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="relevance">相关度排序</option>
                      <option value="date">发表时间</option>
                      <option value="citations">引用数</option>
                    </select>
                  </div>

                  {/* Score Filter */}
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <label className="text-sm font-medium text-gray-700 mr-2">最小相关度</label>
                    <select
                      value={filterScore}
                      onChange={(e) => setFilterScore(Number(e.target.value))}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="0">全部相关度</option>
                      <option value="6">≥ 6.0 分</option>
                      <option value="7">≥ 7.0 分</option>
                      <option value="8">≥ 8.0 分</option>
                    </select>
                  </div>
                </div>

                <div className="text-base text-gray-700 font-medium bg-blue-50 px-4 py-2 rounded-lg">
                  显示 <strong className="text-blue-600 text-lg">{sortedPapers.length}</strong> 篇论文
                </div>
              </motion.div>

              {/* Paper Cards - Better Spacing */}
              {sortedPapers.length > 0 ? (
                <div className="space-y-10 mt-8">
                  {/* High Relevance Section */}
                  {highRelevance.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <motion.div
                          className="h-1.5 w-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: 64 }}
                          transition={{ duration: 0.5 }}
                        />
                        <h2 className="text-3xl font-bold text-gray-900">
                          强烈推荐
                        </h2>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          {highRelevance.length} 篇
                        </span>
                      </div>
                      <div className="space-y-6">
                        {highRelevance.map((paper, idx) => (
                          <motion.div
                            key={paper.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <PaperCard paper={paper} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Medium Relevance Section */}
                  {mediumRelevance.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <motion.div
                          className="h-1.5 w-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: 64 }}
                          transition={{ duration: 0.5 }}
                        />
                        <h2 className="text-3xl font-bold text-gray-900">
                          相关研究
                        </h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          {mediumRelevance.length} 篇
                        </span>
                      </div>
                      <div className="space-y-6">
                        {mediumRelevance.map((paper, idx) => (
                          <motion.div
                            key={paper.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <PaperCard paper={paper} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-lg p-16 text-center mt-8"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Filter className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    没有符合条件的论文
                  </h3>
                  <p className="text-gray-600 text-lg mb-6">
                    尝试调整筛选条件或使用其他关键词
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setFilterScore(0)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                               transition-colors font-medium shadow-md hover:shadow-lg"
                    >
                      重置筛选条件
                    </button>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200
                               transition-colors font-medium"
                    >
                      返回首页
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Search;
