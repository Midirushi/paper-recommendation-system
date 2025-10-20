import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { trendsAPI } from '../services/api';
import { TrendingUp, Calendar, FileText, BarChart3, Sparkles, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
          />
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gray-600 text-lg"
          >
            加载中...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const chartColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-8 py-6">
          <motion.h1
            className="text-3xl font-bold text-gray-900 flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </motion.div>
            研究前沿动态
          </motion.h1>
          <p className="text-gray-600 mt-2">
            基于最新论文的AI分析报告
          </p>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Latest Trend Analysis */}
        {latestTrend && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.h2
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                className="text-2xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Sparkles className="w-6 h-6 text-yellow-500" />
                最新趋势分析
              </motion.h2>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <Calendar className="w-4 h-4" />
                <span>{latestTrend.analysis_date}</span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="prose max-w-none"
            >
              <p className="text-gray-700 whitespace-pre-wrap">
                {latestTrend.summary}
              </p>
            </motion.div>

            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              {[
                { value: latestTrend.paper_count, label: '分析论文数', color: 'blue', icon: FileText },
                { value: latestTrend.avg_citation.toFixed(1), label: '平均引用数', color: 'green', icon: Award },
                { value: latestTrend.keywords?.length || 0, label: '热点关键词', color: 'purple', icon: Sparkles },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, type: 'spring', stiffness: 200 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className={`p-4 bg-${stat.color}-50 rounded-lg cursor-pointer`}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 + idx }}
                    className={`text-3xl font-bold text-${stat.color}-600 flex items-center justify-center gap-2`}
                  >
                    <stat.icon className="w-6 h-6" />
                    {stat.value}
                  </motion.div>
                  <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
        
        {/* Hot Papers */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" />
            本周热门论文
          </h2>

          <div className="space-y-4">
            {hotPapers.map((paper, idx) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 + idx * 0.1, type: 'spring' }}
                        className={`text-2xl font-bold ${
                          idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-600' : 'text-gray-300'
                        }`}
                      >
                        #{idx + 1}
                      </motion.span>
                      {idx < 3 && (
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 1, delay: idx * 0.2, repeat: Infinity, repeatDelay: 3 }}
                        >
                          <Award className={`w-5 h-5 ${
                            idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-600'
                          }`} />
                        </motion.div>
                      )}
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
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + idx * 0.1 + i * 0.05 }}
                            whileHover={{ scale: 1.1 }}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs cursor-pointer"
                          >
                            {kw}
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.1, type: 'spring', stiffness: 200 }}
                    className="ml-4 text-right"
                  >
                    <div className="text-2xl font-bold text-blue-600">
                      {paper.citation_count}
                    </div>
                    <div className="text-xs text-gray-500">引用数</div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
        
        {/* Trending Keywords */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            热门关键词
          </h2>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
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
                <Bar dataKey="count">
                  {keywords.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <div className="mt-6 flex flex-wrap gap-3">
            {keywords.map((kw, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.5 + idx * 0.05, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50
                         border border-blue-200 rounded-full cursor-pointer"
              >
                <span className="font-semibold text-gray-900">{kw.keyword}</span>
                <span className="ml-2 text-sm text-gray-600">({kw.count})</span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Trends;