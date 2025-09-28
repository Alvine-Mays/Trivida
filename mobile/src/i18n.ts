type NS = 'common' | 'auth' | 'decision' | 'finance' | 'events';

type Dict = Record<NS, Record<string, { fr: string; en: string }>>;

const dict: Dict = {
  common: {
    loading: { fr: 'Chargement…', en: 'Loading…' },
    error: { fr: 'Erreur', en: 'Error' },
    save: { fr: 'Enregistrer', en: 'Save' },
  },
  auth: {
    email: { fr: 'Email', en: 'Email' },
    password: { fr: 'Mot de passe', en: 'Password' },
    login: { fr: 'Connexion', en: 'Login' },
    logout: { fr: 'Déconnexion', en: 'Logout' },
  },
  decision: {},
  finance: {},
  events: {},
};

let currentLocale: 'fr' | 'en' = (process.env.EXPO_PUBLIC_DEFAULT_LOCALE as any) || 'fr';

export function setLocale(l: 'fr' | 'en') { currentLocale = l; }
export function getLocale() { return currentLocale; }
export function t(ns: NS, key: string) {
  return dict[ns]?.[key]?.[currentLocale] || key;
}
