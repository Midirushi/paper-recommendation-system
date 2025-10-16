import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Search from './pages/Search';
import Trends from './pages/Trends';
import { Search as SearchIcon, TrendingUp, Home } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <Home className="w-6 h-6 text-blue-600" />
                  论文推荐系统
                </Link>
                
                <div className="flex space-x-4">
                  <Link
                    to="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 
                             hover:bg-gray-100 transition-colors"
                  >
                    <SearchIcon className="w-4 h-4" />
                    智能检索
                  </Link>
                  
                  <Link
                    to="/trends"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 
                             hover:bg-gray-100 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    研究前沿
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/trends" element={<Trends />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;