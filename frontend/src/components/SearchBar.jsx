import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles } from 'lucide-react';

const SearchBar = ({ onSearch, loading }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const exampleQueries = [
    { text: '地理知识图谱', color: 'blue' },
    { text: '城市计算与GIS', color: 'purple' },
    { text: '遥感图像处理', color: 'green' },
    { text: '时空大数据分析', color: 'orange' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {/* Animated border glow */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur opacity-30"
              />
            )}
          </AnimatePresence>

          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="输入您想检索的论文主题，例如：地理知识图谱相关的论文"
              className="w-full px-6 py-5 pr-16 text-lg border-2 border-gray-300 rounded-full
                       focus:outline-none focus:border-blue-500 transition-all duration-300 relative z-10 bg-white
                       placeholder:text-gray-400"
              disabled={loading}
            />

            {/* Typing indicator */}
            <AnimatePresence>
              {query.length > 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute left-6 -top-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-medium">AI 将智能分析</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !query.trim()}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white
                       rounded-full hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-all z-10 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Search className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </motion.div>
      </form>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex flex-wrap gap-3 justify-center items-center"
      >
        <span className="text-sm font-medium text-white/90">试试：</span>
        {exampleQueries.map((example, idx) => {
          const colorClasses = {
            blue: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/30',
            purple: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 border-purple-400/30',
            green: 'bg-green-500/20 hover:bg-green-500/30 text-green-100 border-green-400/30',
            orange: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 border-orange-400/30',
          };

          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.1, type: 'spring' }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setQuery(example.text)}
              className={`px-4 py-2 text-sm font-medium rounded-full border backdrop-blur-sm
                       transition-all shadow-sm hover:shadow-md ${colorClasses[example.color]}`}
            >
              {example.text}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default SearchBar;