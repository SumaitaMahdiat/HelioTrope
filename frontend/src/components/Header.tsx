import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { LogOut, Sparkles, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Header = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="glass sticky top-0 z-50 shadow-lg backdrop-blur-xl"
      style={{ backdropFilter: "blur(20px)" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo and branding */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              HelioTrope
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Fashion Hub
            </p>
          </div>
        </Link>

        {/* User menu - shown when logged in */}
        {user && (
          <div className="flex items-center gap-4">
            {/* Fashion assistant link (buyers only) */}
            {user.role === "buyer" && (
              <>
                <Link
                  to="/marketplace"
                  className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                >
                  Marketplace
                </Link>
                <Link
                  to="/checkout"
                  className="relative btn-secondary flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Cart
                  {totalItems > 0 && (
                    <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <Link
                  to="/fashion-assistant"
                  className="btn-primary flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Fashion Assistant
                </Link>
              </>
            )}
            {/* User name and role badge */}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-5 h-5 text-gray-500" />
              <span>{user.name}</span>
              <span className="px-2 py-1 bg-linear-to-r from-purple-100 to-pink-100 text-xs rounded-full capitalize">
                {user.role}
              </span>
            </div>
            {/* Logout button */}
            <button
              onClick={logout}
              className="btn-secondary flex items-center gap-2 p-2 rounded-xl hover:bg-white/50 transition-all"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
