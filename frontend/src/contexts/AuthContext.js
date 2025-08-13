import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { veriffService } from '../services/api';

const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  veriffSession: null,
  verificationStatus: null,
  loading: false,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_VERIFF_SESSION':
      return { 
        ...state, 
        veriffSession: action.payload,
        loading: false,
        error: null 
      };
    
    case 'SET_VERIFICATION_STATUS':
      return { 
        ...state, 
        verificationStatus: action.payload,
        loading: false,
        error: null 
      };
    
    case 'SET_AUTHENTICATED':
      return { 
        ...state, 
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        error: null 
      };
    
    case 'SET_UNAUTHENTICATED':
      return { 
        ...state, 
        isAuthenticated: false,
        user: null,
        veriffSession: null,
        verificationStatus: null,
        loading: false,
        error: null 
      };
    
    case 'CLEAR_VERIFF_SESSION':
      return { 
        ...state, 
        veriffSession: null,
        verificationStatus: null 
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Genera URL di autenticazione Veriff
  const generateAuthUrl = async (authData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await veriffService.generateAuthUrl(authData);
      
      dispatch({ type: 'SET_VERIFF_SESSION', payload: response });
      
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Errore durante la generazione dell\'URL di autenticazione';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Test rapido autenticazione
  const quickAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await veriffService.quickAuth();
      
      dispatch({ type: 'SET_VERIFF_SESSION', payload: response });
      
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Errore durante il test rapido';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Recupera stato verifica
  const checkVerificationStatus = async (verificationId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await veriffService.getVerification(verificationId);
      
      dispatch({ type: 'SET_VERIFICATION_STATUS', payload: response });
      
      // Se la verifica è approvata, imposta l'utente come autenticato
      if (response.verification?.status === 'approved') {
        dispatch({ 
          type: 'SET_AUTHENTICATED', 
          payload: {
            id: response.verification.id,
            status: response.verification.status,
            verifiedAt: new Date().toISOString(),
            ...response.verification
          }
        });
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Errore durante il controllo dello stato';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Apri UI Veriff
  const openVeriffUI = (authUrl) => {
    if (authUrl) {
      window.open(authUrl, '_blank', 'width=800,height=600');
    }
  };

  // Logout
  const logout = () => {
    dispatch({ type: 'SET_UNAUTHENTICATED' });
  };

  // Pulisci sessione Veriff
  const clearVeriffSession = () => {
    dispatch({ type: 'CLEAR_VERIFF_SESSION' });
  };

  // Pulisci errori
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    generateAuthUrl,
    quickAuth,
    checkVerificationStatus,
    openVeriffUI,
    logout,
    clearVeriffSession,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
};
