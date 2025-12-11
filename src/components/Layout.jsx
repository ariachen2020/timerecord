import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '首頁', icon: '🏠' },
    { path: '/add', label: '新增記錄', icon: '➕' },
    { path: '/query', label: '查詢員工', icon: '🔍' },
    { path: '/employees', label: '員工管理', icon: '👥' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                補休登錄系統
              </Link>
              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {user?.departmentName}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              登出
            </button>
          </div>
        </div>
      </nav>

      {/* 主要導航 (手機底部 / 桌面頂部) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 md:relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-around md:justify-start md:space-x-8 py-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl md:text-base">{item.icon}</span>
                <span className="text-xs md:text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <main className="pb-20 md:pb-8">
        {children}
      </main>
    </div>
  );
}
