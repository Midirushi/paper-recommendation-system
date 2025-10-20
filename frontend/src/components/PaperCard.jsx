import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Calendar, Users, BookOpen, Star, Eye, Bookmark, Download, Link2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { recommendationsAPI } from '../services/api';

const PaperCard = ({ paper }) => {
  const [expanded, setExpanded] = useState(false);
  const [similarPapers, setSimilarPapers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleInteraction = async (action) => {
    try {
      await recommendationsAPI.recordInteraction(paper.id, action);
      setInteracted(true);

      // Show feedback with animation
      const actionText = {
        view: '已记录浏览',
        save: '已保存',
        download: '已记录下载'
      };

      setToastMessage(actionText[action]);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Failed to record interaction:', err);
    }
  };

  const loadSimilarPapers = async () => {
    if (similarPapers.length > 0) {
      setSimilarPapers([]);
      return;
    }

    setLoadingSimilar(true);
    try {
      const similar = await recommendationsAPI.getSimilarPapers(paper.id, 3);
      setSimilarPapers(similar);
    } catch (err) {
      console.error('Failed to load similar papers:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const renderRelevanceScore = () => {
    if (!paper.relevance_score) return null;

    const stars = Math.round(paper.relevance_score / 2);
    const scoreColor = paper.relevance_score >= 8 ? 'text-yellow-500' : 'text-gray-400';

    return (
      <div className={`flex items-center gap-1 ${scoreColor}`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4"
            fill={i < stars ? 'currentColor' : 'none'}
          />
        ))}
        <span className="ml-2 text-sm font-semibold text-gray-700">
          {paper.relevance_score.toFixed(1)}
        </span>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd');
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:border-blue-300 relative overflow-hidden"
    >
      {/* Animated background gradient on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Header with Score */}
        <div className="flex items-start justify-between mb-3">
          {renderRelevanceScore()}

        {/* Source Badge */}
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              paper.source === 'scholar'
                ? 'bg-blue-100 text-blue-700'
                : paper.source === 'cnki'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {paper.source.toUpperCase()}
          </motion.span>
          {paper.citation_count > 100 && (
            <motion.span
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              高被引
            </motion.span>
          )}
        </div>
      </div>

      {/* Title */}
      <motion.h3
        className="text-xl font-bold text-gray-900 mb-3 leading-tight hover:text-blue-600 transition-colors cursor-pointer"
        whileHover={{ x: 5 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {paper.title}
      </motion.h3>

      {/* Recommendation Reason */}
      {paper.recommendation_reason && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg"
        >
          <p className="text-sm text-blue-900">
            <strong className="text-blue-700">💡 推荐理由：</strong>
            {paper.recommendation_reason}
          </p>
        </motion.div>
      )}

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        {/* Authors */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {paper.authors?.slice(0, 3).map(a => a.name).join(', ')}
            {paper.authors?.length > 3 && ' 等'}
          </span>
        </div>

        {/* Journal and Date */}
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
          {paper.journal && (
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{paper.journal}</span>
            </div>
          )}
          {paper.publish_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(paper.publish_date)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-gray-700 font-medium">引用: {paper.citation_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Abstract - Expandable */}
      {paper.abstract && (
        <div className="mb-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={expanded ? 'expanded' : 'collapsed'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-sm text-gray-700 leading-relaxed ${!expanded && 'line-clamp-2'}`}
            >
              {paper.abstract}
            </motion.p>
          </AnimatePresence>
          {paper.abstract.length > 150 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
            >
              {expanded ? (
                <>收起 <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>展开 <ChevronDown className="w-4 h-4" /></>
              )}
            </motion.button>
          )}
        </div>
      )}

      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {paper.keywords.slice(0, 6).map((keyword, idx) => (
            <motion.span
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + idx * 0.05, type: 'spring' }}
              whileHover={{ scale: 1.1, backgroundColor: 'rgb(229 231 235)' }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {keyword}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {/* View Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleInteraction('view')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="记录浏览"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">浏览</span>
          </motion.button>

          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleInteraction('save')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="保存论文"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">保存</span>
          </motion.button>

          {/* Similar Papers Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadSimilarPapers}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            disabled={loadingSimilar}
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {loadingSimilar ? '加载中...' : similarPapers.length > 0 ? '收起' : '相似'}
            </span>
          </motion.button>
        </div>

        {/* External Link */}
        {paper.source_url && (
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={paper.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleInteraction('view')}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看详情
            <ExternalLink className="w-4 h-4" />
          </motion.a>
        )}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-2 p-2 bg-green-500 text-white text-xs rounded-lg flex items-center gap-2"
          >
            <span>✓</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Similar Papers */}
      <AnimatePresence>
        {similarPapers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <h4 className="text-sm font-semibold text-gray-700 mb-3">相似论文：</h4>
            <div className="space-y-2">
              {similarPapers.map((similar, idx) => (
                <motion.div
                  key={similar.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {similar.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{similar.authors?.slice(0, 2).map(a => a.name).join(', ')}</span>
                    {similar.publish_date && <span>• {formatDate(similar.publish_date)}</span>}
                    {similar.source_url && (
                      <a
                        href={similar.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        查看 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PaperCard;
