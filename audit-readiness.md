# TODO

## qd on fait login via google

- it says `Prosseguir para hkbybsycaylobvbnnwak.supabase.co` instead of `Prosseguir para https://instawear.vercel.app`. why ?

## from product a color -> catalogue

- la couleur persiste dans ce sens la : ne doit pas. mais ne pas changer ceci : la couleur doit persister dans le sens de 'aller vers la page produit selon filtre color (from catalogue , ou via qd on consulte un produit depuis accountpage/order tab)

---

# Audit Frontstore — InstaWear_gem — Launch Readiness 12/09/2026 (CLOS)

### Volontairement abandonné (choix produit, ne plus tracker)

- **Tableau CNIL détaillé des cookies** (nom / finalité / durée / éditeur) — jugé non essentiel pour un user lambda. Le système actuel suffit : `useCookieConsent.ts` v2 (`necessary` + `nonEssential`, 365j, migration auto), bannière 2 boutons, gate analytics, lien `Gérer les cookies` (`Footer.tsx:471` → `resetConsent()`).

---
