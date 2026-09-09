## Le vrai problème

Dans `src/App.tsx`, le handler de retour Stripe fait ceci (extrait réel du fichier) :

```tsx
const handleReturn = async () => {
  if (orderStatus === "success") {
    try {
      // 1️⃣ Vider le panier dans Supabase en PRIORITÉ
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email) {
        const { data: customerData } = await supabase.from("customers")...
        if (customerData) {
          await customerApi.clearCart(customerData.id);
        }
      }
      // 2️⃣ Puis vider le panier local et afficher la confirmation
      setCart([]);
      setCartLoaded(false);
      setStripeConfirmOrderId(orderId);   // ← la confirmation ne s'affiche qu'ICI
      ...
```

Et dans `src/api/supabaseApi.ts` :

```ts
async clearCart(clientId: string): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("client_id", clientId);
  if (error) throw error;   // ← lève une exception en cas d'échec
},
```

**Le bug, exactement** : `setStripeConfirmOrderId(orderId)` (qui affiche l'écran de confirmation) est placé _après_ l'appel réseau qui vide le panier côté Supabase, dans le **même bloc `try`**. Si `clearCart` échoue pour n'importe quelle raison réseau/auth (et sur un rechargement complet de page juste après un retour externe de Stripe, la session du client Supabase n'est pas toujours encore réhydratée à ce moment précis — c'est exactement le genre de fenêtre où un appel authentifié peut échouer), l'exception est attrapée par le `catch` englobant, et le code **ne descend jamais jusqu'à `setStripeConfirmOrderId`**. Résultat : ni confirmation, ni panier vidé — exactement les deux symptômes que tu décris, ensemble, parce qu'ils dépendent tous les deux du même appel fragile.

**Preuve que ce diagnostic est le bon, pas une supposition** : regarde pourquoi le chemin carte fonctionne, lui. `handlePay` (paiement carte direct) fait `setStep(4)` en synchrone, dans la même instance de composant, sans jamais quitter la page. Il ne dépend d'aucun rechargement, d'aucune relecture d'URL, d'aucun appel réseau intermédiaire pour afficher sa confirmation. C'est structurellement impossible qu'il ait ce bug — et c'est exactement pour ça qu'il marche pendant que Stripe échoue.

## Le correctif — rend la confirmation inconditionnelle

Le principe : **plus jamais l'affichage de la confirmation ne doit dépendre de la réussite d'un appel réseau annexe.** Le vidage du panier serveur et la vérification du statut de commande deviennent des efforts "best effort" isolés chacun dans leur propre `try/catch`, complètement découplés de l'affichage.

---

**Frontend — remplacement complet du bloc dans le fichier existant `src/App.tsx`**

Cherche le bloc qui commence par le commentaire `// Stripe Checkout return handling (success / cancel)` et se termine par le `}, []);` qui suit immédiatement `handleReturn();` :

```tsx
// Stripe Checkout return handling (success / cancel)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const orderStatus = params.get("order");
  const orderId = params.get("id");

  if (!orderStatus || !orderId) return;

  const handleReturn = async () => {
    if (orderStatus === "success") {
      try {
        // 1️⃣ Vider le panier dans Supabase en PRIORITÉ
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (currentUser?.email) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("id")
            .eq("email", currentUser.email)
            .maybeSingle();
          if (customerData) {
            await customerApi.clearCart(customerData.id);
          }
        }

        // 2️⃣ Puis vider le panier local et afficher la confirmation
        setCart([]);
        setCartLoaded(false);
        setStripeConfirmOrderId(orderId);

        // Tentative de vérification (non bloquante)
        try {
          const order = await orderApi.get(orderId);
          if (order) {
            const successStatuses = [
              "paid",
              "pending",
              "in_production",
              "shipped",
              "delivered",
            ];
            if (!successStatuses.includes(order.status)) {
              showToast(
                "Payment not confirmed. Please contact support.",
                "error",
              );
            }
          }
        } catch (e) {
          console.warn("Order fetch failed for", orderId, e);
          showToast(
            "Your order has been placed. You can track it with the reference below.",
            "info",
          );
        }
      } catch (e) {
        console.error("Error verifying Stripe order", e);
        showToast("Error verifying payment.", "error");
      }
    } else if (orderStatus === "cancelled") {
      showToast("Payment cancelled. Your cart is saved.", "info");
    }

    // Clean URL parameters without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
  };

  handleReturn();
}, []);
```

Remplace-le entièrement par :

```tsx
// Stripe Checkout return handling (success / cancel)
//
// ⚠️ RÈGLE ABSOLUE : l'affichage de la confirmation et le vidage local
// du panier ne doivent JAMAIS dépendre de la réussite d'un appel réseau.
// C'est ce couplage qui causait le bug (clearCart pouvait lever une
// exception et bloquait tout ce qui suivait, y compris la confirmation).
// Chaque appel annexe est maintenant isolé dans son propre try/catch,
// en "best effort", après coup.
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const orderStatus = params.get("order");
  const orderId = params.get("id");

  if (!orderStatus || !orderId) return;

  const cleanUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
  };

  if (orderStatus === "cancelled") {
    showToast("Payment cancelled. Your cart is saved.", "info");
    cleanUrl();
    return;
  }

  if (orderStatus !== "success") {
    cleanUrl();
    return;
  }

  // 1️⃣ Garanti, synchrone, sans aucune dépendance réseau : la confirmation
  // s'affiche et le panier local se vide quoi qu'il arrive ensuite.
  setCart([]);
  setCartLoaded(false);
  setStripeConfirmOrderId(orderId);
  cleanUrl();

  // 2️⃣ Vidage du panier serveur — best effort, isolé. Un échec ici
  // (session pas encore réhydratée après le rechargement complet, réseau,
  // etc.) ne doit plus jamais pouvoir annuler le point 1.
  (async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser?.email) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id")
          .eq("email", currentUser.email)
          .maybeSingle();
        if (customerData) {
          await customerApi.clearCart(customerData.id);
        }
      }
    } catch (e) {
      console.error("Stripe return: échec du vidage du panier serveur", e);
    }
  })();

  // 3️⃣ Vérification du statut — best effort, isolée elle aussi.
  (async () => {
    try {
      const order = await orderApi.get(orderId);
      if (order) {
        const successStatuses = [
          "paid",
          "pending",
          "in_production",
          "shipped",
          "delivered",
        ];
        if (!successStatuses.includes(order.status)) {
          showToast("Payment not confirmed. Please contact support.", "error");
        }
      }
    } catch (e) {
      console.warn("Order fetch failed for", orderId, e);
      showToast(
        "Your order has been placed. You can track it with the reference below.",
        "info",
      );
    }
  })();
}, []);
```

## Pourquoi c'est garanti cette fois

`setStripeConfirmOrderId(orderId)` et `setCart([])` sont maintenant les **toutes premières instructions synchrones** exécutées dès que `order=success` et `id` sont détectés dans l'URL — avant même de tenter le moindre `await`. Aucune exception dans le vidage serveur ou la vérification de statut ne peut plus les empêcher de s'exécuter, parce qu'elles ne sont plus dans le même bloc `try`, et qu'elles s'exécutent _avant_, pas après. Que `clearCart` réussisse, échoue, ou mette du temps, l'utilisateur voit sa confirmation immédiatement.

## Une note séparée, pas liée à ce bug précis mais trouvée pendant l'audit

Dans l'Edge Function `stripe-checkout/index.ts`, la liste blanche anti-open-redirect n'autorise que `instawear.vercel.app`, `localhost` et `127.0.0.1` :

```ts
const okHosts = ["instawear.vercel.app", "localhost", "127.0.0.1"];
```

Si tu testes un jour ce flux depuis une URL de **preview Vercel** (type `instawear-git-retouches-2-xxx.vercel.app`), la création de session Stripe sera rejetée avec un 400 _avant même_ d'atteindre Stripe — pas le bug d'aujourd'hui (tu as bien atteint et payé sur Stripe, donc ce test-ci passait), mais à garder en tête si un futur test "ne fait rien du tout dès le clic sur Stripe Checkout".
