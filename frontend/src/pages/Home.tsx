// Landing page - shown after login
import React from "react";
import { useAuth } from "../context/AuthContext";

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen p-6 animate-slide-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {user?.name}!
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            You are logged in as a{" "}
            <span className="font-semibold capitalize text-purple-600">
              {user?.role}
            </span>
            .
          </p>

          {/* Under development notice */}
          <div className="glass p-8 rounded-3xl mb-8 max-w-2xl mx-auto">
            <p className="text-gray-700">
              This section is under development. Stay tuned for updates!
            </p>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <div className="glass p-6 rounded-3xl">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Getting Started
              </h3>
              <p className="text-gray-600 text-sm">
                Learn how to make the most of HelioTrope.
              </p>
            </div>
            <div className="glass p-6 rounded-3xl">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Community
              </h3>
              <p className="text-gray-600 text-sm">
                Connect with other fashion enthusiasts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
