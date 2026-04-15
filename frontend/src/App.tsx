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

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <Routes>
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
      <Route path="/auth/callback" element={<SocialOAuthCallback />} />
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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
