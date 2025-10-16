import { useState, useEffect } from 'react';
import { trendsAPI } from '../services/api';
import { TrendingUp, Calendar, FileText, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Trends = () => {
  const [latestTrend, setLatestTrend] = useState(null);
  const [hotPapers, setHotPapers] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [trend, papers, kws] = await Promise.all([
        trendsAPI.getLatestTrends(),
        trendsAPI.getHotPapers(7, 10),
        trendsAPI.getTrendingKeywords(30, 15)
      ]);
      
      setLatestTrend(trend);
      setHotPapers(papers);
      setKeywords(kws);
    } catch (err) {
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            研究前沿动态
          </h1>
          <p className="text-gray-600 mt-2">
            基于最新论文的AI分析报告
          </p>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Latest Trend Analysis */}
        {latestTrend && (
          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                最新趋势分析
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{latestTrend.analysis_date}</span>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {latestTrend.summary}
              </p>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {latestTrend.paper_count}
                </div>
                <div className="text-sm text-gray-600 mt-1">分析论文数</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {latestTrend.avg_citation.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 mt-1">平均引用数</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {latestTrend.keywords?.length || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">热点关键词</div>
              </div>
            </div>
          </section>
        )}
        
        {/* Hot Papers */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            本周热门论文
          </h2>
          
          <div className="space-y-4">
            {hotPapers.map((paper, idx) => (
              <div
                key={paper.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-gray-400">
                        #{idx + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {paper.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>
                        {paper.authors?.slice(0, 2).map(a => a.name).join(', ')}
                      </span>
                      {paper.journal && <span>• {paper.journal}</span>}
                      {paper.publish_date && <span>• {paper.publish_date}</span>}
                    </div>
                    
                    {paper.keywords && paper.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {paper.keywords.slice(0, 4).map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {paper.citation_count}
                    </div>
                    <div className="text-xs text-gray-500">引用数</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Trending Keywords */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            热门关键词
          </h2>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={keywords}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="keyword" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-6 flex flex-wrap gap-3">
            {keywords.map((kw, idx) => (
              <div
                key={idx}
                className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 
                         border border-blue-200 rounded-full"
              >
                <span className="font-semibold text-gray-900">{kw.keyword}</span>
                <span className="ml-2 text-sm text-gray-600">({kw.count})</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Trends;