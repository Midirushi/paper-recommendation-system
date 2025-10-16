import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const SearchBar = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };
  
  const exampleQueries = [
    '地理知识图谱',
    '城市计算与GIS',
    '遥感图像处理',
    '时空大数据分析'
  ];
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入您想检索的论文主题，例如：地理知识图谱相关的论文"
            className="w-full px-6 py-4 pr-14 text-lg border-2 border-gray-300 rounded-full 
                     focus:outline-none focus:border-blue-500 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white 
                     rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                     transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-gray-600">试试：</span>
        {exampleQueries.map((example, idx) => (
          <button
            key={idx}
            onClick={() => setQuery(example)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full 
                     hover:bg-gray-200 transition-colors"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;