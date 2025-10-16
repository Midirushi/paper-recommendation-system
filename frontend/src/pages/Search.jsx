import { useState } from 'react';
import SearchBar from '../components/SearchBar';
import PaperCard from '../components/PaperCard';
import { searchAPI } from '../services/api';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Search = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            论文智能推荐系统
          </h1>
          <p className="text-gray-600 mt-2">
            基于AI的学术文献检索与推荐平台
          </p>
        </div>
      </header>
      
      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <SearchBar onSearch={handleSearch} loading={loading} />
        
        {/* Loading State */}
        {loading && (
          <div className="mt-12 text-center">
            <div className="inline-block animate-pulse">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600">
              正在检索多个数据源，分析相关度...
            </p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">检索出错</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {/* Results */}
        {results && (
          <div className="mt-12">
            {/* Summary */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-900">
                  <strong>检索完成</strong>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  从 {results.total_found} 篇论文中筛选出 {results.returned} 篇高相关度文献
                  （耗时 {results.response_time.toFixed(2)}秒）
                </p>
                
                {/* Extracted Keywords */}
                {results.keywords && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      提取的关键词：
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {results.keywords.core_keywords_zh?.map((kw, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                      {results.keywords.core_keywords_en?.map((kw, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Paper Cards */}
            {results.papers.length > 0 ? (
              <div className="space-y-6">
                {/* Strong Recommendations */}
                {results.papers.filter(p => p.relevance_score >= 8).length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      🔥 强烈推荐
                    </h2>
                    <div className="space-y-4">
                      {results.papers
                        .filter(p => p.relevance_score >= 8)
                        .map(paper => (
                          <PaperCard key={paper.id} paper={paper} />
                        ))
                      }
                    </div>
                  </div>
                )}
                
                {/* Related Papers */}
                {results.papers.filter(p => p.relevance_score < 8).length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      📚 相关研究
                    </h2>
                    <div className="space-y-4">
                      {results.papers
                        .filter(p => p.relevance_score < 8)
                        .map(paper => (
                          <PaperCard key={paper.id} paper={paper} />
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">未找到相关论文，请尝试其他关键词</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;