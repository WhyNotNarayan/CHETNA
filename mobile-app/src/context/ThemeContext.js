import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const themes = {
  dark: {
    background: '#000000',
    card: '#111111',
    text: '#FFFFFF',
    subtext: '#888888',
    border: '#222222',
    primary: '#FFD700',
    secondary: '#4488FF',
    danger: '#FF4444',
    success: '#4CAF50',
    inputBg: '#000000',
    isDark: true
  },
  light: {
    background: '#F8F9FA',
    card: '#FFFFFF',
    text: '#1A1A1A',
    subtext: '#666666',
    border: '#EEEEEE',
    primary: '#E6C200',
    secondary: '#0055FF',
    danger: '#CC0000',
    success: '#2E7D32',
    inputBg: '#FFFFFF',
    isDark: false
  }
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('dark');

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('user_theme');
      if (savedTheme) setThemeMode(savedTheme);
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    await AsyncStorage.setItem('user_theme', newTheme);
  };

  const theme = themes[themeMode];

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
