import { createContext, useContext, useState, useEffect } from 'react';

const FontContext = createContext(null);

const FONT_OPTIONS = {
  syne: {
    name: 'Syne',
    family: "'Syne', sans-serif",
    mono: "'DM Mono', monospace",
    description: 'Modern & Bold (Default)'
  },
  inter: {
    name: 'Inter',
    family: "'Inter', sans-serif",
    mono: "'Fira Code', monospace",
    description: 'Clean & Professional'
  },
  poppins: {
    name: 'Poppins',
    family: "'Poppins', sans-serif",
    mono: "'Source Code Pro', monospace",
    description: 'Friendly & Geometric'
  },
  playfair: {
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    mono: "'IBM Plex Mono', monospace",
    description: 'Elegant & Serif'
  },
  outfit: {
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    mono: "'JetBrains Mono', monospace",
    description: 'Rounded & Modern'
  },
};

export function FontProvider({ children }) {
  const [currentFont, setCurrentFont] = useState(() => {
    return localStorage.getItem('selectedFont') || 'syne';
  });

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&family=Playfair+Display:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=Fira+Code:wght@400;500&family=Source+Code+Pro:wght@400;500&family=IBM+Plex+Mono:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap`;
    document.head.appendChild(link);
  }, []);

  // Update CSS variables when font changes
  useEffect(() => {
    const font = FONT_OPTIONS[currentFont];
    if (font) {
      document.documentElement.style.setProperty('--font', font.family);
      document.documentElement.style.setProperty('--mono', font.mono);
      // Force re-render by updating body as well
      document.body.style.fontFamily = font.family;
      localStorage.setItem('selectedFont', currentFont);
      console.log(`Font changed to: ${font.name} (${font.family})`);
    }
  }, [currentFont]);

  const changeFontFamily = (fontKey) => {
    if (FONT_OPTIONS[fontKey]) {
      setCurrentFont(fontKey);
    }
  };

  return (
    <FontContext.Provider value={{
      currentFont,
      changeFontFamily,
      fontOptions: FONT_OPTIONS,
      getCurrentFontInfo: () => FONT_OPTIONS[currentFont]
    }}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = () => useContext(FontContext);
