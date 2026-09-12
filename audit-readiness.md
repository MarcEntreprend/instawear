# Audit Frontstore — InstaWear_gem — Launch Readiness 12/09/2026 (CLOS)

### Volontairement abandonné (choix produit, ne plus tracker)

- **Tableau CNIL détaillé des cookies** (nom / finalité / durée / éditeur) — jugé non essentiel pour un user lambda. Le système actuel suffit : `useCookieConsent.ts` v2 (`necessary` + `nonEssential`, 365j, migration auto), bannière 2 boutons, gate analytics, lien `Gérer les cookies` (`Footer.tsx:471` → `resetConsent()`).

---
