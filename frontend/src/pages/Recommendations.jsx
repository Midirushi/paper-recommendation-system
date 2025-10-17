import { useState, useEffect } from 'react';
import { recommendationsAPI, getUserId } from '../services/api';
import PaperCard from '../components/PaperCard';
import { Heart, Sparkles, RefreshCw, Loader2, TrendingUp } from 'lucide-react';

const Recommendations = () => {
  const [activeTab, setActiveTab] = useState('personalized'); // 'personalized' | 'trending'
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const userId = getUserId();

  useEffect(() => {
    loadRecommendations();
  }, [activeTab]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      let data;
      if (activeTab === 'personalized') {
        data = await recommendationsAPI.getPersonalized(userId, 15);
      } else {
        data = await recommendationsAPI.getTrending(15);
      }
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
      // If personalized fails, fall back to trending
      if (activeTab === 'personalized') {
        try {
          const trendingData = await recommendationsAPI.getTrending(15);
          setRecommendations(trendingData);
          setError('暂无个性化推荐，为您展示热门论文');
        } catch {
          setError('加载推荐失败');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    try {
      await recommendationsAPI.generateRecommendations(userId);
      // Wait a bit then reload
      setTimeout(() => {
        loadRecommendations();
        setGenerating(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
      setGenerating(false);
    }
  };

  const TabButton = ({ value, icon: Icon, label, count }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
        activeTab === value
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
      {count !== undefined && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          activeTab === value ? 'bg-white/20' : 'bg-gray-100'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50/30 to-blue-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                个性化推荐
              </h1>
              <p className="text-gray-600 mt-2">
                基于您的阅读历史和研究兴趣的智能推荐
              </p>
            </div>

            <button
              onClick={handleGenerateRecommendations}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              {generating ? '生成中...' : '刷新推荐'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <TabButton
            value="personalized"
            icon={Sparkles}
            label="为您推荐"
            count={activeTab === 'personalized' ? recommendations.length : undefined}
          />
          <TabButton
            value="trending"
            icon={TrendingUp}
            label="热门推荐"
            count={activeTab === 'trending' ? recommendations.length : undefined}
          />
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>用户ID:</strong> {userId.substring(0, 20)}...
            <span className="ml-4 text-blue-700">
              {activeTab === 'personalized'
                ? '基于您的浏览历史生成推荐'
                : '展示近期热门论文'}
            </span>
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <Heart className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-4 text-gray-600">正在加载推荐...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-6">
            {/* High Relevance */}
            {recommendations.filter(p => p.relevance_score >= 8).length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  强烈推荐
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {recommendations
                    .filter(p => p.relevance_score >= 8)
                    .map((paper) => (
                      <PaperCard key={paper.id} paper={paper} />
                    ))}
                </div>
              </div>
            )}

            {/* Medium Relevance */}
            {recommendations.filter(p => p.relevance_score < 8).length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  📚 其他推荐
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {recommendations
                    .filter(p => p.relevance_score < 8)
                    .map((paper) => (
                      <PaperCard key={paper.id} paper={paper} />
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无推荐</h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'personalized'
                ? '开始浏览论文，系统将为您生成个性化推荐'
                : '暂无热门论文'}
            </p>
            {activeTab === 'personalized' && (
              <button
                onClick={() => setActiveTab('trending')}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                查看热门推荐
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
