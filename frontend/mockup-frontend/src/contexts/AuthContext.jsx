import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching profile
          const userData = await api.getProfile();
          setUser({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
            profile_picture_url: userData.profile_picture_url,
            first_name: userData.first_name,
            last_name: userData.last_name,
          });
        } catch (err) {
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.login(email, password);
      
      // Store token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.id,
        username: response.username,
        role: response.role,
      }));

      // Set user in state
      setUser({
        id: response.id,
        username: response.username,
        role: response.role,
      });

      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.register(userData);
      
      // Auto-login after registration
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify({
          id: response.id,
          username: response.username,
          role: response.role,
        }));
        
        setUser({
          id: response.id,
          username: response.username,
          role: response.role,
        });
      }

      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const updateUser = async (updatedUserData) => {
    try {
      // Update user state
      setUser(prevUser => ({
        ...prevUser,
        ...updatedUserData
      }));
      
      // Update localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        localStorage.setItem('user', JSON.stringify({
          ...parsedUser,
          ...updatedUserData
        }));
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register,
      updateUser,
      isAuthenticated: !!user,
      loading,
      error,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};