import { useState } from 'react';
import { ExternalLink, Calendar, Users, BookOpen, Star, Eye, Bookmark, Download, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { recommendationsAPI } from '../services/api';

const PaperCard = ({ paper }) => {
  const [expanded, setExpanded] = useState(false);
  const [similarPapers, setSimilarPapers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [interacted, setInteracted] = useState(false);

  const handleInteraction = async (action) => {
    try {
      await recommendationsAPI.recordInteraction(paper.id, action);
      setInteracted(true);

      // Show feedback
      const actionText = {
        view: '已记录浏览',
        save: '已保存',
        download: '已记录下载'
      };

      // You could add a toast notification here
      console.log(actionText[action]);
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
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-300">
      {/* Header with Score */}
      <div className="flex items-start justify-between mb-3">
        {renderRelevanceScore()}

        {/* Source Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            paper.source === 'scholar'
              ? 'bg-blue-100 text-blue-700'
              : paper.source === 'cnki'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {paper.source.toUpperCase()}
          </span>
          {paper.citation_count > 100 && (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              高被引
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight hover:text-blue-600 transition-colors">
        {paper.title}
      </h3>

      {/* Recommendation Reason */}
      {paper.recommendation_reason && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong className="text-blue-700">💡 推荐理由：</strong>
            {paper.recommendation_reason}
          </p>
        </div>
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
          <p className={`text-sm text-gray-700 leading-relaxed ${!expanded && 'line-clamp-2'}`}>
            {paper.abstract}
          </p>
          {paper.abstract.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
            >
              {expanded ? (
                <>收起 <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>展开 <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {paper.keywords.slice(0, 6).map((keyword, idx) => (
            <span
              key={idx}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {/* View Button */}
          <button
            onClick={() => handleInteraction('view')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="记录浏览"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">浏览</span>
          </button>

          {/* Save Button */}
          <button
            onClick={() => handleInteraction('save')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="保存论文"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">保存</span>
          </button>

          {/* Similar Papers Button */}
          <button
            onClick={loadSimilarPapers}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            disabled={loadingSimilar}
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {loadingSimilar ? '加载中...' : similarPapers.length > 0 ? '收起' : '相似'}
            </span>
          </button>
        </div>

        {/* External Link */}
        {paper.source_url && (
          <a
            href={paper.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleInteraction('view')}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看详情
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Interaction Feedback */}
      {interacted && (
        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
          <span>✓</span>
          <span>已记录，将用于改进推荐</span>
        </div>
      )}

      {/* Similar Papers */}
      {similarPapers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">相似论文：</h4>
          <div className="space-y-2">
            {similarPapers.map((similar) => (
              <div
                key={similar.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperCard;
