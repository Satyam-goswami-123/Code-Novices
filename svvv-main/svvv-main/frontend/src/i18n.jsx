import React, { createContext, useContext, useState } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu', flag: '🇮🇳' },
]

const T = {
  en: {
    // Brand
    brandName: 'Abhedya-Chakra AI',
    brandSub: 'Abhedya-Chakra',
    goodMorning: 'Good Morning',

    // Nav
    dashboard: 'Dashboard',
    chat: 'Chat (EN / ಕನ್ನಡ / हिंदी)',
    detective: 'Detective Engine',
    vision: 'Vision Evidence',
    hotspots: 'Hotspots',
    trends: 'Trends',
    network: 'Network',
    alerts: 'Predictive Alerts',
    patrolRoute: 'Patrol Route',
    whatif: 'What-If Simulator',
    patrol: 'Hands-free Patrol',
    audit: 'Audit Chain',

    // User card
    role: 'Role',
    station: 'Station',
    lastLogin: 'Last Login',
    provider: 'Provider',
    changePassword: 'Change Password',
    logout: 'Logout',

    // Password modal
    changePasswordTitle: 'Change Password',
    oldPassword: 'Old Password',
    newPassword: 'New Password',
    submit: 'Submit',
    cancel: 'Cancel',
    updating: 'Updating...',

    // Login
    officerLogin: 'Officer Login',
    authorizedOnly: 'Authorized Personnel Only',
    officerId: 'Officer ID',
    password: 'Password',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    signIn: 'Secure Sign In',
    signingIn: 'Authenticating...',
    invalidCreds: 'Invalid Officer ID or Password. Please try again.',
    demoAccounts: 'Demo Accounts (Click to auto-fill)',
    trustedBy: 'Trusted by Abhedya-Chakra Police',
    capsLock: 'Caps Lock is ON',

    // Features
    feat1: 'AI Investigation Assistant',
    feat2: 'Crime Hotspot Analytics',
    feat3: 'Criminal Network Mapping',
    feat4: 'Digital Case Files',

    // Stats
    stat1: '6000+',
    stat1Label: 'Synthetic FIR Records',
    stat2: '120',
    stat2Label: 'Police Stations',
    stat3: '15',
    stat3Label: 'Districts',

    // Language switcher
    selectLang: 'Language',
  },

  kn: {
    brandName: 'Abhedya-Chakra AI',
    brandSub: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಅಪರಾಧ ದಾಖಲೆ ಬ್ಯೂರೋ',
    goodMorning: 'ಶುಭೋದಯ',

    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    chat: 'ಚಾಟ್ (EN / ಕನ್ನಡ / हिंदी)',
    detective: 'AI ತನಿಖಾಧಿಕಾರಿ',
    vision: 'ದೃಷ್ಟಿ ಸಾಕ್ಷ್ಯ',
    hotspots: 'ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು',
    trends: 'ಪ್ರವೃತ್ತಿಗಳು',
    network: 'ನೆಟ್‌ವರ್ಕ್',
    alerts: 'ಮುನ್ಸೂಚನಾ ಎಚ್ಚರಿಕೆಗಳು',
    patrolRoute: 'ಗಸ್ತು ಮಾರ್ಗ',
    whatif: 'ಏನಾದರೆ ಸಿಮ್ಯುಲೇಟರ್',
    patrol: 'ಕೈಮುಕ್ತ ಗಸ್ತು',
    audit: 'ಆಡಿಟ್ ಚೈನ್',

    role: 'ಪಾತ್ರ',
    station: 'ಠಾಣೆ',
    lastLogin: 'ಕೊನೆಯ ಲಾಗಿನ್',
    provider: 'ಪೂರೈಕೆದಾರ',
    changePassword: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಿಸಿ',
    logout: 'ಲಾಗ್ ಔಟ್',

    changePasswordTitle: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಿಸಿ',
    oldPassword: 'ಹಳೆಯ ಪಾಸ್‌ವರ್ಡ್',
    newPassword: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
    submit: 'ಸಲ್ಲಿಸಿ',
    cancel: 'ರದ್ದು',
    updating: 'ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ...',

    officerLogin: 'ಅಧಿಕಾರಿ ಲಾಗಿನ್',
    authorizedOnly: 'ಅಧಿಕೃತ ಸಿಬ್ಬಂದಿ ಮಾತ್ರ',
    officerId: 'ಅಧಿಕಾರಿ ID',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    rememberMe: 'ನನ್ನನ್ನು ನೆನಪಿಸಿಕೊ',
    forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
    signIn: 'ಸುರಕ್ಷಿತ ಸೈನ್ ಇನ್',
    signingIn: 'ದೃಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
    invalidCreds: 'ತಪ್ಪಾದ ಅಧಿಕಾರಿ ID ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್.',
    demoAccounts: 'ಡೆಮೋ ಖಾತೆಗಳು (ಕ್ಲಿಕ್ ಮಾಡಿ)',
    trustedBy: 'ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ನಂಬಿಕೆ',
    capsLock: 'ಕ್ಯಾಪ್ಸ್ ಲಾಕ್ ಆನ್ ಆಗಿದೆ',

    feat1: 'AI ತನಿಖಾ ಸಹಾಯಕ',
    feat2: 'ಅಪರಾಧ ಹಾಟ್‌ಸ್ಪಾಟ್ ವಿಶ್ಲೇಷಣೆ',
    feat3: 'ಕ್ರಿಮಿನಲ್ ನೆಟ್‌ವರ್ಕ್ ಮ್ಯಾಪಿಂಗ್',
    feat4: 'ಡಿಜಿಟಲ್ ಕೇಸ್ ಫೈಲ್‌ಗಳು',

    stat1: '6000+',
    stat1Label: 'ಕೃತಕ FIR ದಾಖಲೆಗಳು',
    stat2: '120',
    stat2Label: 'ಪೊಲೀಸ್ ಠಾಣೆಗಳು',
    stat3: '15',
    stat3Label: 'ಜಿಲ್ಲೆಗಳು',

    selectLang: 'ಭಾಷೆ',
  },

  hi: {
    brandName: 'Abhedya-Chakra AI',
    brandSub: 'कर्नाटक राज्य अपराध अभिलेख ब्यूरो',
    goodMorning: 'सुप्रभात',

    dashboard: 'डैशबोर्ड',
    chat: 'चैट (EN / ಕನ್ನಡ / हिंदी)',
    detective: 'AI जासूस',
    vision: 'दृश्य साक्ष्य',
    hotspots: 'हॉटस्पॉट',
    trends: 'प्रवृत्तियाँ',
    network: 'नेटवर्क',
    alerts: 'पूर्वानुमान अलर्ट',
    patrolRoute: 'गश्त मार्ग',
    whatif: 'क्या-अगर सिम्युलेटर',
    patrol: 'हैंड्स-फ्री गश्त',
    audit: 'ऑडिट चेन',

    role: 'भूमिका',
    station: 'थाना',
    lastLogin: 'अंतिम लॉगिन',
    provider: 'प्रदाता',
    changePassword: 'पासवर्ड बदलें',
    logout: 'लॉग आउट',

    changePasswordTitle: 'पासवर्ड बदलें',
    oldPassword: 'पुराना पासवर्ड',
    newPassword: 'नया पासवर्ड',
    submit: 'जमा करें',
    cancel: 'रद्द करें',
    updating: 'अपडेट हो रहा है...',

    officerLogin: 'अधिकारी लॉगिन',
    authorizedOnly: 'केवल अधिकृत कर्मी',
    officerId: 'अधिकारी ID',
    password: 'पासवर्ड',
    rememberMe: 'मुझे याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signIn: 'सुरक्षित साइन इन',
    signingIn: 'प्रमाणित हो रहा है...',
    invalidCreds: 'अमान्य अधिकारी ID या पासवर्ड।',
    demoAccounts: 'डेमो खाते (क्लिक करें)',
    trustedBy: 'कर्नाटक पुलिस द्वारा विश्वसनीय',
    capsLock: 'Caps Lock चालू है',

    feat1: 'AI जाँच सहायक',
    feat2: 'अपराध हॉटस्पॉट विश्लेषण',
    feat3: 'आपराधिक नेटवर्क मैपिंग',
    feat4: 'डिजिटल केस फाइल',

    stat1: '6000+',
    stat1Label: 'FIR रिकॉर्ड',
    stat2: '120',
    stat2Label: 'पुलिस थाने',
    stat3: '15',
    stat3Label: 'जिले',

    selectLang: 'भाषा',
  },

  te: {
    brandName: 'Abhedya-Chakra AI',
    brandSub: 'కర్ణాటక రాష్ట్ర నేర రికార్డుల బ్యూరో',
    goodMorning: 'శుభోదయం',

    dashboard: 'డాష్‌బోర్డ్',
    chat: 'చాట్ (EN / ಕನ್ನಡ / हिंदी)',
    detective: 'AI డిటెక్టివ్',
    vision: 'దృశ్య ఆధారం',
    hotspots: 'హాట్‌స్పాట్‌లు',
    trends: 'ట్రెండ్‌లు',
    network: 'నెట్‌వర్క్',
    alerts: 'అంచనా హెచ్చరికలు',
    patrolRoute: 'పహారా మార్గం',
    whatif: 'వాట్-ఇఫ్ సిమ్యులేటర్',
    patrol: 'హ్యాండ్స్-ఫ్రీ పహారా',
    audit: 'ఆడిట్ చైన్',

    role: 'పాత్ర',
    station: 'పోలీసు స్టేషన్',
    lastLogin: 'చివరి లాగిన్',
    provider: 'ప్రొవైడర్',
    changePassword: 'పాస్‌వర్డ్ మార్చు',
    logout: 'లాగ్ అవుట్',

    changePasswordTitle: 'పాస్‌వర్డ్ మార్చు',
    oldPassword: 'పాత పాస్‌వర్డ్',
    newPassword: 'కొత్త పాస్‌వర్డ్',
    submit: 'సమర్పించు',
    cancel: 'రద్దు',
    updating: 'నవీకరిస్తోంది...',

    officerLogin: 'అధికారి లాగిన్',
    authorizedOnly: 'అధికృత సిబ్బంది మాత్రమే',
    officerId: 'అధికారి ID',
    password: 'పాస్‌వర్డ్',
    rememberMe: 'నన్ను గుర్తుంచుకో',
    forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
    signIn: 'సురక్షిత సైన్ ఇన్',
    signingIn: 'ధృవీకరిస్తోంది...',
    invalidCreds: 'తప్పు అధికారి ID లేదా పాస్‌వర్డ్.',
    demoAccounts: 'డెమో ఖాతాలు (క్లిక్ చేయండి)',
    trustedBy: 'కర్ణాటక పోలీసు నమ్మకం',
    capsLock: 'Caps Lock ఆన్ ఉంది',

    feat1: 'AI దర్యాప్తు సహాయకుడు',
    feat2: 'నేర హాట్‌స్పాట్ విశ్లేషణ',
    feat3: 'నేరస్థుల నెట్‌వర్క్ మ్యాపింగ్',
    feat4: 'డిజిటల్ కేసు ఫైళ్ళు',

    stat1: '6000+',
    stat1Label: 'FIR రికార్డులు',
    stat2: '120',
    stat2Label: 'పోలీసు స్టేషన్లు',
    stat3: '15',
    stat3Label: 'జిల్లాలు',

    selectLang: 'భాష',
  },
}

const LangContext = createContext({ lang: 'en', t: T.en, setLang: () => {} })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('abhedya_lang') || 'en')

  const setLang = (code) => {
    localStorage.setItem('abhedya_lang', code)
    setLangState(code)
  }

  return (
    <LangContext.Provider value={{ lang, t: T[lang] || T.en, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
