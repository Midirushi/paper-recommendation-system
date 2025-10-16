import { ExternalLink, Calendar, Users, BookOpen, Star } from 'lucide-react';
import { format } from 'date-fns';

const PaperCard = ({ paper }) => {
  const renderRelevanceScore = () => {
    if (!paper.relevance_score) return null;
    
    const stars = Math.round(paper.relevance_score / 2);
    return (
      <div className="flex items-center gap-1 text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4"
            fill={i < stars ? 'currentColor' : 'none'}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {/* Relevance Score */}
      {renderRelevanceScore()}
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mt-3 mb-2">
        {paper.title}
      </h3>
      
      {/* Recommendation Reason */}
      {paper.recommendation_reason && (
        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-900">
            <strong>推荐理由：</strong>{paper.recommendation_reason}
          </p>
        </div>
      )}
      
      {/* Authors */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Users className="w-4 h-4" />
        <span>
          {paper.authors?.slice(0, 3).map(a => a.name).join(', ')}
          {paper.authors?.length > 3 && ' 等'}
        </span>
      </div>
      
      {/* Journal and Date */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        {paper.journal && (
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{paper.journal}</span>
          </div>
        )}
        {paper.publish_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(paper.publish_date)}</span>
          </div>
        )}
      </div>
      
      {/* Abstract */}
      {paper.abstract && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">
          {paper.abstract}
        </p>
      )}
      
      {/* Keywords */}
      {paper.keywords && paper.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {paper.keywords.slice(0, 5).map((keyword, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>引用数: {paper.citation_count || 0}</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {paper.source.toUpperCase()}
          </span>
        </div>
        
        {paper.source_url && (
          <a
            href={paper.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            查看详情
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};

export default PaperCard;