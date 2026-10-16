import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Normalise DB user row — backend now always returns both full_name and name aliases
  const normaliseUser = (u) => {
    if (!u) return null;
    return {
      ...u,
      name: u.name || u.full_name || '',
      full_name: u.full_name || u.name || '',
      targetRole: u.targetRole || u.target_role || 'Backend Developer',
      target_role: u.target_role || u.targetRole || 'Backend Developer',
      targetLevel: u.targetLevel || u.target_level || 'Intermediate',
      target_level: u.target_level || u.targetLevel || 'Intermediate',
      streakDays: u.streakDays || u.streak_days || 0,
      streak_days: u.streak_days || u.streakDays || 0,
      campus: u.campus || null
    };
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('interviewiq_token');
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            
            try {
              const campRes = await fetch(`${API_URL}/campus/me`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (campRes.ok) {
                const campData = await campRes.json();
                data.user.campus = campData.campus;
              }
            } catch (err) {
              console.error('Campus check failed', err);
            }

            setUser(normaliseUser(data.user));
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('interviewiq_token');
          }
        } catch (err) {
          console.error('Auth check failed', err);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password, expectedRole = null, collegeCode = null) => {
    try {
      const payload = { email, password, panel: expectedRole };
      if (collegeCode) payload.college_code = collegeCode;

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP Error ${res.status}`);
      }
      
      localStorage.setItem('interviewiq_token', data.token);
      
      try {
        const campRes = await fetch(`${API_URL}/campus/me`, {
          headers: { Authorization: `Bearer ${data.token}` }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          data.user.campus = campData.campus;
        }
      } catch (e) {}

      const normalizedUser = normaliseUser(data.user);
      
      // Perform strict UI role validation if expectedRole is provided
      if (expectedRole) {
         const actualRole = normalizedUser.campus?.role || 'STUDENT';
         let isAuthorized = false;
         
         if (expectedRole === 'student' && (!normalizedUser.campus?.role || actualRole === 'STUDENT')) isAuthorized = true;
         else if (expectedRole === 'teacher' && actualRole === 'TUTOR') isAuthorized = true;
         else if (expectedRole === 'hr' && actualRole === 'HR') isAuthorized = true;
         
         if (!isAuthorized) {
           localStorage.removeItem('interviewiq_token');
           let roleName = expectedRole === 'student' ? 'Student' : expectedRole === 'teacher' ? 'Teacher' : 'HR';
           return { success: false, error: `Access denied: Your account does not have ${roleName} privileges.` };
         }
      }

      setUser(normalizedUser);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err) {
      console.error(err);
      let errorMessage = err.message;
      if (err.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the server. Make sure the backend is running on port 3001.';
      }
      return { success: false, error: errorMessage };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP Error ${res.status}`);
      }

      localStorage.setItem('interviewiq_token', data.token);
      setUser(normaliseUser(data.user));
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err) {
      console.error(err);
      let errorMessage = err.message;
      if (err.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the server. Make sure the backend is running on port 3001.';
      }
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('interviewiq_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * Update user profile — persists changes to the database.
   * @param {object} updatedFields  Fields to update (name, target_role, target_level, etc.)
   * @param {boolean} [persist=true] Whether to also save to DB via API
   */
  const updateUserProfile = async (updatedFields, persist = true) => {
    // Optimistic local update
    setUser(prev => normaliseUser({ ...prev, ...updatedFields }));

    if (!persist) return { success: true };

    const token = localStorage.getItem('interviewiq_token');
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updatedFields.name || updatedFields.full_name,
          full_name: updatedFields.name || updatedFields.full_name,
          target_role: updatedFields.targetRole || updatedFields.target_role,
          target_level: updatedFields.targetLevel || updatedFields.target_level,
          current_password: updatedFields.current_password,
          new_password: updatedFields.new_password,
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Roll back optimistic update if server says no
        const rollback = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (rollback.ok) {
          const rd = await rollback.json();
          setUser(normaliseUser(rd.user));
        }
        return { success: false, error: data.error || 'Update failed' };
      }

      // Sync with server response
      setUser(normaliseUser(data.user));
      return { success: true };
    } catch (err) {
      console.error('[updateUserProfile]', err);
      return { success: false, error: err.message };
    }
  };

  const updateResumeData = (resumeData) => {
    setUser(prev => ({
      ...prev,
      resumeData
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#080c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading JobDM...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAuthModalOpen,
      setIsAuthModalOpen,
      login,
      signup,
      logout,
      updateUserProfile,
      updateResumeData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
