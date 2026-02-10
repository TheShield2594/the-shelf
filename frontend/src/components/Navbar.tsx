import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-shelf-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold tracking-tight">
              The Shelf
            </Link>
            <div className="hidden sm:flex space-x-4">
              <Link to="/" className="hover:text-shelf-200 transition">Browse</Link>
              {user && (
                <>
                  <Link to="/library" className="hover:text-shelf-200 transition">My Books</Link>
                  <Link to="/profile" className="hover:text-shelf-200 transition">Profile</Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-shelf-200 text-sm hidden sm:inline">Hi, {user.username}</span>
                <button
                  onClick={logout}
                  className="bg-shelf-600 hover:bg-shelf-500 px-3 py-1.5 rounded text-sm transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-shelf-600 hover:bg-shelf-500 px-3 py-1.5 rounded text-sm transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="sm:hidden border-t border-shelf-600 px-4 py-2 flex space-x-4">
        <Link to="/" className="text-sm hover:text-shelf-200">Browse</Link>
        {user && (
          <>
            <Link to="/library" className="text-sm hover:text-shelf-200">My Books</Link>
            <Link to="/profile" className="text-sm hover:text-shelf-200">Profile</Link>
          </>
        )}
      </div>
    </nav>
  );
}
