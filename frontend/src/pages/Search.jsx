import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import PaperCard from '../components/PaperCard';
import { searchAPI } from '../services/api';
import { AlertCircle, CheckCircle, Clock, Filter, SortAsc } from 'lucide-react';

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              AI 驱动的论文检索
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
              使用 GPT-4 理解您的需求，从多个数据源智能筛选最相关的学术文献
            </p>
          </div>

          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold">10+</div>
              <div className="text-sm text-blue-100">数据源</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">AI</div>
              <div className="text-sm text-blue-100">智能排序</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">&lt;3s</div>
              <div className="text-sm text-blue-100">平均响应</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="mt-12 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <Clock className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">正在智能检索...</p>
                <p className="text-sm text-gray-600 mt-1">
                  提取关键词 → 多源并行搜索 → LLM 筛选排序
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-8 p-6 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-lg">检索出错</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-8">
            {/* Summary Card */}
            <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-900 font-semibold text-lg">
                    检索完成！
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    从 <strong>{results.total_found}</strong> 篇论文中筛选出{' '}
                    <strong>{results.returned}</strong> 篇高相关度文献
                    （耗时 <strong>{results.response_time.toFixed(2)}秒</strong>）
                  </p>

                  {/* Extracted Keywords */}
                  {results.keywords && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        🔑 提取的关键词：
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {results.keywords.core_keywords_zh?.map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                        {results.keywords.core_keywords_en?.map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filters and Sorting */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <SortAsc className="w-5 h-5 text-gray-600" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="relevance">相关度排序</option>
                    <option value="date">发表时间</option>
                    <option value="citations">引用数</option>
                  </select>
                </div>

                {/* Score Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <select
                    value={filterScore}
                    onChange={(e) => setFilterScore(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">全部相关度</option>
                    <option value="6">≥ 6.0 分</option>
                    <option value="7">≥ 7.0 分</option>
                    <option value="8">≥ 8.0 分</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                显示 <strong>{sortedPapers.length}</strong> 篇论文
              </div>
            </div>

            {/* Paper Cards */}
            {sortedPapers.length > 0 ? (
              <div className="space-y-8">
                {/* High Relevance Section */}
                {highRelevance.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-1 w-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        强烈推荐 ({highRelevance.length})
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {highRelevance.map((paper) => (
                        <PaperCard key={paper.id} paper={paper} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Medium Relevance Section */}
                {mediumRelevance.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-1 w-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        相关研究 ({mediumRelevance.length})
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {mediumRelevance.map((paper) => (
                        <PaperCard key={paper.id} paper={paper} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  没有符合条件的论文
                </h3>
                <p className="text-gray-600">
                  尝试调整筛选条件或使用其他关键词
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
