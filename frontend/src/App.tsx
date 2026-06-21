// Main app routing and layout component
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Closet from "./pages/Closet";
import Home from "./pages/Home";
import SellerDashboard from "./pages/SellerDashboard";
import SellerSocial from "./pages/SellerSocial";
import SocialOAuthCallback from "./pages/SocialOAuthCallback";
import FashionAssistant from "./pages/FashionAssistant";
import Marketplace from "./pages/Marketplace";
import Checkout from "./pages/Checkout";

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Route-based access control - redirect based on user role
  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        {/* Home route - redirect based on role */}
        <Route
          path="/"
          element={
            user ? (
              user.role === "buyer" ? (
                <Navigate to="/closet" />
              ) : user.role === "seller" ? (
                <Navigate to="/seller" />
              ) : (
                <>
                  <Header />
                  <Home />
                </>
              )
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        {/* Sign up route - redirect if already authenticated */}
        <Route
          path="/signup"
          element={
            user ? (
              user.role === "buyer" ? (
                <Navigate to="/closet" />
              ) : user.role === "seller" ? (
                <Navigate to="/seller" />
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <SignUp />
            )
          }
        />
        {/* Sign in route - redirect if already authenticated */}
        <Route
          path="/signin"
          element={
            user ? (
              user.role === "buyer" ? (
                <Navigate to="/closet" />
              ) : user.role === "seller" ? (
                <Navigate to="/seller" />
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <SignIn />
            )
          }
        />
        {/* OAuth callback from social platforms */}
        <Route path="/auth/callback" element={<SocialOAuthCallback />} />
        {/* Buyer closet - view and manage wardrobe */}
        <Route
          path="/closet"
          element={
            user && user.role === "buyer" ? (
              <>
                <Header />
                <Closet />
              </>
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        {/* AI fashion assistant for buyers */}
        <Route
          path="/fashion-assistant"
          element={
            user && user.role === "buyer" ? (
              <>
                <Header />
                <FashionAssistant />
              </>
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        <Route
          path="/marketplace"
          element={
            user && user.role === "buyer" ? (
              <>
                <Header />
                <Marketplace />
              </>
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        {/* Checkout page - complete purchase */}
        <Route
          path="/checkout"
          element={
            user && user.role === "buyer" ? (
              <>
                <Header />
                <Checkout />
              </>
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        {/* Seller dashboard - inventory management */}
        <Route
          path="/seller"
          element={
            user && user.role === "seller" ? (
              <>
                <Header />
                <SellerDashboard />
              </>
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        {/* Seller social integration - import from Facebook/Instagram */}
        <Route
          path="/seller/social"
          element={
            user && user.role === "seller" ? (
              <>
                <Header />
                <SellerSocial />
              </>
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
