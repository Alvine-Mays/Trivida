# Walkthrough du code Mobile (FR)

App.tsx — Entrée application
- Initialise le thème, enregistre le handler de push/deeplink et le handler d’upsell (403)

src/navigation/RootNavigator.tsx
- Navigation stack + tabs, route CheckoutMobileMoney, navigationRef pour naviguer depuis handlers

src/ctx/Auth.tsx
- Contexte d’authentification (token), persistance AsyncStorage
- Enregistrement token Expo Push (si autorisé); fallback local des rappels si pas de token

src/push.ts
- registerForPushNotificationsAsync
- setupPushNavigation (navigue vers CheckoutMobileMoney si data.screen)
- ensureLocalTrialReminders (planification locale J-7/J-3/J-1 à 09:00 Africa/Brazzaville)

src/screens/CheckoutMobileMoney.tsx
- Sélection du réseau, durée 1/3/12 mois, affichage remises/total, téléphone, bouton Payer
- Appelle /billing/subscriptions/initiate puis ouvre paymentUrl

src/components/UpsellBanner.tsx
- Bandeau Premium avec CTA (ouvre CheckoutMobileMoney) + analytics

src/api.ts
- Appels fetch centralisés, interception 403 “Premium required” → déclenche upsell

src/upsell.ts
- Bus minimal pour gérer le handler premiumRequired

Autres écrans (exemples)
- DecisionScreen, FinanceScreen: usage du bandeau d’upsell, appels API (résumés, transactions, etc.)
