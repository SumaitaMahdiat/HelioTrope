import { useEffect, useState } from "react";
import type { FC } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_ORIGIN } from "../api";

const SocialOAuthCallback: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState("Finishing social connection...");
  const [error, setError] = useState("");

  // Validate prerequisites for OAuth callback
  const validationError =
    !loading && (!user || user.role !== "seller")
      ? "Please sign in as a seller before connecting social pages."
      : !searchParams.get("code") || !searchParams.get("state")
        ? "Missing OAuth code or state from the redirect."
        : !localStorage.getItem("token")
          ? "Missing session token. Please sign in again."
          : "";

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (loading) {
      return;
    }

    if (validationError) {
      return;
    }

    if (!code || !state) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    let active = true;

    // Complete OAuth flow by exchanging code for access token
    const finishConnection = async () => {
      try {
        const response = await axios.get(
          `${API_ORIGIN}/api/social/oauth/facebook/callback`,
          {
            params: { code, state },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!active) {
          return;
        }

        // Check if Instagram account was also connected
        const igUserId = response.data?.igUserId;
        setStatus(
          igUserId
            ? "Facebook page and Instagram account connected successfully."
            : "Facebook page connected successfully.",
        );

        // Redirect back to social tools after brief delay
        setTimeout(() => {
          if (active) {
            navigate("/seller/social");
          }
        }, 1200);
      } catch (connectError) {
        if (!active) {
          return;
        }

        if (axios.isAxiosError(connectError)) {
          setError(
            (connectError.response?.data as { error?: string } | undefined)
              ?.error || "Could not complete the social connection.",
          );
        } else {
          setError("Could not complete the social connection.");
        }
      }
    };

    void finishConnection();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      active = false;
    };
  }, [loading, navigate, searchParams, user, validationError]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass w-full max-w-lg rounded-3xl p-8 text-center shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-purple-600 font-semibold mb-3">
          Social Connect
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Connecting pages</h1>
        {/* Display error, validation error, or status message */}
        <p className="mt-3 text-gray-600">
          {validationError || error || status}
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate("/seller/social")}
            className="btn-primary px-5 py-3 text-sm"
          >
            Return to Social Tools
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialOAuthCallback;
