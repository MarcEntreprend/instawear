# fixes and improvements

## when no internet :

- when no item is load yet, search bar should show text like "t-shirt for birthday"
- change this to a more generic (exclsively when there's no internet) : <<Aucun article ne correspond à votre recherche -Modifiez vos filtres ou lancez une autre recherche !>>, like "Oups !
  Une erreur inattendue s'est produite lors de l'accès à la page. Veuillez réessayer plus tard ou, si vous préférez, retourner à la page d'accueil."
- make sure there's a fallback for images (other texts too ??)

## right side bar :

- make it close when clicked outside ?

## product card

- qd on ouvre le modal d un produit et qu'on ajoute dans le panier, le popup s affiche derriere... ce qui fait que l'on a pas de reponse visuel

## panier

- ppr eviter que le panier disparait si le user avait commencé lecheckout mais par exemple avait refresh la page, faire que quand le checkout est terminé, le panier cleared. sinon, persiste.
- qd on clique sur ajouter au panier (sur item) ou sur acheter maintenant (product card), parfois cela passe 2 items au lieu d'un, au right side bar. donc verifier que c est bien un item par clic.
- payment -> qd il manque un champ, faut que cela navigue vers le champ (et le mets en surbrillance?)
- qd on commence a remplir le champ, effacer e=le msg : L'email est requis pour la confirmation de commande
- qd on choisis stripe, et que cela prend du temps, donner une animation spin, ou un truc ...

## notification page :

- qd on selectionne x elements (certains lus, d autres non lus) : bulk actions : et btn lues et nonlues doivent etre actives

## orderpage :

- qd on utilise le 'Actions' pour changer le statut, faire que 'en production' ait la meme action que le btn du modal 'envoyer à printful'

## header :

- qd on clique sur le logo ou nom de instawear, faire que cela reellement refresh la page.
- barre de recherche : qd on clique sur un resultat -> rediriger vers

## footer :

- text and links
- - news letter :
    really ? thinking as a customer, it'd be interesting for bonuses and stuffs

## reactive :

for buttons (each kind : link button, 'pills', etc)
for items / products (like art macé logo)

## order :

- send the telegram msg, as an email

## order page :

- qd #"envoyer a printful" button > Envoyer cette commande à Printful (mode draft) ? > ok >Commande envoyée à Printful (statut mis à jour).#, faut que le refreshcw ait l animation. prévoir un 'point' dans le bouton de menu gauche

## new notif :

dans tab du navigateur , have a number, just like whatsapp, even make it ping

## product

- je veux qu'on standardise la disponibilité d'un produit (au lieu de reproduire les codes dans chaque fichier). on crée un fichier, on l appelle a chaque fois (comme pour l effet surbrillance)
  certes, le parametres de mettre en actif ou inactif repose dans productpage, et les effets et conditions sont visibles dans promotions et deals, frontstore, mais pas dans les autres pages admin

- scenario qd une commande n est pas passé a printiful mais que sur le site ça dit que c est passé

- interface pr le user de voir ses orders, etc
